// ─── Manual additions (アプリ / 項目 / 関連線の手動追加 UI) ───
let editorMode="";
let pendingNodePos=null;
let editorReturnFocus=null;

function appOptionsHtml(selectedId){
  return APPS.map(a=>'<option value="'+escapeHtml(String(a.id))+'"'+(String(a.id)===String(selectedId)?" selected":"")+'>'+escapeHtml(a.name)+(a.isCustom?"（手動）":" (App "+escapeHtml(String(a.id))+")")+'</option>').join("");
}
const MANUAL_FIELD_TYPES=[["SINGLE_LINE_TEXT","文字列(1行)"],["MULTI_LINE_TEXT","文字列(複数行)"],["NUMBER","数値"],["CALC","計算"],["DATE","日付"],["DATETIME","日時"],["DROP_DOWN","ドロップダウン"],["CHECK_BOX","チェックボックス"],["USER_SELECT","ユーザー選択"],["FILE","添付ファイル"],["LINK","リンク"],["RECORD_NUMBER","レコード番号"]];
function openEditor(mode, title, sub, bodyHtml, opts){
  const o=opts||{};
  editorMode=mode;
  document.getElementById("editor-title").textContent=title;
  document.getElementById("editor-sub").textContent=sub;
  document.getElementById("editor-body").innerHTML=bodyHtml;
  const submitBtn=document.getElementById("editor-submit");
  if(submitBtn) submitBtn.textContent=o.submitLabel||"追加";
  const delBtn=document.getElementById("editor-delete");
  if(delBtn) delBtn.style.display=o.showDelete?"":"none";
  const editorOverlay=document.getElementById("editor-overlay");
  if(!editorOverlay.classList.contains("open")) editorReturnFocus=rememberDialogFocus();
  editorOverlay.classList.add("open");
  const first=document.querySelector("#editor-body input,#editor-body select,#editor-body textarea");
  if(first) setTimeout(()=>{try{first.focus();}catch(_){}},50);
}
function closeEditor(){
  editorMode=""; pendingNodePos=null; editingNoteId=""; editingAppId=""; editingFieldRef=null; editingRelRef=null;
  const editorOverlay=document.getElementById("editor-overlay");
  const wasOpen=editorOverlay.classList.contains("open");
  editorOverlay.classList.remove("open");
  if(wasOpen){ const back=editorReturnFocus; editorReturnFocus=null; restoreDialogFocus(back); }
}
function submitEditor(){
  if(editorMode==="app") addCustomApp();
  else if(editorMode==="field") addCustomField();
  else if(editorMode==="rel") addCustomRelation();
  else if(editorMode==="note-add") submitNoteAdd();
  else if(editorMode==="note-edit") submitNoteEdit();
  else if(editorMode==="edit-app") submitEditApp();
  else if(editorMode==="edit-field") submitEditField();
  else if(editorMode==="edit-rel") submitEditRelation();
}
function deleteFromEditor(){
  if(editorMode==="note-edit"){
    const node=cy.getElementById(editingNoteId);
    if(node.length) deleteNoteNodes(node);
    closeEditor();
    toast("メモを削除しました");
  }
}
function currentTargetAppId(){
  if(activeAppId) return activeAppId;
  if(lastTappedNodeId){
    const n=cy.getElementById(lastTappedNodeId);
    if(n.length) return n.data("appId");
  }
  return APPS.length ? APPS[0].id : "";
}
function openAddApp(pos){
  pendingNodePos=pos||null;
  openEditor("app","アプリを追加","図にだけ追加します（kintone にアプリは作りません）。",
    '<div class="ed-row"><label>アプリ名 *</label><input id="ed-app-name" placeholder="例: 外部システム / 顧客マスタ(構想)"></div>'
    +'<div class="ed-row"><label>初期項目（任意・1行に1項目）</label><textarea id="ed-app-fields" placeholder="顧客名&#10;!顧客コード&#10;*金額"></textarea>'
    +'<div class="ed-hint">行頭の記号で区分を指定できます: <b>!</b> 主キー / <b>*</b> 必須 / 無印 通常の項目。項目は後から「項目を追加」でも足せます。</div></div>');
}
function openAddField(){
  if(!APPS.length){toast("追加先のアプリがありません");return;}
  openEditor("field","項目を追加","図のカード・詳細・出力に項目を足します（kintone の設定は変わりません）。",
    '<div class="ed-row"><label>対象アプリ</label><select id="ed-field-app">'+appOptionsHtml(currentTargetAppId())+'</select></div>'
    +'<div class="ed-row"><label>項目名 *</label><input id="ed-field-name" placeholder="例: 承認ステータス"></div>'
    +'<div class="ed-row"><label>フィールドコード（任意）</label><input id="ed-field-code" placeholder="未入力なら自動採番"></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-field-type">'+MANUAL_FIELD_TYPES.map(t=>'<option value="'+t[0]+'">'+t[1]+'</option>').join("")+'</select></div>'
    +'<div class="ed-row"><label>区分</label><select id="ed-field-kind"><option value="">通常</option><option value="pk">主キー</option><option value="required">必須</option><option value="lookup">ルックアップ</option><option value="ref">関連レコード一覧</option></select></div>');
}
function openAddRelation(){
  if(APPS.length<2){toast("関連線を引くにはアプリが2つ以上必要です");return;}
  openEditor("rel","関連線を追加","2 つのアプリの間に線を引きます。関連一覧と出力にも入ります（kintone の設定は変わりません）。",
    '<div class="ed-row"><label>参照元アプリ</label><select id="ed-rel-from">'+appOptionsHtml(currentTargetAppId())+'</select></div>'
    +'<div class="ed-row"><label>参照先アプリ</label><select id="ed-rel-to">'+appOptionsHtml("")+'</select></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-rel-kind"><option value="LOOKUP">ルックアップ</option><option value="REF">関連レコード一覧</option><option value="ACTION">アプリアクション</option></select></div>'
    +'<div class="ed-row"><label>ラベル（任意）</label><input id="ed-rel-label" placeholder="例: 顧客参照"></div>');
}
function parseManualFieldLines(text){
  return String(text||"").split(/\n+/).map(l=>l.trim()).filter(Boolean).slice(0,30).map(line=>{
    const isPK=line.charAt(0)==="!";
    const required=line.charAt(0)==="*";
    const label=line.replace(/^[!*]\s*/,"").trim();
    customFieldSeq+=1;
    return {code:"manual_"+customFieldSeq,label:label||("項目"+customFieldSeq),type:isPK?"RECORD_NUMBER":"SINGLE_LINE_TEXT",required:required||isPK,isPK,unique:isPK,isCustom:true};
  });
}
function addCustomApp(){
  const name=(document.getElementById("ed-app-name").value||"").trim();
  if(!name){toast("アプリ名を入力してください");return;}
  const fields=parseManualFieldLines(document.getElementById("ed-app-fields").value);
  customAppSeq+=1;
  const id=-customAppSeq;
  const app={id,name,fields,totalFieldCount:fields.length,relations:[],ok:true,depth:0,isCustom:true,
    requiredCount:fields.filter(f=>f.required).length,lookupCount:0,refCount:0};
  registerManualApp(app);
  const ext=cy.extent();
  const pos=pendingNodePos||{x:(ext.x1+ext.x2)/2+(Math.random()*60-30),y:(ext.y1+ext.y2)/2+(Math.random()*60-30)};
  const node=cy.add({group:"nodes",data:{id:"a"+id,label:buildNodeLabel(app),...nodeCardData(app),appId:id,isError:false,isStart:false,inSpace:false,isCustom:true,accent:"",fieldCount:fields.length,relCount:0,depth:0},position:pos});
  // 表示範囲を絞っているときも、追加したアプリは見えるようにする
  if(scopeMembers) scopeMembers.add(node.id());
  if(semanticZoomActive) applySemanticZoom(cy.zoom(),true);
  applyRelationLabelVisibility();
  commands.push({label:"アプリ: "+app.name+" (手動追加)",icon:"⬡",appId:id,action:()=>focusApp(id)});
  pushUndo("アプリ追加",()=>{
    const n=cy.getElementById("a"+id);
    if(n.length) cy.remove(n);
    const idx=APPS.indexOf(app);
    if(idx>=0) APPS.splice(idx,1);
    appMap.delete(app.id);
    if(scopeMembers) scopeMembers.delete("a"+id);
    invalidateRelationCounts();
    refreshSidebar();
    if(String(activeAppId)===String(app.id)) closeDetail();
  });
  refreshSidebar();
  closeEditor();
  node.select();
  renderAppDetail(app);
  toast("アプリを追加しました: "+name);
}
function addCustomField(){
  const app=findApp(document.getElementById("ed-field-app").value);
  if(!app){toast("対象アプリが見つかりません");return;}
  const name=(document.getElementById("ed-field-name").value||"").trim();
  if(!name){toast("項目名を入力してください");return;}
  const codeInput=(document.getElementById("ed-field-code").value||"").trim();
  const type=document.getElementById("ed-field-type").value||"SINGLE_LINE_TEXT";
  const kind=document.getElementById("ed-field-kind").value;
  customFieldSeq+=1;
  const field={code:codeInput||("manual_"+customFieldSeq),label:name,type,
    required:kind==="required"||kind==="pk",isPK:kind==="pk",unique:kind==="pk",
    isLookup:kind==="lookup",isRef:kind==="ref",isCustom:true};
  applyManualFieldData(app,field);
  pushUndo("項目追加",()=>{
    [app.fields,app.allFields].forEach(list=>{
      if(!Array.isArray(list)) return;
      const index=list.indexOf(field);
      if(index>=0) list.splice(index,1);
    });
    if(typeof app.totalFieldCount==="number") app.totalFieldCount=Math.max(0,app.totalFieldCount-1);
    if(field.required) app.requiredCount=Math.max(0,(app.requiredCount||0)-1);
    afterFieldVisibilityChange(app);
  });
  const node=cy.getElementById("a"+app.id);
  if(node.length){
    refreshNodeDisplay(node,app);
    node.data("fieldCount",visibleFieldsForNode(app).length);
  }
  refreshSidebar();
  if(String(activeAppId)===String(app.id)) renderAppDetail(app);
  closeEditor();
  toast("項目を追加: "+name+" → "+app.name);
}
function addCustomRelation(){
  const from=findApp(document.getElementById("ed-rel-from").value);
  const to=findApp(document.getElementById("ed-rel-to").value);
  if(!from||!to){toast("アプリを選択してください");return;}
  if(String(from.id)===String(to.id)){toast("参照元と参照先が同じアプリです");return;}
  const kind=document.getElementById("ed-rel-kind").value||"LOOKUP";
  const kindLabel=kind==="LOOKUP"?"ルックアップ":(kind==="REF"?"関連":"アクション");
  const label=(document.getElementById("ed-rel-label").value||"").trim()||(kindLabel+"(手動)");
  customRelSeq+=1;
  const rel={from:"__MANUAL__"+customRelSeq,fromLabel:label,fromDisplay:label,toApp:to.id,toField:"",kind,isCustom:true};
  const relIndex=from.relations.length;
  applyManualRelationData(from,rel);
  const fromNode=cy.getElementById("a"+from.id), toNode=cy.getElementById("a"+to.id);
  // 表示範囲を絞っているときは、線を引いた両端のアプリを見えるようにする
  if(scopeMembers&&(scopeMembers.has(fromNode.id())||scopeMembers.has(toNode.id()))){
    const revealed=[fromNode,toNode].filter(n=>!scopeMembers.has(n.id()));
    revealed.forEach(n=>scopeMembers.add(n.id()));
    applyScopeClasses();
  }
  cy.add({group:"edges",data:{id:"e_"+from.id+"_"+relIndex,source:"a"+from.id,target:"a"+to.id,kind,label:edgeDisplayLabel(label),fromLabel:label,fromDisplay:label,isCustom:true,bundleCount:1,bundleWidth:1.8}});
  if(scopeMembers) applyScopeClasses();
  if(semanticZoomActive) applySemanticZoom(cy.zoom(),true);
  pushUndo("関連線追加",()=>{
    const ri=from.relations.indexOf(rel); if(ri>=0) from.relations.splice(ri,1);
    if(kind==="LOOKUP") from.lookupCount=Math.max(0,(from.lookupCount||0)-1);
    if(kind==="REF") from.refCount=Math.max(0,(from.refCount||0)-1);
    const e=cy.getElementById("e_"+from.id+"_"+relIndex);
    if(e.length) cy.remove(e);
    invalidateRelationCounts();
    [from,to].forEach(a=>{
      const n=cy.getElementById("a"+a.id);
      if(n.length){ n.data("relCount",a.relations.length); refreshNodeDisplay(n,a); }
    });
    applyRelationFilter();
    refreshSidebar();
    if(String(activeAppId)===String(from.id)) renderAppDetail(from);
  });
  [from,to].forEach(a=>{
    const n=cy.getElementById("a"+a.id);
    if(n.length){ n.data("relCount",a.relations.length); refreshNodeDisplay(n,a); }
  });
  applyRelationFilter();
  applyRelationLabelVisibility();
  refreshSidebar();
  if(String(activeAppId)===String(from.id)) renderAppDetail(from);
  closeEditor();
  toast("関連線を追加: "+from.name+" → "+to.name);
}
document.getElementById("editor").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target&&e.target.tagName!=="TEXTAREA"){e.preventDefault();submitEditor();}
});

