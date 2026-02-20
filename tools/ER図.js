// ============================================================
//  Kintone ER図ジェネレーター v2.0（フル機能版）
//
//  使い方: kintoneアプリ画面 → F12 Console → 貼り付け → Enter
// ============================================================
(async () => {
  "use strict";

  const CONFIG = {
    startAppId: kintone.app.getId() || 74,
    maxFields: 120,
    sleepMs: 100,
  };

  // ─── Progress UI ───
  const ui = (() => {
    let el, bar, msg;
    return {
      init() {
        if (el) el.remove();
        el = document.createElement("div");
        Object.assign(el.style, {
          position: "fixed", top: "20px", right: "20px", width: "320px",
          padding: "16px", background: "rgba(10,10,18,0.94)", color: "#fff",
          borderRadius: "12px", zIndex: "999999", fontFamily: "sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        });
        el.innerHTML = `
          <div style="font-weight:700;margin-bottom:10px;font-size:14px;">📊 ER図を生成中...</div>
          <div style="background:#333;height:8px;border-radius:4px;overflow:hidden;">
            <div id="_eb" style="width:0%;height:100%;background:linear-gradient(90deg,#00d4ff,#7b61ff);transition:width .3s;border-radius:4px;"></div>
          </div>
          <div id="_em" style="font-size:12px;margin-top:8px;color:#aaa;">準備中...</div>`;
        document.body.appendChild(el);
        bar = el.querySelector("#_eb"); msg = el.querySelector("#_em");
      },
      update(p, t) { if(bar) bar.style.width=p+"%"; if(msg) msg.textContent=t; },
      close() { this.update(100,"完了！"); setTimeout(()=>{el.style.opacity="0";setTimeout(()=>el.remove(),600);},2e3); },
      error(e) { this.update(100,"Error: "+e); if(bar) bar.style.background="#f44"; },
    };
  })();

  // ─── Fetch schemas (BFS) ───
  const cache = new Map(), visited = new Set();
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const getSchema = async (appId) => {
    if (cache.has(appId)) return cache.get(appId);
    try {
      const [fR, aR] = await Promise.all([
        kintone.api("/k/v1/app/form/fields.json","GET",{app:appId}),
        kintone.api("/k/v1/app.json","GET",{id:appId}),
      ]);
      const fields=[], relations=[];
      const walk=(props,sub)=>{
        for(const [c,f] of Object.entries(props)){
          if(["GROUP","SPACER","HR","LABEL"].includes(f.type)) continue;
          if(f.type==="SUBTABLE"){ fields.push({code:c,label:f.label,type:"SUBTABLE",sub:true}); walk(f.fields,c); continue; }
          const isL=f.type==="LOOKUP", isR=f.type==="REFERENCE_TABLE";
          const isPK=/^(\$id|record_number|レコード番号)$/i.test(c);
          fields.push({code:c,label:f.label||c,type:f.type,required:!!f.required,isPK,isLookup:isL,isRef:isR,inSubtable:!!sub});
          if(isL&&f.lookup?.relatedApp?.app) relations.push({from:c,fromLabel:f.label,toApp:Number(f.lookup.relatedApp.app),toField:f.lookup.relatedKeyField,kind:"LOOKUP"});
          if(isR&&f.referenceTable?.relatedApp?.app) relations.push({from:c,fromLabel:f.label,toApp:Number(f.referenceTable.relatedApp.app),toField:f.referenceTable.condition?.field,kind:"REF"});
        }
      };
      walk(fR.properties,null);
      const r={id:appId,name:aR.name,spaceId:aR.spaceId||null,threadId:aR.threadId||null,fields:fields.slice(0,CONFIG.maxFields),relations,ok:true,createdAt:aR.createdAt,modifiedAt:aR.modifiedAt};
      cache.set(appId,r); return r;
    } catch(e){ console.error(`App ${appId}:`,e); const r={id:appId,name:`App ${appId} (Error)`,fields:[],relations:[],ok:false}; cache.set(appId,r); return r; }
  };

  const crawl = async (startId) => {
    const q=[startId], apps=[];
    while(q.length){
      const id=q.shift(); if(visited.has(id)) continue; visited.add(id);
      const a=await getSchema(id); apps.push(a);
      ui.update(Math.min(90,(apps.length/(apps.length+q.length))*100|0),`解析: ${a.name}`);
      for(const r of a.relations) if(!visited.has(r.toApp)&&!q.includes(r.toApp)) q.push(r.toApp);
      await sleep(CONFIG.sleepMs);
    }
    return apps;
  };

  // ─── Build full HTML ───
  const buildHTML = (apps) => {
    const data = JSON.stringify(apps);
    return /*html*/`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kintone ER Diagram v2</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"><\/script>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

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
  background:linear-gradient(180deg,var(--bg) 70%,transparent);
}
#topbar h1{font-size:14px;font-weight:700;margin-right:6px;white-space:nowrap;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.tb{padding:5px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer;transition:.15s;font-family:inherit;white-space:nowrap;}
.tb:hover{border-color:var(--accent);color:var(--accent);}
.tb.active{background:var(--accent);color:#000;border-color:var(--accent);font-weight:600;}
.sep{width:1px;height:20px;background:var(--border);margin:0 4px;}
#search-box{padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:11px;width:180px;font-family:inherit;outline:none;}
#search-box:focus{border-color:var(--accent);}
#search-box::placeholder{color:var(--dim);}
.spacer{flex:1;}

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
  <h1>⬡ Kintone ER Diagram</h1>
  <div class="sep"></div>
  <button class="tb" onclick="toggleSidebar()" title="Ctrl+B">📊 統計</button>
  <button class="tb" onclick="togglePathFinder()">🔍 経路探索</button>
  <div class="sep"></div>
  <button class="tb" onclick="setLayout('cose')">自動配置</button>
  <button class="tb" onclick="setLayout('grid')">Grid</button>
  <button class="tb" onclick="setLayout('circle')">Circle</button>
  <button class="tb" onclick="setLayout('breadthfirst')">Tree</button>
  <button class="tb" onclick="setLayout('concentric')">Concentric</button>
  <div class="sep"></div>
  <input id="search-box" placeholder="🔎 アプリ・フィールド検索 (Ctrl+F)" oninput="searchGraph(this.value)">
  <div class="spacer"></div>
  <button class="tb" onclick="toggleMinimap()">🗺</button>
  <button class="tb" id="theme-btn" onclick="toggleTheme()">🌙</button>
  <button class="tb" onclick="openCmd()" title="Ctrl+K">⌘K</button>
  <div class="sep"></div>
  <button class="tb" onclick="fit()">📐 Fit</button>
  <button class="tb" onclick="exportPNG()">PNG</button>
  <button class="tb" onclick="exportSVG()">SVG</button>
  <button class="tb" onclick="showMermaid()">Mermaid</button>
  <button class="tb" onclick="showDrawio()">draw.io</button>
  <button class="tb" onclick="showSQL()">SQL</button>
  <button class="tb" onclick="showPlantUML()">PlantUML</button>
  <button class="tb" onclick="showJSON()">JSON</button>
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
  <span><i style="background:var(--lookup)"></i>Lookup</span>
  <span><i style="background:var(--ref)"></i>Related</span>
  <span><i style="background:var(--req)"></i>Required</span>
  <span><i style="border:2px solid var(--lookup)"></i>Lookup線</span>
  <span><i style="border:2px dashed var(--ref)"></i>関連線</span>
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
const appMap = new Map(APPS.map(a=>[a.id,a]));

// ─── Toast ───
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2000);}

// ─── Theme ───
let isDark=true;
function toggleTheme(){
  isDark=!isDark;
  document.documentElement.setAttribute("data-theme",isDark?"":"light");
  document.getElementById("theme-btn").textContent=isDark?"🌙":"☀️";
  toast(isDark?"ダークモード":"ライトモード");
}

// ─── Cytoscape Init ───
const elements=[];
APPS.forEach(app=>{
  const fl=app.fields.map(f=>{
    let ic="";
    if(f.isPK) ic="🔑"; else if(f.isLookup) ic="🔗"; else if(f.isRef) ic="📋";
    else if(f.type==="SUBTABLE") ic="📦"; else if(f.required) ic="•"; else if(f.inSubtable) ic="↳";
    return ic+" "+(f.label||f.code);
  }).slice(0,18);
  if(app.fields.length>18) fl.push("... +"+(app.fields.length-18)+" more");
  elements.push({data:{id:"a"+app.id,label:app.name+"\\n(ID:"+app.id+")\\n─────────\\n"+fl.join("\\n"),appId:app.id,isError:!app.ok,fieldCount:app.fields.length,relCount:app.relations.length}});
});
let ei=0;
APPS.forEach(app=>{
  app.relations.forEach(r=>{
    if(appMap.has(r.toApp)){
      elements.push({data:{id:"e"+(ei++),source:"a"+app.id,target:"a"+r.toApp,kind:r.kind,label:r.kind==="LOOKUP"?"Lookup":"Related",fromLabel:r.fromLabel}});
    }
  });
});

const cy=cytoscape({
  container:document.getElementById("cy"),
  elements,
  style:[
    {selector:"node",style:{
      "shape":"round-rectangle","label":"data(label)","text-valign":"center","text-halign":"center",
      "text-wrap":"wrap","text-max-width":"240px","font-size":"9.5px",
      "font-family":"'DM Mono',monospace","color":"#d8dee9","text-outline-color":"#11131a","text-outline-width":"1px",
      "background-color":"#11131a","border-width":2,"border-color":"#262d3d","padding":"14px","width":"label","height":"label",
    }},
    {selector:"node[?isError]",style:{"border-color":"#f87171","background-color":"#1a0505"}},
    {selector:"node:selected",style:{"border-color":"var(--accent, #5eead4)","border-width":3}},
    {selector:"node.highlighted",style:{"border-color":"#fbbf24","border-width":3,"background-color":"#1a1805"}},
    {selector:"node.path-node",style:{"border-color":"#f472b6","border-width":4,"background-color":"#1a0a12"}},
    {selector:"node.dimmed",style:{"opacity":0.15}},
    {selector:'edge[kind="LOOKUP"]',style:{
      "width":2.5,"line-color":"#60a5fa","target-arrow-color":"#60a5fa","target-arrow-shape":"triangle",
      "source-arrow-shape":"circle","source-arrow-color":"#60a5fa","curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":"#60a5fa",
      "text-outline-color":"#08090d","text-outline-width":"2px",
      "text-background-color":"#08090d","text-background-opacity":0.7,"text-background-padding":"3px",
    }},
    {selector:'edge[kind="REF"]',style:{
      "width":2,"line-color":"#34d399","line-style":"dashed","target-arrow-color":"#34d399",
      "target-arrow-shape":"triangle","source-arrow-shape":"diamond","source-arrow-color":"#34d399","curve-style":"bezier",
      "label":"data(label)","font-size":"9px","color":"#34d399",
      "text-outline-color":"#08090d","text-outline-width":"2px",
      "text-background-color":"#08090d","text-background-opacity":0.7,"text-background-padding":"3px",
    }},
    {selector:"edge.path-edge",style:{"width":4,"line-color":"#f472b6","target-arrow-color":"#f472b6","source-arrow-color":"#f472b6","z-index":999}},
    {selector:"edge.dimmed",style:{"opacity":0.08}},
  ],
  layout:{name:"cose",animate:true,animationDuration:600,nodeRepulsion:800000,idealEdgeLength:260,gravity:0.25,numIter:1200,padding:80},
  minZoom:0.05,maxZoom:4,wheelSensitivity:0.25,
});

function fit(){cy.fit(undefined,60);}
cy.one("layoutstop",()=>setTimeout(fit,200));

// ─── Layout Switching ───
function setLayout(name){
  const opts={padding:60,animate:true,animationDuration:500};
  if(name==="cose") Object.assign(opts,{name:"cose",nodeRepulsion:800000,idealEdgeLength:260,gravity:0.25,numIter:1200});
  else if(name==="grid") Object.assign(opts,{name:"grid",rows:Math.ceil(Math.sqrt(APPS.length))});
  else if(name==="circle") Object.assign(opts,{name:"circle"});
  else if(name==="breadthfirst") Object.assign(opts,{name:"breadthfirst",directed:true,spacingFactor:1.5});
  else if(name==="concentric") Object.assign(opts,{name:"concentric",concentric:n=>n.connectedEdges().length,levelWidth:()=>2});
  cy.layout(opts).run();
  toast("レイアウト: "+name);
}

// ─── Search & Highlight ───
function searchGraph(q){
  cy.elements().removeClass("highlighted dimmed");
  if(!q.trim()) return;
  const low=q.toLowerCase();
  const matched=cy.nodes().filter(n=>{
    const app=appMap.get(n.data("appId"));
    if(!app) return false;
    if(app.name.toLowerCase().includes(low)) return true;
    return app.fields.some(f=>(f.label||"").toLowerCase().includes(low)||(f.code||"").toLowerCase().includes(low));
  });
  if(matched.length){
    matched.addClass("highlighted");
    cy.elements().not(matched).not(matched.connectedEdges()).addClass("dimmed");
  }
}

// ─── Click Detail ───
cy.on("tap","node",e=>{
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  const p=document.getElementById("detail");
  document.getElementById("detail-title").textContent=app.name;
  document.getElementById("detail-meta").innerHTML="ID: "+app.id
    +(app.createdAt?" | 作成: "+new Date(app.createdAt).toLocaleDateString():"")
    +(app.modifiedAt?" | 更新: "+new Date(app.modifiedAt).toLocaleDateString():"")
    +"<br>フィールド数: "+app.fields.length+" | リレーション: "+app.relations.length;

  // Relations
  let relHtml="";
  if(app.relations.length){
    relHtml='<div class="field-group-title">リレーション</div>';
    app.relations.forEach(r=>{
      const tgt=appMap.get(r.toApp);
      const tName=tgt?tgt.name:"App "+r.toApp;
      const icon=r.kind==="LOOKUP"?"🔗":"📋";
      relHtml+='<div class="field-row" style="cursor:pointer" onclick="focusApp('+r.toApp+')"><span class="field-icon">'+icon+'</span><span class="field-name">'+r.fromLabel+' → '+tName+'</span><span class="field-type">'+r.kind+'</span></div>';
    });
  }
  document.getElementById("detail-relations").innerHTML=relHtml;

  // Fields grouped
  const groups={pk:[],lookup:[],ref:[],required:[],subtable:[],normal:[]};
  app.fields.forEach(f=>{
    if(f.isPK) groups.pk.push(f);
    else if(f.isLookup) groups.lookup.push(f);
    else if(f.isRef) groups.ref.push(f);
    else if(f.type==="SUBTABLE") groups.subtable.push(f);
    else if(f.required) groups.required.push(f);
    else groups.normal.push(f);
  });

  let fHtml="";
  const renderGroup=(title,fields,tagClass,tagLabel)=>{
    if(!fields.length) return;
    fHtml+='<div class="field-group-title">'+title+" ("+fields.length+")</div>";
    fields.forEach(f=>{
      let icon="·";
      if(f.isPK) icon="🔑"; else if(f.isLookup) icon="🔗"; else if(f.isRef) icon="📋"; else if(f.type==="SUBTABLE") icon="📦"; else if(f.inSubtable) icon="↳";
      let tags="";
      if(tagLabel) tags='<span class="tag '+tagClass+'">'+tagLabel+"</span>";
      if(f.required&&tagLabel!=="必須") tags+='<span class="tag tag-req">必須</span>';
      if(f.inSubtable) tags+='<span class="tag tag-sub">Sub</span>';
      fHtml+='<div class="field-row"><span class="field-icon">'+icon+'</span><span class="field-name">'+(f.label||f.code)+tags+'</span><span class="field-type">'+f.type+"</span></div>";
    });
  };
  renderGroup("Primary Key",groups.pk,"tag-pk","PK");
  renderGroup("Lookup (FK)",groups.lookup,"tag-fk","FK");
  renderGroup("関連レコード",groups.ref,"tag-ref","REF");
  renderGroup("必須フィールド",groups.required,"tag-req","必須");
  renderGroup("サブテーブル",groups.subtable,"tag-sub","Table");
  renderGroup("その他フィールド",groups.normal,"","");
  document.getElementById("detail-fields").innerHTML=fHtml;

  p.classList.add("open");
});
cy.on("tap",e=>{if(e.target===cy){closeDetail();cy.elements().removeClass("highlighted dimmed path-node path-edge");}});

function closeDetail(){document.getElementById("detail").classList.remove("open");}

function focusApp(id){
  const n=cy.getElementById("a"+id);
  if(n.length){cy.animate({center:{eles:n},zoom:1.5},{ duration:400 });n.select();}
}

// ─── Sidebar ───
function toggleSidebar(){document.getElementById("sidebar").classList.toggle("open");}

// Build stats
(function buildSidebar(){
  const totalFields=APPS.reduce((s,a)=>s+a.fields.length,0);
  const totalRels=APPS.reduce((s,a)=>s+a.relations.length,0);
  const lookups=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="LOOKUP").length,0);
  const refs=totalRels-lookups;
  const typeCount={};
  APPS.forEach(a=>a.fields.forEach(f=>{typeCount[f.type]=(typeCount[f.type]||0)+1;}));

  let html='<div class="stat-row"><span>アプリ数</span><span class="stat-val">'+APPS.length+'</span></div>';
  html+='<div class="stat-row"><span>総フィールド数</span><span class="stat-val">'+totalFields+'</span></div>';
  html+='<div class="stat-row"><span>Lookup数</span><span class="stat-val">'+lookups+'</span></div>';
  html+='<div class="stat-row"><span>関連レコード数</span><span class="stat-val">'+refs+'</span></div>';
  html+='<div class="stat-row"><span>総リレーション</span><span class="stat-val">'+totalRels+'</span></div>';
  html+='<div class="stat-row"><span>エラーアプリ</span><span class="stat-val">'+APPS.filter(a=>!a.ok).length+'</span></div>';
  document.getElementById("stats-summary").innerHTML=html;

  // type filters
  let fHtml="";
  Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
    fHtml+='<span class="filter-chip" onclick="filterByType(this,\\''+t+'\\')" data-type="'+t+'">'+t+' ('+c+')</span>';
  });
  document.getElementById("type-filters").innerHTML=fHtml;

  // app list
  let aHtml="";
  APPS.forEach(a=>{
    aHtml+='<div class="app-list-item" onclick="focusApp('+a.id+')">'+a.name+' <span style="color:var(--dim);font-size:10px">('+a.fields.length+' fields)</span></div>';
  });
  document.getElementById("app-list").innerHTML=aHtml;
})();

function filterByType(el,type){
  el.classList.toggle("active");
  const active=[...document.querySelectorAll(".filter-chip.active")].map(e=>e.dataset.type);
  cy.elements().removeClass("highlighted dimmed");
  if(!active.length) return;
  const matched=cy.nodes().filter(n=>{
    const app=appMap.get(n.data("appId"));
    return app&&app.fields.some(f=>active.includes(f.type));
  });
  matched.addClass("highlighted");
  cy.elements().not(matched).not(matched.connectedEdges()).addClass("dimmed");
}

// ─── Path Finder ───
function togglePathFinder(){
  const pf=document.getElementById("pathfinder");
  pf.classList.toggle("open");
  if(pf.classList.contains("open")){
    const opts=APPS.map(a=>'<option value="a'+a.id+'">'+a.name+"</option>").join("");
    document.getElementById("pf-from").innerHTML=opts;
    document.getElementById("pf-to").innerHTML=opts;
  }
}

function findPath(){
  clearPath();
  const from=document.getElementById("pf-from").value;
  const to=document.getElementById("pf-to").value;
  if(from===to){toast("同じアプリです");return;}
  const dijkstra=cy.elements().dijkstra({root:"#"+from,directed:false});
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
    cy.edges().forEach(e=>{
      const sp=e.sourceEndpoint(),tp=e.targetEndpoint();
      ctx.strokeStyle=e.data("kind")==="LOOKUP"?"#60a5fa":"#34d399";
      ctx.lineWidth=0.5;ctx.beginPath();
      ctx.moveTo((sp.x-bb.x1)*s+ox,(sp.y-bb.y1)*s+oy);
      ctx.lineTo((tp.x-bb.x1)*s+ox,(tp.y-bb.y1)*s+oy);
      ctx.stroke();
    });
    cy.nodes().forEach(n=>{
      const p=n.position();
      ctx.fillStyle=n.hasClass("path-node")?"#f472b6":n.hasClass("highlighted")?"#fbbf24":"#5eead4";
      ctx.globalAlpha=n.hasClass("dimmed")?0.15:0.8;
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
  {label:"全体表示 (Fit)",icon:"📐",action:fit,keys:"Ctrl+0"},
  {label:"自動配置 (Cose)",icon:"🔄",action:()=>setLayout("cose")},
  {label:"Grid レイアウト",icon:"⊞",action:()=>setLayout("grid")},
  {label:"Circle レイアウト",icon:"◯",action:()=>setLayout("circle")},
  {label:"Tree レイアウト",icon:"🌳",action:()=>setLayout("breadthfirst")},
  {label:"Concentric レイアウト",icon:"◎",action:()=>setLayout("concentric")},
  {label:"統計パネル",icon:"📊",action:toggleSidebar,keys:"Ctrl+B"},
  {label:"経路探索",icon:"🔍",action:togglePathFinder},
  {label:"ミニマップ",icon:"🗺",action:toggleMinimap},
  {label:"テーマ切替",icon:"🌓",action:toggleTheme},
  {label:"PNG エクスポート",icon:"🖼",action:exportPNG},
  {label:"SVG エクスポート",icon:"📄",action:exportSVG},
  {label:"Mermaid エクスポート",icon:"🧜",action:showMermaid},
  {label:"draw.io エクスポート",icon:"📊",action:showDrawio},
  {label:"SQL DDL エクスポート",icon:"🗄",action:showSQL},
  {label:"PlantUML エクスポート",icon:"🌱",action:showPlantUML},
  {label:"JSON Schema エクスポート",icon:"{}",action:showJSON},
  {label:"ハイライト解除",icon:"✨",action:()=>{cy.elements().removeClass("highlighted dimmed path-node path-edge");document.getElementById("search-box").value="";}},
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
  if(e.key==="0"&&(e.ctrlKey||e.metaKey)){e.preventDefault();fit();}
  if(e.key==="Escape"){closeCmd();closeDetail();closeModal();}
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
  openModal("Mermaid ER Diagram",m,"kintone_erd.mmd");
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
    x+='<mxCell id="E'+(ec++)+'" value="'+(r.kind==="LOOKUP"?"Lookup":"Related")+'" style="'+st+'" edge="1" parent="1" source="A'+a.id+'" target="A'+r.toApp+'"><mxGeometry relative="1" as="geometry"/></mxCell>';
  }));
  x+="</root></mxGraphModel></diagram></mxfile>";
  openModal("draw.io XML",x,"kintone_erd.drawio");
}

function showSQL(){
  let sql="-- Kintone ER Diagram → SQL DDL\\n-- Generated: "+new Date().toISOString()+"\\n\\n";
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
    title:"Kintone ER Schema",
    generated:new Date().toISOString(),
    apps:APPS.map(a=>({
      id:a.id,name:a.name,
      fields:a.fields.map(f=>({code:f.code,label:f.label,type:f.type,required:f.required||false,isPrimaryKey:f.isPK||false,isLookup:f.isLookup||false,isRelatedRecord:f.isRef||false,inSubtable:f.inSubtable||false})),
      relations:a.relations.map(r=>({fromField:r.from,toApp:r.toApp,toField:r.toField,type:r.kind})),
    })),
  };
  openModal("JSON Schema",JSON.stringify(schema,null,2),"kintone_erd_schema.json");
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
  tipEl.innerHTML="<b>"+app.name+"</b> (ID:"+app.id+")<br>Fields: "+app.fields.length+" | Relations: "+app.relations.length;
  tipEl.style.display="block";
});
cy.on("mouseout","node",()=>{if(tipEl) tipEl.style.display="none";});
cy.on("mousemove",e=>{if(tipEl&&tipEl.style.display==="block"){tipEl.style.left=(e.originalEvent.clientX+14)+"px";tipEl.style.top=(e.originalEvent.clientY+14)+"px";}});
<\/script>
</body>
</html>`;
  };

  // ─── Run ───
  ui.init();
  try{
    const apps=await crawl(CONFIG.startAppId);
    ui.update(95,"HTML生成中...");
    const html=buildHTML(apps);
    const blob=new Blob([html],{type:"text/html"});
    window.open(URL.createObjectURL(blob),"_blank");
    ui.close();
  }catch(e){console.error(e);ui.error(e.message);alert("Error: "+e.message);}
})();