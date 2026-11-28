// ER図ビューアー: 出力（PNG・編集済みHTML・Mermaid・draw.io・PlantUML・SQL DDL・JSON・CSV・Markdown）と、編集状態の保存・復元・共有 URL。
// ─── Exports ───
const EXPORT_CLEARED_CLASSES=["focus-root","focus-neighbor","focus-edge","focus-dim","dimmed","highlighted","analysis-hit","analysis-dim","path-node","path-edge"];
// カード画像は非同期に読み込まれるため、一度描いて読み込みを始めさせてから完了を待つ
function waitForCardImages(){
  cy.png({full:true,scale:0.05});
  const sources=cy.nodes("[cardImage]").map(node=>node.data("cardImage"));
  return Promise.all(sources.map(src=>new Promise(done=>{
    const img=new Image();
    img.onload=img.onerror=()=>done();
    img.src=src;
  }))).then(()=>new Promise(done=>setTimeout(done,150)));
}
// 出力は表示倍率や配色によらず、明るい配色の詳細カードで描く。図は現在の表示範囲（画面に出ているアプリ）
async function withExportView(render){
  const wasDark=isDark,wasLow=semanticZoomActive;
  // 画面上の強調は操作中の目印なので、出力には残さない
  const emphasis=EXPORT_CLEARED_CLASSES.map(name=>[name,cy.elements("."+name)]);
  cy.elements().removeClass(EXPORT_CLEARED_CLASSES.join(" "));
  const selected=cy.elements(":selected");
  selected.unselect();
  cy.edges().removeClass("edge-hover");
  if(wasLow) applySemanticZoom(1,true);
  if(wasDark){isDark=false;applyTheme();applyCyTheme();}
  try{
    await waitForCardImages();
    return render();
  }finally{
    if(wasDark){isDark=true;applyTheme();applyCyTheme();}
    if(wasLow) applySemanticZoom(cy.zoom(),true);
    emphasis.forEach(([name,elements])=>elements.addClass(name));
    selected.select();
  }
}
function exportImageMeta(){
  const ids=ER_OPTIONS.startAppIds||[];
  const shown=ids.slice(0,5).join(", ")+(ids.length>5?" ほか"+(ids.length-5)+"件":"");
  return [
    "起点: "+(shown||"-"),
    (ER_OPTIONS.sourceLabel?ER_OPTIONS.sourceLabel+" / ":"")+(ER_OPTIONS.sourceGuestId?("ゲスト "+ER_OPTIONS.sourceGuestId):"通常空間")+" / "+(ER_OPTIONS.sourcePreview?"プレビュー":"本番"),
    "表示: "+scopeDescription(),
    "出力: "+new Date().toLocaleString("ja-JP")
  ].join("  |  ");
}
async function buildExportImage(maxSide=14000,options){
  const diagram=await withExportView(()=>{
    const box=cy.elements(":visible").boundingBox();
    // cy.png は画面の倍率も掛けるため、高解像度の画面でもキャンバスの上限を超えないように割り戻す
    return cy.png({bg:"#ffffff",full:true,scale:Math.min(2,maxSide/Math.max(box.w,box.h,1))/(window.devicePixelRatio||1)});
  });
  // 印刷の資料は見出しと凡例を別に書くため、図だけを返す
  if(options&&options.bare) return diagram;
  return new Promise(resolve=>{
    const img=new Image();
    img.onerror=()=>resolve(diagram);
    img.onload=()=>{
      try{
        // 図が大きいほど見出しも拡大し、縮小して見ても読める大きさを保つ
        const unit=Math.max(1,img.width/2000);
        const pad=48,headerH=214;
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(img.width+pad*unit*2,1600);
        canvas.height=img.height+(headerH+pad)*unit;
        const g=canvas.getContext("2d");
        const font='"Yu Gothic UI","Hiragino Sans","Noto Sans JP",Meiryo,sans-serif';
        g.fillStyle="#ffffff";g.fillRect(0,0,canvas.width,canvas.height);
        g.save();g.scale(unit,unit);
        g.fillStyle="#111827";g.font="700 40px "+font;g.fillText("kintone ER図",pad,72);
        g.fillStyle="#4b5563";g.font="26px "+font;g.fillText(exportImageMeta(),pad,116);
        let x=pad;
        [["ルックアップ","#2563eb",[]],["関連レコード","#047857",[14,10]],["アクション","#d97706",[4,8]]].forEach(([label,color,dash])=>{
          g.strokeStyle=color;g.lineWidth=5;g.setLineDash(dash);
          g.beginPath();g.moveTo(x,150);g.lineTo(x+64,150);g.stroke();
          g.setLineDash([]);
          g.fillStyle="#374151";g.font="24px "+font;g.fillText(label,x+76,158);
          x+=76+g.measureText(label).width+44;
        });
        x=pad;
        [["PK","レコード番号","#b45309"],["FK","ルックアップ項目","#2563eb"],["関連","関連レコード一覧","#047857"],["一意","重複禁止","#6366f1"],["必須","必須項目","#dc2626"]].forEach(([badge,label,color])=>{
          g.font="700 20px "+font;
          const badgeW=Math.max(56,g.measureText(badge).width+20);
          g.fillStyle=color;g.globalAlpha=0.14;g.beginPath();g.roundRect(x,172,badgeW,32,8);g.fill();g.globalAlpha=1;
          g.textAlign="center";g.fillText(badge,x+badgeW/2,196);g.textAlign="left";
          g.fillStyle="#374151";g.font="24px "+font;g.fillText(label,x+badgeW+10,197);
          x+=badgeW+10+g.measureText(label).width+40;
        });
        g.restore();
        g.drawImage(img,Math.round((canvas.width-img.width)/2),Math.round(headerH*unit));
        resolve(canvas.toDataURL("image/png"));
      }catch(err){
        console.error("[ER] 画像の合成に失敗",err);
        resolve(diagram);
      }
    };
    img.src=diagram;
  });
}
// 大きな図のデータ URL はリンクからダウンロードすると空になるため、Blob にして渡す
function dataUrlToBlob(data){
  const [head,body]=data.split(",");
  const bytes=atob(body);
  const buffer=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++) buffer[i]=bytes.charCodeAt(i);
  return new Blob([buffer],{type:head.slice(5).split(";")[0]});
}
async function exportPNG(){
  try{
    const a=document.createElement("a");
    const data=await buildExportImage();
    if(data.length<100) throw new Error("図が大きすぎて画像を作成できませんでした");
    const url=URL.createObjectURL(dataUrlToBlob(data));
    a.href=url;
    a.download=exportFilename("ER図","png");a.click();toast("PNG を保存しました（白背景・"+scopeDescription()+"）");
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(err){
    console.error("[ER] exportPNG failed", err);
    toast("PNG出力に失敗: "+((err&&err.message)||err));
  }
}
// ─── 編集済みHTMLの保存 / 復元 ───
function captureEditState(){
  const customApps=APPS.filter(a=>a.isCustom).map(a=>({
    id:a.id,name:a.name,
    fields:exportFieldsForApp(a).map(f=>Object.assign({},f)),
    totalFieldCount:a.totalFieldCount,
    requiredCount:a.requiredCount||0,
    lookupCount:a.lookupCount||0,
    refCount:a.refCount||0,
    depth:a.depth||0,
    ok:true,isCustom:true
  }));
  const customFields=[];
  APPS.filter(a=>!a.isCustom).forEach(a=>exportFieldsForApp(a).forEach(f=>{
    if(f.isCustom) customFields.push({appId:a.id,field:Object.assign({},f)});
  }));
  const customRelations=[];
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(r.isCustom) customRelations.push({fromAppId:a.id,rel:Object.assign({},r)});
  }));
  const positions={};
  cy.nodes().forEach(n=>{
    if(n.hasClass("note-node")) return;
    const p=n.position();
    positions[n.id()]={x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};
  });
  const notes=cy.nodes(".note-node").map(n=>{
    const p=n.position();
    return {id:n.id(),text:n.data("label"),color:n.data("noteColor"),x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};
  });
  snapshotScopePositions();
  const scopePositions={};
  scopePositionCache.forEach((value,key)=>{scopePositions[key]=value;});
  return {
    // 2: 表示範囲（scope・scopePositions）と線のまとめ（edgeBundling）を持つ。1 は以前の版（stateVersion なし）
    stateVersion:2,
    savedAt:new Date().toISOString(),
    options:{layoutName:ER_OPTIONS.layoutName,fieldDensity:ER_OPTIONS.fieldDensity},
    seq:{app:customAppSeq,rel:customRelSeq,field:customFieldSeq,note:noteSeq},
    appOverrides,fieldOverrides,relationOverrides,notes,
    customApps,customFields,customRelations,
    view:{
      positions,
      zoom:cy.zoom(),
      pan:cy.pan(),
      removedEdgeIds:[...manuallyRemovedEdgeIds],
      removedNodeIds:[...manuallyRemovedNodeIds],
      nodeHiddenEdgeIds:[...nodeHiddenEdgeIds],
      pinnedNodeIds:[...pinnedNodeIds],
      hiddenFieldKeys:[...hiddenFieldKeys],
      simpleMode,
      relationKinds:Object.assign({},relationKindState),
      relationLabels:relationLabelVisible,
      edgeBundling,
      focusMode,focusDepth,focusDirection,
      scope:{mode:viewScope.mode,roots:viewScope.roots.slice(),depth:viewScope.depth},
      scopePositions
    }
  };
}
function exportEditedHtml(){
  try{
    recomputeErAnalysis();
    const payload=captureEditState();
    const clone=document.documentElement.cloneNode(true);
    sanitizeEditedClone(clone);
    const oldState=clone.querySelector("#er-edit-state");
    if(oldState && oldState.parentNode) oldState.parentNode.removeChild(oldState);
    const liveRuntime=clone.querySelector("#er-runtime");
    if(liveRuntime && liveRuntime.parentNode) liveRuntime.parentNode.removeChild(liveRuntime);
    // 描画ライブラリは head のインライン script として複製に含まれるため、保存した HTML も単体で動く。
    // CSP はライブラリ・起動・図の本体の中身のハッシュで許可している。保存してもこれらの中身は変わらないので、CSP はそのまま使える。
    // 編集の状態は実行しない JSON（type="application/json"）として置く（スクリプトとしては動かず、CSP のハッシュも要らない）。
    const main=clone.querySelector("#er-main");
    if(!main){toast("保存に失敗: 本体スクリプトが見つかりません");return;}
    const stateScript=document.createElement("script");
    stateScript.id="er-edit-state";
    stateScript.setAttribute("type","application/json");
    const stateJson=JSON.stringify(payload)
      .replace(/</g,"\\u003c")
      .replace(/>/g,"\\u003e")
      .replace(/&/g,"\\u0026")
      .replace(/\u2028/g,"\\u2028")
      .replace(/\u2029/g,"\\u2029");
    stateScript.textContent=stateJson;
    main.parentNode.insertBefore(stateScript,main);
    const html="<!DOCTYPE html>\n"+clone.outerHTML;
    const blob=new Blob([html],{type:"text/html"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=exportFilename("ER図_編集済み","html");
    a.style.display="none";
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);if(a.parentNode)a.parentNode.removeChild(a);},30000);
    toast("編集済みHTMLを保存しました（開き直すと編集状態を復元）");
  }catch(err){
    console.error("[ER] exportEditedHtml failed",err);
    toast("編集済みHTMLの保存に失敗: "+((err&&err.message)||err));
  }
}
// 開いた画面の状態（開閉・描画済みの一覧や表）は保存しない。開き直したときに描き直す
function sanitizeEditedClone(clone){
  clone.removeAttribute("data-theme");
  const cyHost=clone.querySelector("#cy");
  if(cyHost) cyHost.innerHTML="";
  const tip=clone.querySelector("#er-tooltip");
  if(tip && tip.parentNode) tip.parentNode.removeChild(tip);
  ["#cmd-overlay","#modal-overlay","#editor-overlay","#help-overlay","#detail","#analysis-panel","#minimap","#sidebar","#pathfinder","#sidebar-backdrop","#legend"].forEach(sel=>{
    const el=clone.querySelector(sel);
    if(el) el.classList.remove("open","collapsed");
  });
  const overview=clone.querySelector("#overview");
  if(overview){ overview.classList.add("collapsed"); overview.classList.remove("hidden"); }
  ["#app-list","#stats-summary","#type-filters","#apps-table","#relations-table","#apps-checks","#relations-kinds","#scope-bar","#print-doc","#analysis-content","#detail-relations","#detail-fields","#detail-meta","#cmd-results","#editor-body","#modal-content"].forEach(sel=>{
    const el=clone.querySelector(sel);
    if(el) el.innerHTML="";
  });
  const topbar=clone.querySelector("#topbar");
  if(topbar) topbar.classList.remove("mobile-open");
  const toastEl=clone.querySelector("#toast");
  if(toastEl){ toastEl.classList.remove("show"); toastEl.textContent=""; }
  clone.querySelectorAll(".tb-menu.open").forEach(el=>el.classList.remove("open"));
  ["#view-apps","#view-relations"].forEach(sel=>{ const el=clone.querySelector(sel); if(el) el.setAttribute("hidden",""); });
  const diagram=clone.querySelector("#view-diagram");
  if(diagram){ diagram.removeAttribute("inert"); diagram.removeAttribute("aria-hidden"); }
  const search=clone.querySelector("#search-box");
  if(search) search.removeAttribute("value");
}
// 保存した表示の状態を戻す。以前の版（stateVersion なし）で保存したものも読む。戻した表示範囲を返す
function applySavedViewState(){
  if(!ER_EDIT_STATE || !ER_EDIT_STATE.view) return null;
  const view=ER_EDIT_STATE.view;
  const legacy=!(Number(ER_EDIT_STATE.stateVersion)>=2);
  let scope={mode:"all",roots:[],depth:1};
  try{
    (view.removedEdgeIds||[]).forEach(id=>{
      const e=cy.getElementById(id);
      if(e.length){manuallyRemovedEdgeIds.add(id);e.addClass("rel-manual-hidden");}
    });
    (view.removedNodeIds||[]).forEach(id=>{
      const n=cy.getElementById(id);
      if(n.length){manuallyRemovedNodeIds.add(id);n.addClass("app-manual-hidden");}
    });
    (view.nodeHiddenEdgeIds||[]).forEach(id=>{
      const e=cy.getElementById(id);
      if(e.length){nodeHiddenEdgeIds.add(id);e.addClass("rel-manual-hidden");}
    });
    (view.pinnedNodeIds||[]).forEach(id=>{
      const n=cy.getElementById(id);
      if(n.length) pinNode(n,true);
    });
    (view.hiddenFieldKeys||[]).forEach(key=>hiddenFieldKeys.add(String(key)));
    if((view.hiddenFieldKeys||[]).length) refreshNodeLabels();
    if(view.relationKinds){
      ["LOOKUP","REF","ACTION"].forEach(k=>{relationKindState[k]=view.relationKinds[k]!==false;});
    }
    // 以前の版は線のラベルを常に出すのが既定だったため、その値は使わず、選んだ線だけに出す今の既定にする
    if(!legacy&&typeof view.relationLabels==="boolean") relationLabelVisible=view.relationLabels;
    if(typeof view.edgeBundling==="boolean") edgeBundling=view.edgeBundling;
    if(typeof view.focusMode==="boolean") focusMode=view.focusMode;
    if(view.focusDepth){const sel=document.getElementById("focus-depth");if(sel)sel.value=String(view.focusDepth);}
    if(view.focusDirection){const sel=document.getElementById("focus-direction");if(sel)sel.value=view.focusDirection;}
    updateFocusOptions();
    syncFocusButton();
    syncRelationKindButtons();
    syncBundleButton();
    applyRelationFilter();
    applyRelationLabelVisibility();
    if(view.simpleMode) setSimpleMode(true);
    syncSimpleModeButton();
    if(view.scopePositions&&typeof view.scopePositions==="object"){
      Object.keys(view.scopePositions).forEach(key=>{ if(view.scopePositions[key]&&typeof view.scopePositions[key]==="object") scopePositionCache.set(key,view.scopePositions[key]); });
    }
    // 以前の版は全体の図だけを保存していたため、全体の表示で開く（保存した位置をそのまま使う）
    if(!legacy&&view.scope) scope=view.scope;
  }catch(err){console.error("[ER] 表示状態の復元に失敗",err);}
  return scope;
}