// ─── 色スウォッチ（アプリ枠色・メモ色の選択UI） ───
const APP_ACCENT_COLORS=[["","なし(既定)"],["#818cf8","藍"],["#60a5fa","青"],["#2dd4bf","青緑"],["#34d399","緑"],["#fbbf24","黄"],["#f87171","赤"],["#f472b6","桃"],["#a78bfa","紫"]];
const NOTE_COLORS=[["#fef08a","黄"],["#fbcfe8","桃"],["#bae6fd","青"],["#bbf7d0","緑"],["#fed7aa","橙"],["#e9d5ff","紫"]];
function swatchesHtml(colors,selected){
  return '<div class="ed-swatches">'+colors.map(c=>{
    const col=c[0];
    const cls="ed-swatch"+(col?"":" ed-swatch--none")+(String(selected||"")===String(col)?" selected":"");
    return '<button type="button" class="'+cls+'" data-color="'+escapeHtml(col)+'" title="'+escapeHtml(c[1])+'"'+(col?' style="background:'+escapeHtml(col)+'"':'')+' data-action="swatch"></button>';
  }).join("")+'</div>';
}
function selectSwatch(btn){
  btn.parentNode.querySelectorAll(".ed-swatch").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");
}
function selectedSwatchColor(){
  const sel=document.querySelector("#editor-body .ed-swatch.selected");
  return sel?String(sel.dataset.color||""):"";
}

// ─── アプリの編集（表示名・枠色） ───
let editingAppId="";
function openEditApp(appId){
  const app=findApp(appId!==undefined&&appId!==""?appId:currentTargetAppId());
  if(!app){toast("編集するアプリを図で選んでください");return;}
  editingAppId=app.id;
  openEditor("edit-app","アプリを編集","図での名前と枠の色を変えます（kintone のアプリ名は変わりません）。",
    '<div class="ed-row"><label>表示名 *</label><input id="ed-eapp-name"></div>'
    +'<div class="ed-row"><label>枠色（グループ分けに便利）</label>'+swatchesHtml(APP_ACCENT_COLORS,appAccentColor(app))+'</div>',
    {submitLabel:"保存"});
  document.getElementById("ed-eapp-name").value=app.name||"";
}
function applyAppOverride(app,name,color){
  app.name=name;
  appOverrides[app.id]=Object.assign({},appOverrides[app.id],{name:name,color:color||""});
  const node=cy.getElementById("a"+app.id);
  if(node.length){
    node.data("accent",color||"");
    refreshNodeDisplay(node,app);
  }
  commands.forEach(c=>{ if(c.appId!==undefined&&String(c.appId)===String(app.id)) c.label="アプリ: "+name+" (ID:"+app.id+")"; });
  refreshSidebar();
  if(String(activeAppId)===String(app.id)) renderAppDetail(app);
}
function submitEditApp(){
  const app=findApp(editingAppId);
  if(!app){closeEditor();return;}
  const name=(document.getElementById("ed-eapp-name").value||"").trim();
  if(!name){toast("表示名を入力してください");return;}
  const old={name:app.name,color:appAccentColor(app)};
  applyAppOverride(app,name,selectedSwatchColor());
  pushUndo("アプリ編集",()=>{applyAppOverride(app,old.name,old.color);});
  closeEditor();
  toast("アプリを更新: "+name);
}