let _md={text:"",filename:""};
let modalReturnFocus=null;
function openModal(t,text,fn){
  _md={text,filename:fn};
  document.getElementById("modal-title").textContent=t;
  document.getElementById("modal-content").textContent=text;
  const overlay=document.getElementById("modal-overlay");
  if(!overlay.classList.contains("open")) modalReturnFocus=rememberDialogFocus();
  overlay.classList.add("open");
  const primary=document.querySelector("#modal .actions .primary");
  if(primary) primary.focus();
}
function closeModal(){
  const overlay=document.getElementById("modal-overlay");
  const wasOpen=overlay.classList.contains("open");
  overlay.classList.remove("open");
  if(wasOpen){ const back=modalReturnFocus; modalReturnFocus=null; restoreDialogFocus(back); }
}
function copyModal(){
  const failed=()=>toast("コピーに失敗しました。内容を選択して手動でコピーしてください");
  try{ navigator.clipboard.writeText(_md.text).then(()=>toast("コピーしました！"),failed); }
  catch(_){ failed(); }
}
function downloadModal(){const b=new Blob([_md.text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=_md.filename;a.click();toast("ダウンロード: "+_md.filename);}

const entityAlias=app=>"app_"+String(app&&app.id||"unknown").replace(/[^0-9A-Za-z_]/g,"_");
const exportFieldsForApp=app=>allFieldsForApp(app);
const oneLineLabel=value=>String(value==null?"":value).replace(/[\r\n]+/g," ").replace(/"/g,"'");
const sqlIdentifier=value=>String.fromCharCode(96)+String(value==null?"":value).replace(/`/g,"``")+String.fromCharCode(96);
const sqlString=value=>"'"+String(value==null?"":value).replace(/\\/g,"\\\\").replace(/'/g,"''")+"'";
// Mermaid の項目名は ASCII のみ確実に解釈される（v10 系は日本語で構文エラー）。実コードは注釈へ残す。
const mermaidLabel=value=>oneLineLabel(value).replace(/%%+/g,"%");
const mermaidAttributeName=(code,used)=>{
  const base=/^[A-Za-z_][A-Za-z0-9_]*$/.test(code)?code:"field_"+(used.size+1);
  let name=base;
  for(let suffix=2;used.has(name);suffix++) name=base+"_"+suffix;
  used.add(name);
  return name;
};
const exportStatusLabel=app=>app.status==="partial"?"一部取得":((app.status==="failed"||app.ok===false)?"取得失敗":"取得完了");
const exportIssueText=app=>(app.issues||[]).map(issue=>oneLineLabel(issue.message||issue.code||"取得上の注意")).filter(Boolean).join(" / ");
const exportRelationLabel=rel=>{
  const base=oneLineLabel(rel.fromDisplay||rel.fromLabel||rel.from||rel.kind);
  if(rel.kind==="REF"&&(rel.sourceJoinField||rel.from||rel.toField)) return base+" [結合: "+oneLineLabel(rel.sourceJoinField||rel.from||"?")+" → "+oneLineLabel(rel.toField||"?")+"]";
  return base;
};
function exportProvenanceEntries(){
  return [
    ["生成日時",new Date().toLocaleString("ja-JP")],
    ...(ER_OPTIONS.sourceLabel?[["取得元",ER_OPTIONS.sourceLabel]]:[]),
    ["起点アプリ",(ER_OPTIONS.startAppIds||[]).join(", ")||"-"],
    ["探索深さ",ER_OPTIONS.maxDepth?String(ER_OPTIONS.maxDepth):"無制限"],
    ["逆引き探索",ER_OPTIONS.includeReverseLookup?"ON":"OFF"],
    ...(ER_OPTIONS.reverseScanNote?[["逆引き走査の注意",ER_OPTIONS.reverseScanNote]]:[]),
    ["サブテーブル",ER_OPTIONS.includeSubtableFields!==false?"ON":"OFF"],
    ["項目範囲","取得済み全項目（図の表示密度とは独立）"],
    ["接続",(ER_OPTIONS.sourceGuestId?("ゲスト "+ER_OPTIONS.sourceGuestId):"通常空間")+"/"+(ER_OPTIONS.sourcePreview?"プレビュー":"本番")],
    ["取得状態","完了 "+ER_ANALYSIS.counts.retrievalComplete+" / 一部 "+ER_ANALYSIS.counts.retrievalPartial+" / 失敗 "+ER_ANALYSIS.counts.retrievalFailed],
    ["未取得の参照先",String((ER_ANALYSIS.unresolvedTargets||[]).length)],
    ["手動編集",(hiddenFieldKeys.size||manuallyRemovedEdgeIds.size||manuallyRemovedNodeIds.size||APPS.some(a=>a.isCustom))?"あり":"なし"]
  ];
}
function exportFilename(base,ext){
  const ids=ER_OPTIONS.startAppIds||[];
  const d=new Date(),p=n=>String(n).padStart(2,"0");
  const stamp=d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+"_"+p(d.getHours())+p(d.getMinutes());
  return [
    base,
    ids.length?("app"+ids[0]+(ids.length>1?"ほか"+(ids.length-1)+"件":"")):"",
    ER_OPTIONS.sourceGuestId?("guest"+ER_OPTIONS.sourceGuestId):"",
    ER_OPTIONS.sourcePreview?"プレビュー":"本番",
    stamp
  ].filter(Boolean).join("_")+"."+ext;
}
const exportProvenanceLines=prefix=>exportProvenanceEntries().map(([key,value])=>(prefix?prefix+" ":"")+key+": "+oneLineLabel(value));

// ER_MD_MERMAID_MAX_CHARS is injected by buildHTML
function buildMermaidText(){
  let m=exportProvenanceLines("%%").join("\n")+"\nerDiagram\n";
  APPS.forEach(a=>{
    const n=entityAlias(a);
    m+="  %% "+n+": "+mermaidLabel(a.name)+" (App "+a.id+")\n";
    m+="  %% 取得状態: "+exportStatusLabel(a)+(exportIssueText(a)?" / "+exportIssueText(a):"")+"\n";
    const subtableFieldCount=exportFieldsForApp(a).filter(f=>f.inSubtable).length;
    if(subtableFieldCount) m+="  %% サブテーブル内 "+subtableFieldCount+"項目は親エンティティへ平坦化せず省略（ERモデルJSONに所属表を収録）\n";
    const visibleName=(exportStatusLabel(a)==="取得完了"?"":("["+exportStatusLabel(a)+"] "))+mermaidLabel(a.name)+" (App "+a.id+")";
    m+="  "+n+'["'+visibleName+'"] {\n';
    const usedAttributes=new Set();
    exportFieldsForApp(a).forEach(f=>{
      if(f.type==="SUBTABLE"||f.inSubtable) return;
      let com=""; if(f.isPK) com=" PK"; else if(f.isLookup) com=" FK";
      const code=String(f.code==null?"":f.code);
      const note=mermaidLabel(f.label&&f.label!==code?f.label+" ["+code+"]":code);
      m+="    "+f.type.replace(/[^a-zA-Z0-9_]/g,"")+" "+mermaidAttributeName(code,usedAttributes)+com+' "'+note+'"\n';
    });
    m+="  }\n";
  });
  const mermaidExternalIds=new Set();
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(appMap.has(r.toApp)||mermaidExternalIds.has(String(r.toApp))) return;
    mermaidExternalIds.add(String(r.toApp));
    const alias=entityAlias({id:r.toApp});
    m+="  %% "+alias+": 未取得の参照先 (App "+oneLineLabel(r.toApp)+")\n";
    m+="  "+alias+'["未取得の参照先 (App '+oneLineLabel(r.toApp)+')"] {\n    string unresolved "未取得のアプリ"\n  }\n';
  }));
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp)||{id:r.toApp};
      const label=mermaidLabel(exportRelationLabel(r));
      if(r.kind==="ACTION") m+="  %% ACTION "+entityAlias(a)+" -> "+entityAlias(t)+": "+label+"\n";
      else m+="  "+entityAlias(a)+(r.kind==="LOOKUP"?" }o--o| ":" }o--o{ ")+entityAlias(t)+' : "'+label+'"\n';
    });
  });
  return m;
}
function showMermaid(){
  openModal("Mermaid ER図",buildMermaidText(),exportFilename("ER図","mmd"));
}

function showDrawio(){
  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const nodeId=id=>"A"+String(id==null?"unknown":id).replace(/[^0-9A-Za-z_]/g,"_");
  const drawioProvenance=exportProvenanceLines("").join(" | ").replace(/--/g,"—");
  let x='<'+'!-- '+esc(drawioProvenance)+' --><mxfile host="app.diagrams.net"><diagram name="ER"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>';
  const externalIds=[];
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(!appMap.has(r.toApp)&&!externalIds.some(id=>String(id)===String(r.toApp))) externalIds.push(r.toApp);
  }));
  const drawioApps=APPS.map(a=>({app:a,external:false})).concat(externalIds.map(id=>({app:{id,name:"未取得の参照先 (App "+id+")",relations:[],allFields:[],fields:[],status:"failed",ok:false,issues:[{message:"図の探索範囲外または取得権限外"}]},external:true})));
  const colCount=3,boxWidth=330,rowGap=96,colGap=100;
  let rowY=0;
  for(let rowStart=0;rowStart<drawioApps.length;rowStart+=colCount){
    const row=drawioApps.slice(rowStart,rowStart+colCount);
    const heights=row.map(item=>Math.max(58,34+exportFieldsForApp(item.app).filter(f=>f.type!=="SUBTABLE").length*28));
    const rowHeight=Math.max(...heights,58);
    row.forEach((item,colIndex)=>{
      const a=item.app;
      const exportFields=exportFieldsForApp(a).filter(f=>f.type!=="SUBTABLE");
      const nid=nodeId(a.id),px=colIndex*(boxWidth+colGap),h=heights[colIndex];
      const status=exportStatusLabel(a);
      const issue=exportIssueText(a);
      const header=(status==="取得完了"?"":("["+status+"] "))+(a.name||("App "+a.id))+(issue?("&#xa;"+issue):"");
      const fill=item.external?"#F3F4F6":(status==="取得失敗"?"#FEE2E2":(status==="一部取得"?"#FEF3C7":"#EDE9FE"));
      x+='<mxCell id="'+nid+'" value="'+esc(header).replace(/&amp;#xa;/g,"&#xa;")+'" style="shape=table;startSize=34;container=1;childLayout=tableLayout;fillColor='+fill+';rounded=1;'+(item.external?'dashed=1;':'')+'" vertex="1" parent="1"><mxGeometry x="'+px+'" y="'+rowY+'" width="'+boxWidth+'" height="'+h+'" as="geometry"/></mxCell>';
      exportFields.forEach((f,fi)=>{
        let c="#FFF";if(f.isPK)c="#FFD700";else if(f.isLookup)c="#DBEAFE";else if(f.isRef)c="#D1FAE5";else if(f.inSubtable)c="#F3F4F6";else if(f.required)c="#FFE4E6";
        const tablePrefix=f.inSubtable?("["+String(f.tableLabel||f.tableCode||"サブテーブル")+"] "):"";
        const label=(f.isPK?"PK ":f.isLookup?"FK ":f.isRef?"関連 ":"")+tablePrefix+(f.label||f.code)+" ["+f.code+"]";
        const rid=nid+"_R"+fi;
        x+='<mxCell id="'+rid+'" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;" vertex="1" parent="'+nid+'"><mxGeometry y="'+(34+fi*28)+'" width="'+boxWidth+'" height="28" as="geometry"/></mxCell>';
        x+='<mxCell id="'+nid+"_F"+fi+'" value="'+esc(label)+'" style="shape=partialRectangle;fillColor='+c+';align=left;spacingLeft=6;strokeColor=#d0d0d0;" vertex="1" parent="'+rid+'"><mxGeometry width="'+boxWidth+'" height="28" as="geometry"/></mxCell>';
      });
    });
    rowY+=rowHeight+rowGap;
  }
  let ec=0;
  APPS.forEach(a=>a.relations.forEach(r=>{
    const st=r.kind==="LOOKUP"?"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=oval;strokeColor=#0066CC;strokeWidth=2;":(r.kind==="REF"?"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;startArrow=diamond;dashed=1;strokeColor=#2E8B57;strokeWidth=2;":"edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;dashed=1;strokeColor=#D97706;strokeWidth=2;");
    const label=(r.kind==="LOOKUP"?"ルックアップ":(r.kind==="REF"?"関連レコード":"アクション"))+": "+exportRelationLabel(r);
    x+='<mxCell id="E'+(ec++)+'" value="'+esc(label)+'" style="'+st+'" edge="1" parent="1" source="'+nodeId(a.id)+'" target="'+nodeId(r.toApp)+'"><mxGeometry relative="1" as="geometry"/></mxCell>';
  }));
  x+="</root></mxGraphModel></diagram></mxfile>";
  openModal("draw.io 用XML",x,exportFilename("ER図","drawio"));
}

function showSQL(){
  let sql="-- kintone ER図 → SQL DDL（MySQL 形式）\n-- kintone の構造を表す参考資料です。そのままデータ移行に使うものではありません。\n"+exportProvenanceLines("--").join("\n")+"\n\n";
  const typeMap={SINGLE_LINE_TEXT:"VARCHAR(256)",MULTI_LINE_TEXT:"TEXT",NUMBER:"DECIMAL(18,4)",CALC:"DECIMAL(18,4)",
    RICH_TEXT:"TEXT",CHECK_BOX:"TEXT",RADIO_BUTTON:"VARCHAR(128)",DROP_DOWN:"VARCHAR(128)",MULTI_SELECT:"TEXT",
    DATE:"DATE",TIME:"TIME",DATETIME:"DATETIME",LINK:"VARCHAR(512)",FILE:"TEXT",
    USER_SELECT:"TEXT",ORGANIZATION_SELECT:"TEXT",GROUP_SELECT:"TEXT",
    RECORD_NUMBER:"INT AUTO_INCREMENT",CREATOR:"VARCHAR(128)",MODIFIER:"VARCHAR(128)",
    CREATED_TIME:"DATETIME",UPDATED_TIME:"DATETIME",STATUS:"VARCHAR(64)",
    STATUS_ASSIGNEE:"TEXT",CATEGORY:"TEXT",LOOKUP:"VARCHAR(256)",REFERENCE_TABLE:"-- ref"};

  const sqlTableInfo=new Map();
  APPS.forEach(a=>{
    const tbl=entityAlias(a);
    sql+="-- "+oneLineLabel(a.name)+" (App "+a.id+")\n";
    sql+="-- 取得状態: "+exportStatusLabel(a)+(exportIssueText(a)?" / "+exportIssueText(a):"")+"\n";
    const cols=[];
    const columnByCode=new Map();
    const usedColumnNames=new Set();
    let omittedSubtableFields=0;
    exportFieldsForApp(a).forEach(f=>{
      if(f.inSubtable){omittedSubtableFields++;return;}
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE") return;
      const baseCol=oneLineLabel(f.code)||"unnamed";
      let col=baseCol;
      let suffix=2;
      while(usedColumnNames.has(col)) col=baseCol+"_"+(suffix++);
      usedColumnNames.add(col);
      const dt=typeMap[f.type]||"TEXT";
      columnByCode.set(String(f.code||""),{col,dt:dt.replace(" AUTO_INCREMENT",""),keyed:!!(f.isPK||f.unique)});
      if(dt.startsWith("--")) return;
      let line="  "+sqlIdentifier(col)+" "+dt;
      if(f.isPK) line+=" PRIMARY KEY";
      else{
        if(f.required) line+=" NOT NULL";
        if(f.unique) line+=" UNIQUE";
      }
      if(f.label&&f.label!==f.code) line+=" COMMENT "+sqlString(oneLineLabel(f.label));
      cols.push(line);
    });
    sqlTableInfo.set(String(a.id),{table:tbl,columnByCode,emitted:cols.length>0});
    if(omittedSubtableFields) sql+="-- サブテーブル内の項目 "+omittedSubtableFields+"件は親テーブルへ平坦化せず省略しました。ERモデルJSONで所属表を確認してください。\n";
    if(!cols.length){
      sql+="-- SQLへ変換できる取得済みフィールドがないため CREATE TABLE を省略しました。\n\n";
      return;
    }
    sql+="CREATE TABLE "+sqlIdentifier(tbl)+" (\n"+cols.join(",\n")+"\n) COMMENT="+sqlString(oneLineLabel(a.name))+";\n\n";
  });

  // Foreign keys
  let fkSeq=0;
  APPS.forEach(a=>{
    a.relations.filter(r=>r.kind==="LOOKUP"&&appMap.has(r.toApp)).forEach(r=>{
      const t=appMap.get(r.toApp);
      const sourceInfo=sqlTableInfo.get(String(a.id));
      const targetInfo=sqlTableInfo.get(String(t.id));
      const source=sourceInfo&&sourceInfo.columnByCode.get(String(r.from||""));
      const target=targetInfo&&targetInfo.columnByCode.get(String(r.toField||""));
      const label=oneLineLabel(a.name)+" / "+exportRelationLabel(r)+" → "+oneLineLabel(t.name);
      if(exportFieldsForApp(a).some(f=>f.inSubtable&&String(f.code)===String(r.from))){
        sql+="-- テーブル内のルックアップは、テーブルを親へ平坦化しないため外部キーにしていません: "+label+"\n";
        return;
      }
      if(!sourceInfo?.emitted||!targetInfo?.emitted||!source||!target){
        sql+="-- Lookupの結合フィールドをSQLへ変換できません: "+label+"\n";
        return;
      }
      if(!target.keyed||source.dt!==target.dt){
        sql+="-- 参照先が重複禁止でない、または型が異なるため外部キーにしていません: "+label+"\n";
        return;
      }
      sql+="ALTER TABLE "+sqlIdentifier(sourceInfo.table)+" ADD CONSTRAINT "+sqlIdentifier("fk_"+entityAlias(a)+"_"+(++fkSeq))+" FOREIGN KEY ("+sqlIdentifier(source.col)+") REFERENCES "+sqlIdentifier(targetInfo.table)+"("+sqlIdentifier(target.col)+");\n";
    });
  });
  APPS.forEach(a=>(a.relations||[]).filter(r=>r.kind==="REF").forEach(r=>{
    sql+="-- 関連レコード（参照表示）: "+oneLineLabel(a.name)+" / "+exportRelationLabel(r)+" / App "+oneLineLabel(r.toApp)+"\n";
  }));
  APPS.forEach(a=>(a.relations||[]).filter(r=>r.kind==="ACTION").forEach(r=>{
    sql+="-- アプリアクション（画面遷移）: "+oneLineLabel(a.name)+" / "+exportRelationLabel(r)+" / App "+oneLineLabel(r.toApp)+"\n";
  }));
  APPS.forEach(a=>(a.relations||[]).filter(r=>!appMap.has(r.toApp)).forEach(r=>{
    sql+="-- 未取得の参照先: "+oneLineLabel(a.name)+" / "+exportRelationLabel(r)+" / App "+oneLineLabel(r.toApp)+"\n";
  }));
  openModal("SQL DDL",sql,exportFilename("ER図","sql"));
}

function showPlantUML(){
  let p="@startuml\n"+exportProvenanceLines("'").join("\n")+"\n!theme cerulean\nskinparam linetype ortho\n\n";
  APPS.forEach(a=>{
    const n=entityAlias(a);
    p+="' 取得状態: "+exportStatusLabel(a)+(exportIssueText(a)?" / "+exportIssueText(a):"")+"\n";
    const visibleName=(exportStatusLabel(a)==="取得完了"?"":("["+exportStatusLabel(a)+"] "))+oneLineLabel(a.name);
    p+='entity "'+visibleName+' (App '+a.id+')" as '+n+' {\n';
    const subtableFieldCount=exportFieldsForApp(a).filter(f=>f.inSubtable).length;
    if(subtableFieldCount) p+="' サブテーブル内 "+subtableFieldCount+"項目は親エンティティへ平坦化せず省略（ERモデルJSONに所属表を収録）\n";
    exportFieldsForApp(a).forEach(f=>{
      if(f.type==="SUBTABLE"||f.type==="REFERENCE_TABLE"||f.inSubtable) return;
      let prefix="  ";
      if(f.isPK) prefix="  * ";
      else if(f.isLookup) prefix="  # ";
      const code=oneLineLabel(f.code);
      p+=prefix+code+" : "+(f.label&&f.label!==f.code?oneLineLabel(f.label)+" ":"")+"("+fieldTypeJpLabel(f.type)+")"+(f.required?" <<required>>":"")+"\n";
      if(f.isPK) p+="  --\n";
    });
    p+="}\n\n";
  });
  const plantExternalIds=new Set();
  APPS.forEach(a=>(a.relations||[]).forEach(r=>{
    if(appMap.has(r.toApp)||plantExternalIds.has(String(r.toApp))) return;
    plantExternalIds.add(String(r.toApp));
    p+='entity "未取得の参照先 (App '+oneLineLabel(r.toApp)+')" as '+entityAlias({id:r.toApp})+' <<external>>\n';
  }));
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp)||{id:r.toApp};
      const label=exportRelationLabel(r);
      if(r.kind==="LOOKUP") p+=entityAlias(a)+' }o--o| '+entityAlias(t)+' : "'+label+'"\n';
      else if(r.kind==="REF") p+=entityAlias(a)+' }o--o{ '+entityAlias(t)+' : "'+label+'"\n';
      else p+=entityAlias(a)+' ..> '+entityAlias(t)+' : "ACTION: '+label+'"\n';
    });
  });
  p+="@enduml";
  openModal("PlantUML",p,exportFilename("ER図","puml"));
}

function recomputeErAnalysis(){
  const activeApps=APPS.filter(a=>a&&a.id!=null&&!manuallyRemovedNodeIds.has("a"+a.id));
  const activeIds=new Set(activeApps.map(a=>String(a.id)));
  const unresolvedTargets=[],selfReferences=[];
  const incoming=new Map(),outgoing=new Map();
  activeApps.forEach(a=>{
    const fromId=String(a.id);
    (a.relations||[]).forEach((r,ri)=>{
      const edgeId="e_"+a.id+"_"+ri;
      if(manuallyRemovedEdgeIds.has(edgeId)||nodeHiddenEdgeIds.has(edgeId)) return;
      const toId=String(r.toApp??"");
      const kind=String(r.kind||"UNKNOWN");
      const field=String(r.fromPath||r.from||r.fromLabel||r.controlField||r.sourceJoinField||"");
      outgoing.set(fromId,(outgoing.get(fromId)||0)+1);
      if(!toId||!activeIds.has(toId)){
        unresolvedTargets.push({fromAppId:fromId,fromAppName:String(a.name||("アプリ "+fromId)),toAppId:toId,kind,field,reason:toId?"outside-diagram":"missing-target"});
      }else{
        incoming.set(toId,(incoming.get(toId)||0)+1);
        if(fromId===toId) selfReferences.push({appId:fromId,appName:String(a.name||("アプリ "+fromId)),kind,field});
      }
    });
  });
  const isolatedAppIds=activeApps.filter(a=>!(incoming.get(String(a.id))||0)&&!(outgoing.get(String(a.id))||0)).map(a=>String(a.id));
  const complete=activeApps.filter(a=>(a.status||"complete")==="complete"&&a.ok!==false&&!(Array.isArray(a.issues)&&a.issues.length)).length;
  const failed=activeApps.filter(a=>a.status==="failed"||a.ok===false).length;
  const partial=Math.max(0,activeApps.length-complete-failed);
  ER_ANALYSIS.isolatedAppIds=isolatedAppIds;
  ER_ANALYSIS.unresolvedTargets=unresolvedTargets;
  ER_ANALYSIS.selfReferences=selfReferences;
  ER_ANALYSIS.counts.retrievalComplete=complete;
  ER_ANALYSIS.counts.retrievalPartial=partial;
  ER_ANALYSIS.counts.retrievalFailed=failed;
  return ER_ANALYSIS;
}

function showJSON(){
  recomputeErAnalysis();
  const schema={
    kind:"kintone-er-model",
    schemaVersion:1,
    title:"kintone ERモデル",
    generated:new Date().toISOString(),
    options:{startAppIds:ER_OPTIONS.startAppIds||[],maxDepth:ER_OPTIONS.maxDepth||0,includeSubtableFields:ER_OPTIONS.includeSubtableFields!==false},
    completeness:{complete:ER_ANALYSIS.counts.retrievalComplete,partial:ER_ANALYSIS.counts.retrievalPartial,failed:ER_ANALYSIS.counts.retrievalFailed,unresolvedTargets:ER_ANALYSIS.unresolvedTargets||[]},
    apps:APPS.map(a=>({
      id:a.id,name:a.name,
      status:a.status|| (a.ok===false?"failed":"complete"),issues:a.issues||[],
      fields:exportFieldsForApp(a).map(f=>({code:f.code,label:f.label,type:f.type,path:f.path||f.code||"",required:f.required||false,unique:f.unique||false,isPrimaryKey:f.isPK||false,isLookup:f.isLookup||false,isRelatedRecord:f.isRef||false,inSubtable:f.inSubtable||false,tableCode:f.tableCode||"",tableLabel:f.tableLabel||""})),
      relations:a.relations.map(r=>({label:r.fromDisplay||r.fromLabel||r.from||r.kind,fromField:r.from,sourceJoinField:r.sourceJoinField||r.from||"",controlField:r.controlField||"",controlFieldLabel:r.controlFieldLabel||"",toApp:r.toApp,toField:r.toField,type:r.kind,copyFields:r.copyFields||[],displayFields:r.displayFields||[],filterCond:r.filterCond||""})),
    })),
  };
  openModal("ERモデル JSON",JSON.stringify(schema,null,2),exportFilename("ERモデル","json"));
}

// ─── CSV exports ───
// 表計算ソフトで式になり得る値（= + - @ で始まる値。日本語版の Excel は全角の ＝ ＋ － ＠ も式にする。先頭のタブ・改行・空白を除いて評価するソフトもある）は ' を付けて文字列にする
function csvCell(v){
  const raw=String(v==null?"":v);
  const s=/^(?:[\t\r\n]|[\t\r\n \u3000]*[=+\-@\uff1d\uff0b\uff0d\uff20])/.test(raw)?"'"+raw:raw;
  return /[",\n\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function csvLine(arr){return arr.map(csvCell).join(",");}
function showCSVApps(){
  const rows=[["アプリID","アプリ名","項目数","項目範囲","リレーション数","Lookup数","関連レコード数","アクション数","必須項目数","深さ","開始点","取得状態","取得上の注意"]];
  APPS.forEach(a=>{
    const lookups=(a.relations||[]).filter(r=>r.kind==="LOOKUP").length;
    const refs=(a.relations||[]).filter(r=>r.kind==="REF").length;
    const acts=(a.relations||[]).filter(r=>r.kind==="ACTION").length;
    rows.push([a.id,a.name,exportFieldsForApp(a).length,"取得済み全項目",a.relations.length,lookups,refs,acts,a.requiredCount||0,a.depth||0,startAppIdSet.has(String(a.id))?"1":"0",exportStatusLabel(a),exportIssueText(a)]);
  });
  openModal("CSV (アプリ一覧)","\ufeff"+rows.map(csvLine).join("\n"),exportFilename("ER図_アプリ一覧","csv"));
}
function showCSVFields(){
  const rows=[["アプリID","アプリ名","取得状態","取得上の注意","項目範囲","現在の図に表示","フィールドコード","フィールド名","種類","必須","重複禁止","主キー","ルックアップ","関連","サブテーブル内","テーブルコード","テーブル名","技術パス"]];
  APPS.forEach(a=>{
    const visibleFieldSet=new Set(visibleFieldsForNode(a));
    exportFieldsForApp(a).forEach(f=>{
      rows.push([a.id,a.name,exportStatusLabel(a),exportIssueText(a),"取得済み全項目",visibleFieldSet.has(f)?"1":"0",f.code||"",buildFieldDisplayName(f),f.type||"",f.required?"1":"0",f.unique?"1":"0",f.isPK?"1":"0",f.isLookup?"1":"0",f.isRef?"1":"0",f.inSubtable?"1":"0",f.tableCode||"",f.tableLabel||"",f.path||f.code||""]);
    });
  });
  openModal("CSV (フィールド一覧)","\ufeff"+rows.map(csvLine).join("\n"),exportFilename("ER図_フィールド一覧","csv"));
}
function showCSVRelations(){
  const rows=[["種類","関連名","起点アプリID","起点アプリ名","起点の取得状態","起点の取得上の注意","表示部品","結合元フィールド","宛先アプリID","宛先アプリ名","宛先の取得状態","宛先フィールド","コピー・表示するフィールド","絞り込み条件"]];
  APPS.forEach(a=>{
    a.relations.forEach(r=>{
      const t=appMap.get(r.toApp);
      rows.push([r.kind,r.fromDisplay||r.fromLabel||r.from||r.kind,a.id,a.name,exportStatusLabel(a),exportIssueText(a),r.controlFieldLabel||r.controlField||"",r.kind==="ACTION"?"":(r.sourceJoinField||r.from||""),r.toApp,t?t.name:"未取得の参照先",t?exportStatusLabel(t):"未取得",r.toField||"",relFieldsText(r),relFilterText(r)]);
    });
  });
  openModal("CSV (リレーション一覧)","\ufeff"+rows.map(csvLine).join("\n"),exportFilename("ER図_リレーション一覧","csv"));
}

// ─── Markdown spec ───
function mdEsc(s){return String(s==null?"":s).replace(/[\\|<>]/g,"\\$&").replace(/\n/g," ");}
function showMarkdown(){
  recomputeErAnalysis();
  const lines=[];
  lines.push("# kintone ER図 仕様書");
  lines.push("");
  lines.push("- 生成日時: " + new Date().toLocaleString("ja-JP"));
  if(ER_OPTIONS.sourceLabel) lines.push("- 取得元: " + ER_OPTIONS.sourceLabel);
  lines.push("- 起点アプリ: " + ((ER_OPTIONS.startAppIds||[]).join(", ") || "-"));
  lines.push("- 探索深さ: " + (ER_OPTIONS.maxDepth||"無制限"));
  lines.push("- 逆引き探索: " + (ER_OPTIONS.includeReverseLookup?"ON":"OFF"));
  if(ER_OPTIONS.reverseScanNote) lines.push("- 逆引き走査の注意: " + ER_OPTIONS.reverseScanNote);
  lines.push("- サブテーブル: " + (ER_OPTIONS.includeSubtableFields!==false?"ON":"OFF"));
  lines.push("- 項目範囲: 取得済み全項目（図の表示密度とは独立）");
  lines.push("- 接続: " + (ER_OPTIONS.sourceGuestId?("ゲスト "+ER_OPTIONS.sourceGuestId):"通常空間") + " / " + (ER_OPTIONS.sourcePreview?"プレビュー":"本番"));
  lines.push("- アプリ数: " + APPS.length);
  lines.push("- 総リレーション: " + APPS.reduce((s,a)=>s+a.relations.length,0));
  lines.push("- 取得完了: " + ER_ANALYSIS.counts.retrievalComplete);
  lines.push("- 一部取得: " + ER_ANALYSIS.counts.retrievalPartial);
  lines.push("- 取得失敗: " + ER_ANALYSIS.counts.retrievalFailed);
  lines.push("- 複数アプリの循環候補: " + ER_ANALYSIS.cycles.length);
  lines.push("- 自己参照: " + ER_ANALYSIS.selfReferences.length);
  lines.push("- 図内で関連のないアプリ: " + ER_ANALYSIS.isolatedAppIds.length);
  lines.push("- 未取得の参照先: " + ER_ANALYSIS.unresolvedTargets.length);
  lines.push("");
  {
    lines.push("## グラフ分析サマリ");
    lines.push("");
    lines.push("- 複数アプリの循環参照 (SCC): " + (ER_ANALYSIS.cycles||[]).length + "件");
    lines.push("- ハブアプリ（接続数 " + (ER_ANALYSIS.highConnectionThreshold||3) + "件以上）: " + (ER_ANALYSIS.hubs||[]).length + "件");
    lines.push("- 孤立アプリ（関連なし）: " + (ER_ANALYSIS.isolatedAppIds||[]).length + "件");
    lines.push("- 自己参照: " + (ER_ANALYSIS.selfReferences||[]).length + "件");
    lines.push("- 未取得の参照先: " + (ER_ANALYSIS.unresolvedTargets||[]).length + "件");
    lines.push("");
    if((ER_ANALYSIS.isolatedAppIds||[]).length){
      lines.push("### 孤立アプリ");
      ER_ANALYSIS.isolatedAppIds.forEach(id=>{const app=appMap.get(Number(id))||appMap.get(id);lines.push("- "+mdEsc(app?app.name:("アプリ "+id))+" (App "+id+")");});
      lines.push("");
    }
    if((ER_ANALYSIS.selfReferences||[]).length){
      lines.push("### 自己参照");
      ER_ANALYSIS.selfReferences.forEach(sr=>lines.push("- "+mdEsc(sr.appName)+" (App "+sr.appId+"): "+mdEsc(sr.kind||"")+(sr.field?" ("+mdEsc(sr.field)+")":"")));
      lines.push("");
    }
    if((ER_ANALYSIS.unresolvedTargets||[]).length){
      lines.push("### 未取得の参照先");
      ER_ANALYSIS.unresolvedTargets.forEach(ut=>lines.push("- "+mdEsc(ut.fromAppName)+" (App "+ut.fromAppId+") → App "+mdEsc(ut.toAppId||"不明")+": "+mdEsc(ut.kind||"")+(ut.field?" ("+mdEsc(ut.field)+")":"")));
      lines.push("");
    }
  }
  lines.push("## 構造チェック（事実ベース）");
  lines.push("");
  if(ER_ANALYSIS.cycles.length){
    lines.push("### 複数アプリの循環候補");
    ER_ANALYSIS.cycles.forEach((cycle,i)=>lines.push("- 候補 "+(i+1)+": "+cycle.appNames.map(mdEsc).join(" → ")));
    lines.push("");
  }
  if(ER_ANALYSIS.hubs.length){
    lines.push("### 接続数が多いアプリ（"+ER_ANALYSIS.highConnectionThreshold+"件以上）");
    ER_ANALYSIS.hubs.forEach(hub=>lines.push("- "+mdEsc(hub.name)+" (App "+hub.appId+"): 入 "+hub.incoming+" / 出 "+hub.outgoing+" / 合計 "+hub.total));
    lines.push("");
  }
  lines.push("## ER図");
  lines.push("");
  const mermaidText=buildMermaidText();
  const fence="\u0060\u0060\u0060";
  if(mermaidText.length<=ER_MD_MERMAID_MAX_CHARS) lines.push(fence+"mermaid",mermaidText.trimEnd(),fence);
  else lines.push("図が大きいため省略しました。Mermaid 出力または PNG 出力を利用してください。");
  lines.push("");
  lines.push("## アプリ一覧");
  lines.push("");
  lines.push("| アプリID | アプリ名 | 項目数 | 関連数 | 深さ | 状態 |");
  lines.push("|---:|---|---:|---:|---:|---|");
  APPS.forEach(a=>{
    lines.push("| "+a.id+" | "+mdEsc(a.name)+" | "+exportFieldsForApp(a).length+" | "+a.relations.length+" | "+(a.depth||0)+" | "+(a.status==="partial"?"一部取得":(a.ok?"取得完了":"取得失敗"))+" |");
  });
  lines.push("");
  APPS.forEach(a=>{
    lines.push("## "+mdEsc(a.name)+" (App "+a.id+")");
    lines.push("");
    lines.push("- 取得状態: "+exportStatusLabel(a));
    if(exportIssueText(a)) lines.push("- 取得上の注意: "+mdEsc(exportIssueText(a)));
    lines.push("");
    const vf=exportFieldsForApp(a);
    if(vf.length){
      lines.push("### フィールド");
      lines.push("");
      lines.push("| コード | 名称 | 種類 | 必須 | 主キー | Lookup | 関連 | サブテーブル |");
      lines.push("|---|---|---|:---:|:---:|:---:|:---:|:---:|");
      vf.forEach(f=>{
        lines.push("| "+mdEsc(f.code||"")+" | "+mdEsc(buildFieldDisplayName(f))+" | "+mdEsc(fieldTypeJpLabel(f.type))+" | "+(f.required?"✓":"")+" | "+(f.isPK?"✓":"")+" | "+(f.isLookup?"✓":"")+" | "+(f.isRef?"✓":"")+" | "+(f.inSubtable?"✓":"")+" |");
      });
      lines.push("");
    }
    if(a.relations && a.relations.length){
      lines.push("### リレーション");
      lines.push("");
      lines.push("| 種類 | 関連名 | 表示部品 | 結合元フィールド | 宛先アプリ | 宛先フィールド | コピー・表示するフィールド | 絞り込み条件 |");
      lines.push("|---|---|---|---|---|---|---|---|");
      a.relations.forEach(r=>{
        const t=appMap.get(r.toApp);
        lines.push("| "+r.kind+" | "+mdEsc(r.fromDisplay||r.fromLabel||r.from||r.kind)+" | "+mdEsc(r.controlFieldLabel||r.controlField||"")+" | "+mdEsc(r.kind==="ACTION"?"":(r.sourceJoinField||r.from||""))+" | "+mdEsc(t?t.name+" (App "+r.toApp+")":"未取得 (App "+r.toApp+")")+" | "+mdEsc(r.toField||"")+" | "+mdEsc(relFieldsText(r))+" | "+mdEsc(relFilterText(r))+" |");
      });
      lines.push("");
    }
  });
  openModal("Markdown 仕様書",lines.join("\n"),exportFilename("ER図仕様書","md"));
}


// ─── Share URL (encodes current state in hash) ───
// 配色は保存しない（開いた人の OS の設定に従う）
function encodeState(){
  const state={
    l: ER_OPTIONS.layoutName,
    d: ER_OPTIONS.fieldDensity,
    f: focusMode ? 1 : 0,
    fd: focusDepth,
    fdir: focusDirection,
    rl: relationLabelVisible ? 1 : 0,
    rk: (relationKindState.LOOKUP?"L":"") + (relationKindState.REF?"R":"") + (relationKindState.ACTION?"A":""),
    s: viewScope.mode === "all" ? "all" : { r: viewScope.roots.slice(), d: viewScope.depth }
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}
function applyStateFromHash(){
  try{
    const h=location.hash.replace(/^#/,"");
    if(!h) return;
    const state=JSON.parse(decodeURIComponent(escape(atob(h))));
    if(state.l && normalizeLayoutName(state.l) !== ER_OPTIONS.layoutName) setLayout(normalizeLayoutName(state.l));
    else if(state.l) syncLayoutButtons(ER_OPTIONS.layoutName);
    if(state.d && normalizeDensityName(state.d) !== ER_OPTIONS.fieldDensity) setDensity(normalizeDensityName(state.d));
    if(typeof state.f === "number"){ if(!!state.f !== focusMode) toggleFocusMode(); }
    if(state.fd){ const sel=document.getElementById("focus-depth"); if(sel) sel.value=String(state.fd); }
    if(state.fdir){ const sel=document.getElementById("focus-direction"); if(sel) sel.value=state.fdir; }
    if(typeof state.rk === "string"){
      if(relationKindState.LOOKUP !== state.rk.includes("L")) toggleRelationKind("LOOKUP");
      if(relationKindState.REF !== state.rk.includes("R")) toggleRelationKind("REF");
      if(relationKindState.ACTION !== state.rk.includes("A")) toggleRelationKind("ACTION");
    }
    if(typeof state.rl === "number" && !!state.rl !== relationLabelVisible) toggleRelationLabels();
    if(state.s === "all" && viewScope.mode !== "all") setScope({mode:"all"});
    else if(state.s && Array.isArray(state.s.r)) setScope({mode:"around",roots:state.s.r.map(String),depth:state.s.d});
    updateFocusOptions();
  }catch(_){ /* ignore */ }
}
function copyShareUrl(){
  // blob: や file: のページでは origin + pathname だと不正なURLになるため、現在のURLからハッシュだけを置き換える
  const url=location.href.split("#")[0]+"#"+encodeState();
  const done=()=>toast(location.protocol==="blob:"
    ? "表示状態のURLをコピーしました（この画面を閉じると開けません。共有にはHTML保存を使ってください）"
    : "表示状態のURLをコピーしました");
  const manual=()=>prompt("URLをコピーしてください", url);
  try{
    navigator.clipboard.writeText(url).then(done,manual);
  }catch(_){
    manual();
  }
}