// ─── 項目の編集（表示名・種類・区分） ───
let editingFieldRef=null;
function openEditFieldRow(btn){
  const app=findApp(btn.dataset.app);
  if(!app) return;
  const key=decodeURIComponent(btn.dataset.key||"");
  const field=findFieldByKey(app,key);
  if(!field){toast("対象の項目が見つかりません");return;}
  editingFieldRef={appId:app.id,key};
  const currentKind=field.isPK?"pk":(field.isLookup?"lookup":(field.isRef?"ref":(field.required?"required":"")));
  const typeOptions=MANUAL_FIELD_TYPES.some(t=>t[0]===field.type)?MANUAL_FIELD_TYPES:[[field.type,fieldTypeJpLabel(field.type)]].concat(MANUAL_FIELD_TYPES);
  openEditor("edit-field","項目を編集","図での名前・種類・区分を変えます（kintone の設定は変わりません）。",
    '<div class="ed-row"><label>項目名 *</label><input id="ed-efield-name"></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-efield-type">'+typeOptions.map(t=>'<option value="'+escapeHtml(t[0])+'"'+(t[0]===field.type?" selected":"")+'>'+escapeHtml(t[1])+'</option>').join("")+'</select></div>'
    +'<div class="ed-row"><label>区分</label><select id="ed-efield-kind">'
      +'<option value=""'+(currentKind===""?" selected":"")+'>通常</option>'
      +'<option value="pk"'+(currentKind==="pk"?" selected":"")+'>主キー</option>'
      +'<option value="required"'+(currentKind==="required"?" selected":"")+'>必須</option>'
      +'<option value="lookup"'+(currentKind==="lookup"?" selected":"")+'>ルックアップ</option>'
      +'<option value="ref"'+(currentKind==="ref"?" selected":"")+'>関連レコード一覧</option>'
    +'</select></div>'
    +'<div class="ed-hint">フィールドコード: <b>'+escapeHtml(field.code||"-")+'</b>（コードは変更できません）</div>',
    {submitLabel:"保存"});
  document.getElementById("ed-efield-name").value=field.label||"";
}
function fieldPatchFromKind(kind){
  return {isPK:kind==="pk",unique:kind==="pk",required:kind==="required"||kind==="pk",isLookup:kind==="lookup",isRef:kind==="ref"};
}
function applyFieldOverride(app,key,patch){
  const field=findFieldByKey(app,key);
  if(!field) return;
  Object.assign(field,patch);
  fieldOverrides[key]=Object.assign({},fieldOverrides[key],patch);
  afterFieldVisibilityChange(app);
}
function submitEditField(){
  if(!editingFieldRef){closeEditor();return;}
  const appId=editingFieldRef.appId, key=editingFieldRef.key;
  const app=findApp(appId);
  const field=app&&findFieldByKey(app,key);
  if(!field){closeEditor();return;}
  const name=(document.getElementById("ed-efield-name").value||"").trim();
  if(!name){toast("項目名を入力してください");return;}
  const old={label:field.label,type:field.type,isPK:!!field.isPK,unique:!!field.unique,required:!!field.required,isLookup:!!field.isLookup,isRef:!!field.isRef};
  const patch=Object.assign({label:name,type:document.getElementById("ed-efield-type").value||field.type},fieldPatchFromKind(document.getElementById("ed-efield-kind").value));
  applyFieldOverride(app,key,patch);
  pushUndo("項目編集",()=>{const a=findApp(appId);if(a)applyFieldOverride(a,key,old);});
  closeEditor();
  toast("項目を更新: "+name);
}

// ─── 関連線の編集（ラベル・種類） ───
let editingRelRef=null;
function openEditRelationRow(btn){
  const edgeId=String(btn.dataset.edge||"");
  const ref=parseEdgeId(edgeId);
  const app=ref&&findApp(ref.appId);
  const rel=app&&(app.relations||[])[ref.ri];
  if(!rel){toast("対象の関連線が見つかりません");return;}
  editingRelRef={appId:app.id,edgeId,ri:ref.ri};
  openEditor("edit-rel","関連線を編集","図での線の名前と種類を変えます（kintone の設定は変わりません）。",
    '<div class="ed-row"><label>ラベル</label><input id="ed-erel-label"></div>'
    +'<div class="ed-row"><label>種類</label><select id="ed-erel-kind">'
      +'<option value="LOOKUP"'+(rel.kind==="LOOKUP"?" selected":"")+'>ルックアップ</option>'
      +'<option value="REF"'+(rel.kind==="REF"?" selected":"")+'>関連レコード一覧</option>'
      +'<option value="ACTION"'+(rel.kind==="ACTION"?" selected":"")+'>アプリアクション</option>'
    +'</select></div>',
    {submitLabel:"保存"});
  document.getElementById("ed-erel-label").value=rel.fromDisplay||rel.fromLabel||"";
}
function applyRelationOverride(app,edgeId,ri,patch){
  const rel=(app.relations||[])[ri];
  if(!rel) return;
  Object.assign(rel,patch);
  relationOverrides[edgeId]=Object.assign({},relationOverrides[edgeId],patch);
  const edge=cy.getElementById(edgeId);
  if(edge.length){
    edge.data("kind",rel.kind);
    edge.data("label",edgeDisplayLabel(rel.fromDisplay||rel.fromLabel||""));
    edge.data("fromLabel",rel.fromLabel);
    edge.data("fromDisplay",rel.fromDisplay||rel.fromLabel||"");
  }
  applyRelationFilter();
  refreshSidebar();
  refreshOpenDetail();
}
function submitEditRelation(){
  if(!editingRelRef){closeEditor();return;}
  const appId=editingRelRef.appId, edgeId=editingRelRef.edgeId, ri=editingRelRef.ri;
  const app=findApp(appId);
  const rel=app&&(app.relations||[])[ri];
  if(!rel){closeEditor();return;}
  const label=(document.getElementById("ed-erel-label").value||"").trim()||rel.fromLabel||"関連";
  const kind=document.getElementById("ed-erel-kind").value||rel.kind;
  const old={fromLabel:rel.fromLabel,fromDisplay:rel.fromDisplay,kind:rel.kind};
  applyRelationOverride(app,edgeId,ri,{fromLabel:label,fromDisplay:label,kind});
  pushUndo("関連線編集",()=>{const a=findApp(appId);if(a)applyRelationOverride(a,edgeId,ri,old);});
  closeEditor();
  toast("関連線を更新しました");
}

// ─── メモ（付箋）ノード ───
let noteSeq=(ER_EDIT_STATE&&ER_EDIT_STATE.seq&&Number(ER_EDIT_STATE.seq.note))||0;
let editingNoteId="";
function addNoteElement(data){
  return cy.add({group:"nodes",classes:"note-node",data:{id:data.id,label:data.text,noteColor:data.color||"#fef08a",isNote:true},position:{x:Number(data.x)||0,y:Number(data.y)||0}});
}
if(ER_EDIT_STATE&&Array.isArray(ER_EDIT_STATE.notes)){
  try{ ER_EDIT_STATE.notes.forEach(n=>{ if(n&&n.id&&!cy.getElementById(n.id).length) addNoteElement(n); }); }
  catch(err){ console.error("[ER] メモの復元に失敗", err); }
}
function openAddNote(pos){
  pendingNodePos=pos||null;
  openEditor("note-add","メモを追加","図に付箋を置きます。出力のファイルには入りませんが、編集済みHTMLに残ります。",
    '<div class="ed-row"><label>メモ内容 *</label><textarea id="ed-note-text" placeholder="例: このアプリ群は受注フロー"></textarea></div>'
    +'<div class="ed-row"><label>色</label>'+swatchesHtml(NOTE_COLORS,"#fef08a")+'</div>');
}
function openEditNote(id){
  const node=cy.getElementById(id);
  if(!node.length) return;
  editingNoteId=id;
  openEditor("note-edit","メモを編集","内容と色を変えます。ドラッグで移動、ここから削除もできます。",
    '<div class="ed-row"><label>メモ内容 *</label><textarea id="ed-note-text"></textarea></div>'
    +'<div class="ed-row"><label>色</label>'+swatchesHtml(NOTE_COLORS,node.data("noteColor"))+'</div>',
    {submitLabel:"保存",showDelete:true});
  document.getElementById("ed-note-text").value=node.data("label")||"";
}
function submitNoteAdd(){
  const text=(document.getElementById("ed-note-text").value||"").trim();
  if(!text){toast("メモ内容を入力してください");return;}
  noteSeq+=1;
  const ext=cy.extent();
  const pos=pendingNodePos||{x:(ext.x1+ext.x2)/2,y:(ext.y1+ext.y2)/2};
  const data={id:"note_"+noteSeq,text,color:selectedSwatchColor()||"#fef08a",x:pos.x,y:pos.y};
  const node=addNoteElement(data);
  pushUndo("メモ追加",()=>{const n=cy.getElementById(data.id);if(n.length)cy.remove(n);});
  closeEditor();
  node.select();
  toast("メモを追加しました（押すと編集、ドラッグで移動）");
}
function submitNoteEdit(){
  const node=cy.getElementById(editingNoteId);
  if(!node.length){closeEditor();return;}
  const text=(document.getElementById("ed-note-text").value||"").trim();
  if(!text){toast("メモ内容を入力してください");return;}
  const noteId=node.id();
  const old={text:node.data("label"),color:node.data("noteColor")};
  node.data("label",text);
  node.data("noteColor",selectedSwatchColor()||old.color);
  pushUndo("メモ編集",()=>{const n=cy.getElementById(noteId);if(n.length){n.data("label",old.text);n.data("noteColor",old.color);}});
  closeEditor();
  toast("メモを更新しました");
}
function deleteNoteNodes(nodes){
  const saved=[];
  nodes.forEach(n=>{const p=n.position();saved.push({id:n.id(),text:n.data("label"),color:n.data("noteColor"),x:p.x,y:p.y});});
  cy.remove(nodes);
  if(saved.length) pushUndo("メモ削除 "+saved.length+"件",()=>{saved.forEach(d=>{if(!cy.getElementById(d.id).length) addNoteElement(d);});});
}

// ─── 整列ツール（複数選択ノードの位置合わせ） ───
function selectedMovableNodes(){
  return cy.nodes(":selected").not(".app-manual-hidden");
}
function pushPositionsUndo(nodes,label){
  const saved=nodes.map(n=>({id:n.id(),x:n.position("x"),y:n.position("y")}));
  pushUndo(label,()=>{saved.forEach(p=>{const n=cy.getElementById(p.id);if(n.length)n.position({x:p.x,y:p.y});});});
}
function alignSelected(axis){
  const nodes=selectedMovableNodes();
  if(nodes.length<2){toast("2 つ以上のアプリを選んでください（Shift+ドラッグ / Shift+クリック）");return;}
  pushPositionsUndo(nodes,"整列");
  if(axis==="x"){
    const v=Math.min.apply(null,nodes.map(n=>n.position("x")));
    nodes.forEach(n=>n.animate({position:{x:v,y:n.position("y")}},{duration:220}));
    toast("選んだアプリを左にそろえました");
  }else{
    const v=Math.min.apply(null,nodes.map(n=>n.position("y")));
    nodes.forEach(n=>n.animate({position:{x:n.position("x"),y:v}},{duration:220}));
    toast("選んだアプリを上にそろえました");
  }
}
function distributeSelected(axis){
  const nodes=selectedMovableNodes();
  if(nodes.length<3){toast("3 つ以上のアプリを選んでください");return;}
  pushPositionsUndo(nodes,"等間隔配置");
  const arr=nodes.sort((a,b)=>a.position(axis)-b.position(axis));
  const first=arr[0].position(axis), last=arr[arr.length-1].position(axis);
  const step=(last-first)/(arr.length-1);
  arr.forEach((n,i)=>{
    const pos={x:n.position("x"),y:n.position("y")};
    pos[axis]=first+step*i;
    n.animate({position:pos},{duration:220});
  });
  toast(axis==="x"?"横に等間隔で並べました":"縦に等間隔で並べました");
}

// ─── 深さごとの色分け ───
function setAppAccent(app,color){
  appOverrides[app.id]=Object.assign({},appOverrides[app.id],{name:app.name,color:color||""});
  const n=cy.getElementById("a"+app.id);
  if(n.length) n.data("accent",color||"");
}
function snapshotAccents(){
  const map={};
  APPS.forEach(app=>{map[app.id]=appAccentColor(app);});
  return map;
}
function restoreAccents(map){
  APPS.forEach(app=>{setAppAccent(app,map[app.id]||"");});
}
function autoColorByDepth(){
  const palette=["#818cf8","#60a5fa","#34d399","#fbbf24","#f87171","#f472b6","#a78bfa","#2dd4bf"];
  const old=snapshotAccents();
  APPS.forEach(app=>{setAppAccent(app,palette[(app.depth||0)%palette.length]);});
  pushUndo("深さで色分け",()=>restoreAccents(old));
  toast("探索の深さごとに枠を色分けしました（起点は藍）");
}
function clearNodeColors(){
  const old=snapshotAccents();
  APPS.forEach(app=>{setAppAccent(app,"");});
  pushUndo("色分け解除",()=>restoreAccents(old));
  toast("枠の色分けを解除しました");
}

// ─── 項目・関連線の個別削除/復元（詳細パネルから操作） ───
function afterFieldVisibilityChange(app){
  const node = cy.getElementById("a"+app.id);
  if(node.length){
    refreshNodeDisplay(node,app);
    node.data("fieldCount", visibleFieldsForNode(app).length);
  }
  refreshSidebar();
  if(String(activeAppId)===String(app.id)) renderAppDetail(app);
}
function hideFieldFromRow(btn){
  const app = findApp(btn.dataset.app);
  if(!app) return;
  const key = decodeURIComponent(btn.dataset.key || "");
  if(!key) return;
  hiddenFieldKeys.add(key);
  pushUndo("項目非表示",()=>{
    hiddenFieldKeys.delete(key);
    const a=findApp(app.id);
    if(a) afterFieldVisibilityChange(a);
  });
  afterFieldVisibilityChange(app);
  renderAppDetail(app);
  toast("項目を図から隠しました（詳細から戻せます）");
}
function restoreHiddenFields(appId){
  const app = findApp(appId);
  if(!app) return;
  const prefix = String(app.id) + "::";
  let restored = 0;
  [...hiddenFieldKeys].forEach(key=>{
    if(key.indexOf(prefix) === 0){ hiddenFieldKeys.delete(key); restored += 1; }
  });
  afterFieldVisibilityChange(app);
  renderAppDetail(app);
  toast(restored ? ("隠した項目を戻しました: "+restored+"件") : "戻す項目はありません");
}
function restoreAllHiddenFields(){
  const count = hiddenFieldKeys.size;
  hiddenFieldKeys.clear();
  refreshNodeLabels();
  refreshSidebar();
  if(activeAppId){
    const app = findApp(activeAppId);
    if(app) renderAppDetail(app);
  }
  toast(count ? ("隠した項目をすべて戻しました: "+count+"件") : "戻す項目はありません");
}
function toggleRelationEdgeFromRow(btn){
  const edgeId = String(btn.dataset.edge || "");
  const edge = cy.getElementById(edgeId);
  if(!edge.length){ toast("対応する関連線が見つかりません"); return; }
  if(edge.hasClass("rel-manual-hidden")){
    manuallyRemovedEdgeIds.delete(edgeId);
    nodeHiddenEdgeIds.delete(edgeId);
    edge.removeClass("rel-manual-hidden");
    toast("関連線を戻しました");
  }else{
    manuallyRemovedEdgeIds.add(edgeId);
    edge.addClass("rel-manual-hidden");
    toast("関連線を図から削除しました（同じボタンで戻せます）");
  }
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  afterGraphChange();
  refreshOpenDetail();
}
