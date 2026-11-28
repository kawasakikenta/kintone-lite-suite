// ER図ビューアー: 以前に保存した編集済みHTML（以前の版・今の版）から、編集を今の図へ取り込む（「編集 → 編集済みHTMLから取り込む」）。
// 取り込む編集: 手動で追加したアプリ・項目・関連線、アプリの名前と枠の色、項目と関連線の編集、メモ、位置（今の版は表示範囲も）、
// 図からの削除、固定、隠した項目。表示設定（配置・カードの項目・線の種類の表示・線のまとめなど）は今の図のままにする。
// 読み込んだファイルのスクリプトは実行しない。編集の状態の script 要素（id が er-edit-state）の中の文字列から JSON だけを取り出し、
// 形と値を確かめて、知っている項目だけを使う。今の図に無いアプリ・項目・線の編集は「対象外」として件数を示す。
// 関連線は「アプリID と、そのアプリの関連の順番」で名前が付いているため、ファイルに入っている元の図のデータ（const APPS）と
// 今の図の元のデータを、関連の種類・項目・参照先で突き合わせて対応させる（設定の変更で関連の順番が変わっても対応できる）。

const ER_IMPORT_MAX_BYTES=64*1024*1024;
// 1 種類あたりに読む件数の上限（壊れたファイル・巨大なファイルで固まらないようにする）
const ER_IMPORT_LIMIT=20000;
const ER_IMPORT_TEXT_MAX=2000;
const ER_IMPORT_NAME_MAX=200;
const ER_IMPORT_KINDS=["LOOKUP","REF","ACTION"];
// この画面のスクリプト自身の文字列と取り違えないよう、目印は分けて書いてつなぐ
const ER_IMPORT_STATE_TAG="<script id=\"er-"+"edit-state\">";
const ER_IMPORT_STATE_PREFIX="window.__ER_EDIT_"+"STATE__=";
const ER_IMPORT_MAIN_TAG="<script id=\"er-"+"main\" type=\"text/plain\">";
const ER_IMPORT_APPS_PREFIX="const APPS = ";
const ER_IMPORT_SCRIPT_END="</"+"script>";

// ─── ファイルの読み取り（文字列だけを扱う。DOM にもスクリプトにもしない） ───
function readEditedHtmlText(text){
  const source=String(text==null?"":text);
  const at=source.indexOf(ER_IMPORT_STATE_TAG);
  // 編集の状態は図の本体（er-main）の前に置かれる。本体の中の文字列に同じ並びがあっても、それは使わない
  const mainAt=source.indexOf(ER_IMPORT_MAIN_TAG);
  if(at<0||(mainAt>=0&&at>mainAt)) return {error:"編集済みHTMLではありません（編集の内容が見つかりません）。図の画面の「出力 → 編集済みHTMLを保存」で保存したファイルを選んでください"};
  const end=source.indexOf(ER_IMPORT_SCRIPT_END,at);
  let body=source.slice(at+ER_IMPORT_STATE_TAG.length,end<0?source.length:end).trim();
  if(body.indexOf(ER_IMPORT_STATE_PREFIX)!==0) return {error:"編集の内容を読み取れません（ファイルの形が違います）"};
  body=body.slice(ER_IMPORT_STATE_PREFIX.length).trim();
  if(body.charAt(body.length-1)===";") body=body.slice(0,-1);
  let state;
  try{ state=JSON.parse(body); }catch(_){ return {error:"編集の内容を読み取れません（ファイルが壊れている可能性があります）"}; }
  if(!state||typeof state!=="object"||Array.isArray(state)) return {error:"編集の内容を読み取れません（ファイルの形が違います）"};
  return {state,apps:readEditedHtmlApps(source)};
}
// 編集済みHTMLに入っている、元の図のアプリのデータ（関連線の対応付けに使う）。読めなければ null
function readEditedHtmlApps(source){
  const at=source.indexOf(ER_IMPORT_MAIN_TAG);
  if(at<0) return null;
  let start=at+ER_IMPORT_MAIN_TAG.length;
  while(source.charAt(start)==="\n"||source.charAt(start)==="\r") start+=1;
  if(source.indexOf(ER_IMPORT_APPS_PREFIX,start)!==start) return null;
  const lineEnd=source.indexOf("\n",start);
  let json=source.slice(start+ER_IMPORT_APPS_PREFIX.length,lineEnd<0?source.length:lineEnd).trim();
  if(json.charAt(json.length-1)===";") json=json.slice(0,-1);
  try{ const apps=JSON.parse(json); return Array.isArray(apps)?apps:null; }catch(_){ return null; }
}

// ─── 値の確かめ（知っている項目だけを、決まった形にして取り出す） ───
function importText(value,max){
  if(typeof value!=="string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"").slice(0,max||ER_IMPORT_TEXT_MAX);
}
function importColor(value){
  return typeof value==="string"&&/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)?value:"";
}
// アプリID（kintone のアプリは正、手動で追加したアプリは負）
function importAppId(value){
  if(typeof value!=="number"&&typeof value!=="string") return null;
  const s=String(value).trim();
  if(!/^-?\d{1,16}$/.test(s)) return null;
  const n=Number(s);
  return Number.isSafeInteger(n)&&n!==0?n:null;
}
function importPoint(value){
  if(!value||typeof value!=="object") return null;
  const x=value.x, y=value.y;
  return typeof x==="number"&&typeof y==="number"&&Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<1e7&&Math.abs(y)<1e7?{x,y}:null;
}
function importList(value){ return Array.isArray(value)?value.slice(0,ER_IMPORT_LIMIT):[]; }
function importKeys(value){ return value&&typeof value==="object"&&!Array.isArray(value)?Object.keys(value).slice(0,ER_IMPORT_LIMIT):[]; }
function importOwn(record,key){ return Object.prototype.hasOwnProperty.call(record,key)?record[key]:undefined; }
// 図のノードID: アプリは「a + アプリID」、未取得の参照先は「g + 参照先」
function importNodeId(value){
  const s=String(value==null?"":value);
  const m=/^a(-?\d{1,16})$/.exec(s);
  if(m){ const appId=importAppId(m[1]); return appId===null?null:{kind:"app",appId}; }
  if(/^g[0-9A-Za-z_-]{1,40}$/.test(s)) return {kind:"ghost",id:s};
  return null;
}
// 関連線のID: 「e_アプリID_関連の順番」
function importEdgeRef(value){
  const m=/^e_(-?\d{1,16})_(\d{1,6})$/.exec(String(value==null?"":value));
  if(!m) return null;
  const appId=importAppId(m[1]);
  return appId===null?null:{appId,ri:Number(m[2])};
}
// 項目のキー: 「アプリID::項目のパス（またはコード）」
function importFieldRef(value){
  const s=String(value==null?"":value);
  const i=s.indexOf("::");
  if(i<=0) return null;
  const appId=importAppId(s.slice(0,i));
  const path=s.slice(i+2);
  if(appId===null||!path||path.length>ER_IMPORT_TEXT_MAX) return null;
  return {appId,path};
}
function importFieldType(value){ return typeof value==="string"&&/^[A-Z_]{1,40}$/.test(value)?value:""; }
function importField(raw){
  if(!raw||typeof raw!=="object") return null;
  const code=importText(raw.code,ER_IMPORT_NAME_MAX).trim();
  if(!code) return null;
  return {code,label:importText(raw.label,ER_IMPORT_NAME_MAX).trim()||code,type:importFieldType(raw.type)||"SINGLE_LINE_TEXT",
    required:raw.required===true,isPK:raw.isPK===true,unique:raw.unique===true,isLookup:raw.isLookup===true,isRef:raw.isRef===true,isCustom:true};
}
function importFieldPatch(raw){
  const patch={};
  if(!raw||typeof raw!=="object") return patch;
  const label=importText(raw.label,ER_IMPORT_NAME_MAX).trim();
  if(label) patch.label=label;
  const type=importFieldType(raw.type);
  if(type) patch.type=type;
  ["isPK","unique","required","isLookup","isRef"].forEach(key=>{ if(typeof raw[key]==="boolean") patch[key]=raw[key]; });
  return patch;
}
function importRelationPatch(raw){
  const patch={};
  if(!raw||typeof raw!=="object") return patch;
  const fromLabel=importText(raw.fromLabel,ER_IMPORT_NAME_MAX).trim();
  const fromDisplay=importText(raw.fromDisplay,ER_IMPORT_NAME_MAX).trim();
  if(fromLabel) patch.fromLabel=fromLabel;
  if(fromDisplay) patch.fromDisplay=fromDisplay;
  if(ER_IMPORT_KINDS.indexOf(raw.kind)>=0) patch.kind=raw.kind;
  return patch;
}
function importScopeKey(key){
  if(key==="all") return {mode:"all",roots:[],depth:1};
  const m=/^around:([-0-9,]{1,20000}):([12])$/.exec(String(key));
  if(!m) return null;
  const roots=m[1].split(",").map(importAppId);
  if(!roots.length||roots.some(id=>id===null)) return null;
  return {mode:"around",roots,depth:Number(m[2])};
}
function importPositionMap(raw){
  const out=[];
  importKeys(raw).forEach(key=>{
    const node=importNodeId(key);
    const pos=node&&importPoint(importOwn(raw,key));
    if(pos) out.push({node,pos});
  });
  return out;
}

/**
 * 読み込んだ編集の状態（以前の版: stateVersion なし / 今の版: 2）を確かめ、決まった形にする。
 * 形の正しくない値は使わず、件数（invalid）だけを数える。
 */
function sanitizeImportedEditState(raw){
  const state=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  const view=state.view&&typeof state.view==="object"&&!Array.isArray(state.view)?state.view:{};
  const out={
    version:Number(state.stateVersion)>=2?2:1,
    savedAt:typeof state.savedAt==="string"&&!Number.isNaN(Date.parse(state.savedAt))?state.savedAt:"",
    customApps:[],customFields:[],customRelations:[],
    appOverrides:[],fieldOverrides:[],relationOverrides:[],notes:[],
    positions:[],scope:null,scopePositions:[],
    removedNodes:[],removedEdges:[],pinnedNodes:[],hiddenFields:[],
    invalid:0
  };
  importList(state.customApps).forEach(app=>{
    const id=importAppId(app&&app.id);
    const name=importText(app&&app.name,ER_IMPORT_NAME_MAX).trim();
    if(id===null||id>=0||!name){ out.invalid+=1; return; }
    out.customApps.push({id,name,fields:importList(app.fields).slice(0,500).map(importField).filter(Boolean)});
  });
  importList(state.customFields).forEach(item=>{
    const appId=importAppId(item&&item.appId);
    const field=importField(item&&item.field);
    if(appId===null||!field){ out.invalid+=1; return; }
    out.customFields.push({appId,field});
  });
  importList(state.customRelations).forEach(item=>{
    const rel=item&&item.rel;
    const fromAppId=importAppId(item&&item.fromAppId);
    const toApp=importAppId(rel&&rel.toApp);
    const kind=rel&&ER_IMPORT_KINDS.indexOf(rel.kind)>=0?rel.kind:"";
    if(fromAppId===null||toApp===null||!kind){ out.invalid+=1; return; }
    const label=importText(rel.fromLabel,ER_IMPORT_NAME_MAX).trim()||importText(rel.fromDisplay,ER_IMPORT_NAME_MAX).trim()
      ||(kind==="LOOKUP"?"ルックアップ":(kind==="REF"?"関連":"アクション"))+"(手動)";
    out.customRelations.push({fromAppId,toApp,kind,label});
  });
  importKeys(state.appOverrides).forEach(key=>{
    const id=importAppId(key);
    const o=importOwn(state.appOverrides,key);
    if(id===null||!o||typeof o!=="object"){ out.invalid+=1; return; }
    const entry={id};
    const name=importText(o.name,ER_IMPORT_NAME_MAX).trim();
    if(name) entry.name=name;
    if(typeof o.color==="string"){
      const color=importColor(o.color);
      if(color||o.color==="") entry.color=color;
      else out.invalid+=1;
    }
    if(entry.name!==undefined||entry.color!==undefined) out.appOverrides.push(entry);
  });
  importKeys(state.fieldOverrides).forEach(key=>{
    const ref=importFieldRef(key);
    const patch=importFieldPatch(importOwn(state.fieldOverrides,key));
    if(!ref||!Object.keys(patch).length){ out.invalid+=1; return; }
    out.fieldOverrides.push({appId:ref.appId,path:ref.path,patch});
  });
  importKeys(state.relationOverrides).forEach(key=>{
    const ref=importEdgeRef(key);
    const patch=importRelationPatch(importOwn(state.relationOverrides,key));
    if(!ref||!Object.keys(patch).length){ out.invalid+=1; return; }
    out.relationOverrides.push({appId:ref.appId,ri:ref.ri,patch});
  });
  importList(state.notes).forEach(note=>{
    const text=importText(note&&note.text,ER_IMPORT_TEXT_MAX).trim();
    const pos=importPoint(note);
    if(!text||!pos){ out.invalid+=1; return; }
    out.notes.push({text,color:importColor(note.color)||"#fef08a",x:pos.x,y:pos.y});
  });
  out.positions=importPositionMap(view.positions);
  const nodeList=(value)=>importList(value).map(importNodeId).filter(Boolean);
  out.removedNodes=nodeList(view.removedNodeIds);
  out.pinnedNodes=nodeList(view.pinnedNodeIds);
  // アプリを削除したときに一緒に隠した線（nodeHiddenEdgeIds）は、削除したアプリから作り直すので読まない
  out.removedEdges=importList(view.removedEdgeIds).map(importEdgeRef).filter(Boolean);
  out.hiddenFields=importList(view.hiddenFieldKeys).map(importFieldRef).filter(Boolean);
  if(out.version>=2){
    // 今の版は表示範囲と、表示範囲ごとの位置を持つ（以前の版は全体の図だけ）
    const scope=view.scope&&typeof view.scope==="object"?view.scope:null;
    if(scope&&scope.mode==="around"){
      const roots=importList(scope.roots).map(importAppId).filter(id=>id!==null);
      if(roots.length) out.scope={mode:"around",roots,depth:Number(scope.depth)===2?2:1};
    }else if(scope&&scope.mode==="all") out.scope={mode:"all",roots:[],depth:1};
    importKeys(view.scopePositions).forEach(key=>{
      const scopeRef=importScopeKey(key);
      if(scopeRef) out.scopePositions.push({scope:scopeRef,positions:importPositionMap(importOwn(view.scopePositions,key))});
    });
  }
  return out;
}

// ─── 関連線の対応付け ───
// 関連の印: 種類・参照元の項目（関連レコード一覧は表示部品、アクションは名前）・参照先。同じ印が複数あるときは出てくる順で区別する
function relationImportSignature(rel){
  if(!rel||typeof rel!=="object") return "";
  const to=String(rel.toApp==null?"":rel.toApp);
  if(rel.kind==="REF") return "R|"+String(rel.controlFieldPath||rel.controlField||rel.fromPath||rel.from||"")+"|"+to;
  if(rel.kind==="ACTION") return "A|"+String(rel.fromLabel||"")+"|"+to;
  return "L|"+String(rel.fromPath||rel.from||"")+"|"+to;
}
function relationSignatureList(relations){
  const seen=new Map();
  return (Array.isArray(relations)?relations:[]).map(rel=>{
    const sig=relationImportSignature(rel);
    const n=(seen.get(sig)||0)+1;
    seen.set(sig,n);
    return sig+"#"+n;
  });
}
// 元の図のアプリのデータ（id → 関連の印の一覧）。手動で追加したアプリは入らない
function relationSignatureIndex(apps){
  const index=new Map();
  (Array.isArray(apps)?apps:[]).forEach(app=>{
    const id=app&&importAppId(app.id);
    if(id!==null&&id>0&&!index.has(id)) index.set(id,relationSignatureList(app.relations));
  });
  return index;
}
/** 取り込むファイルの「アプリ appId の ri 番目の関連」が、今の図の元のデータの何番目か。対応が無ければ -1 */
function mapImportedRelationIndex(oldIndex,currentIndex,appId,ri){
  const oldSigs=oldIndex&&oldIndex.get(appId);
  const curSigs=currentIndex&&currentIndex.get(appId);
  if(!oldSigs||!curSigs||ri<0||ri>=oldSigs.length) return -1;
  return curSigs.indexOf(oldSigs[ri]);
}
// 今の図の元のデータ（この画面に入っている const APPS。編集で変わる前の名前・種類）
let currentOriginalSignatureIndex=null;
function currentRelationSignatureIndex(){
  if(currentOriginalSignatureIndex) return currentOriginalSignatureIndex;
  const main=document.getElementById("er-main");
  const apps=main?readEditedHtmlApps(ER_IMPORT_MAIN_TAG+(main.textContent||"")):null;
  currentOriginalSignatureIndex=relationSignatureIndex(apps||APPS.filter(a=>!a.isCustom));
  return currentOriginalSignatureIndex;
}

// ─── 今の図へ当てはめる ───
function importedCount(map,key,n){ map[key]=(map[key]||0)+(n===undefined?1:n); }
function maxManualNumber(values,prefix){
  let max=0;
  values.forEach(v=>{ const s=String(v||""); if(s.indexOf(prefix)===0){ const n=Number(s.slice(prefix.length)); if(Number.isSafeInteger(n)&&n>max) max=n; } });
  return max;
}
/**
 * 確かめた編集を今の図へ当てはめ、結果（取り込んだ件数・対象外・すでにあった件数）を返す。
 * 全体を 1 回の「元に戻す」で取り込む前に戻せる。
 */
function applyImportedEditState(clean,fileApps){
  const undo=[];
  const done={}, skipped={}, existing={};
  // 表示範囲・位置は最後に戻す（先に登録し、取り消しでは最後に動く）。手動のアプリの削除・削除の取り消しの後に、表示範囲を数え直す
  const beforePositions=cy.nodes().map(n=>({id:n.id(),pos:Object.assign({},n.position())}));
  const beforeScope={mode:viewScope.mode,roots:viewScope.roots.slice(),depth:viewScope.depth};
  const beforeCache=new Map(scopePositionCache);
  undo.push(()=>{
    setScope(beforeScope,{keepPositions:true});
    scopePositionCache.clear();
    beforeCache.forEach((value,key)=>scopePositionCache.set(key,value));
    beforePositions.forEach(item=>{ const n=cy.getElementById(item.id); if(n.length&&!n.locked()) n.position(item.pos); });
  });
  const missingApps=new Set();
  const oldIndex=fileApps?relationSignatureIndex(fileApps):null;
  const curIndex=currentRelationSignatureIndex();
  const oldRelationCount=(appId)=>{
    if(appId<0) return 0;
    const sigs=oldIndex&&oldIndex.get(appId);
    return sigs?sigs.length:-1;
  };
  // アプリIDの対応（手動で追加したアプリは、今の図で空いている番号に付け直す）
  const appIdMap=new Map();
  const mapApp=(id)=>{
    if(appIdMap.has(id)) return appIdMap.get(id);
    const app=id>0?findApp(id):null;
    const mapped=app&&!app.isCustom?app.id:null;
    appIdMap.set(id,mapped);
    return mapped;
  };
  const noteMissing=(id)=>{ if(id>0) missingApps.add(id); };
  const codeMap=new Map(); // 「元のアプリID::元のコード」→ 付け直したコード
  const edgeMap=new Map(); // 「元のアプリID_元の順番」→ 今の線のID
  const mapNode=(node)=>{
    if(node.kind==="ghost") return cy.getElementById(node.id).length?node.id:null;
    const id=mapApp(node.appId);
    return id===null?null:"a"+id;
  };

  // 1. 手動で追加したアプリ（同じ名前の手動のアプリが今の図にあれば、それに対応させる）
  clean.customApps.forEach(raw=>{
    const same=APPS.find(a=>a.isCustom&&a.name===raw.name);
    if(same){ appIdMap.set(raw.id,same.id); importedCount(existing,"apps"); return; }
    customAppSeq=Math.max(customAppSeq,maxManualNumber(APPS.filter(a=>a.isCustom).map(a=>"m"+(-a.id)),"m"))+1;
    const id=-customAppSeq;
    const fields=raw.fields.map(f=>Object.assign({},f));
    const app={id,name:raw.name,fields,totalFieldCount:fields.length,relations:[],ok:true,depth:0,isCustom:true,
      requiredCount:fields.filter(f=>f.required).length,lookupCount:0,refCount:0};
    registerManualApp(app);
    appIdMap.set(raw.id,id);
    const ext=cy.extent();
    cy.add({group:"nodes",data:{id:"a"+id,label:buildNodeLabel(app),...nodeCardData(app),appId:id,isError:false,isStart:false,inSpace:false,isCustom:true,accent:"",fieldCount:fields.length,relCount:0,depth:0},
      position:{x:(ext.x1+ext.x2)/2,y:(ext.y1+ext.y2)/2}});
    const command={label:"アプリ: "+app.name+" (手動追加)",icon:"⬡",appId:id,action:()=>focusApp(id)};
    commands.push(command);
    importedCount(done,"apps");
    undo.push(()=>{
      const n=cy.getElementById("a"+id);
      if(n.length) cy.remove(n);
      const at=APPS.indexOf(app);
      if(at>=0) APPS.splice(at,1);
      appMap.delete(id);
      if(scopeMembers) scopeMembers.delete("a"+id);
      const c=commands.indexOf(command);
      if(c>=0) commands.splice(c,1);
      if(String(activeAppId)===String(id)) closeDetail();
    });
  });

  // 2. 手動で追加した項目（同じ名前・種類の手動の項目があれば取り込まない。コードが重なるときは付け直す）
  clean.customFields.forEach(item=>{
    const appId=mapApp(item.appId);
    const app=appId===null?null:findApp(appId);
    if(!app){ importedCount(skipped,"fields"); noteMissing(item.appId); return; }
    const list=Array.isArray(app.allFields)?app.allFields:(app.fields||[]);
    const same=list.find(f=>f&&f.isCustom&&f.label===item.field.label&&f.type===item.field.type);
    if(same){ codeMap.set(item.appId+"::"+item.field.code,same.code); importedCount(existing,"fields"); return; }
    const field=Object.assign({},item.field);
    if(list.some(f=>f&&(f.code===field.code||f.path===field.code))){
      customFieldSeq=Math.max(customFieldSeq,maxManualNumber(list.map(f=>f&&f.code),"manual_"))+1;
      field.code="manual_"+customFieldSeq;
    }
    codeMap.set(item.appId+"::"+item.field.code,field.code);
    applyManualFieldData(app,field);
    importedCount(done,"fields");
    undo.push(()=>{
      [app.fields,app.allFields].forEach(fields=>{ if(!Array.isArray(fields)) return; const at=fields.indexOf(field); if(at>=0) fields.splice(at,1); });
      if(typeof app.totalFieldCount==="number") app.totalFieldCount=Math.max(0,app.totalFieldCount-1);
      if(field.required) app.requiredCount=Math.max(0,(app.requiredCount||0)-1);
    });
  });
  // 手動で追加した項目が、手動で追加したアプリの項目の中で重なったときのコードの対応も持つ
  clean.customApps.forEach(raw=>{ raw.fields.forEach(f=>{ const key=raw.id+"::"+f.code; if(!codeMap.has(key)) codeMap.set(key,f.code); }); });

  // 3. 手動で追加した関連線
  const customRelationOrder=new Map(); // 元のアプリID → そのアプリの手動の関連線の数（順番の対応付けに使う）
  clean.customRelations.forEach(item=>{
    const k=customRelationOrder.get(item.fromAppId)||0;
    customRelationOrder.set(item.fromAppId,k+1);
    const fromId=mapApp(item.fromAppId), toId=mapApp(item.toApp);
    const from=fromId===null?null:findApp(fromId), to=toId===null?null:findApp(toId);
    const base=oldRelationCount(item.fromAppId);
    const oldKey=base>=0?item.fromAppId+"_"+(base+k):"";
    if(!from||!to){ importedCount(skipped,"relations"); if(!from) noteMissing(item.fromAppId); if(!to) noteMissing(item.toApp); return; }
    const sameIndex=from.relations.findIndex(r=>r&&r.isCustom&&String(r.toApp)===String(to.id)&&r.kind===item.kind&&(r.fromLabel===item.label||r.fromDisplay===item.label));
    if(sameIndex>=0){ if(oldKey) edgeMap.set(oldKey,"e_"+from.id+"_"+sameIndex); importedCount(existing,"relations"); return; }
    customRelSeq=Math.max(customRelSeq,maxManualNumber(from.relations.map(r=>r&&r.from),"__MANUAL__"))+1;
    const rel={from:"__MANUAL__"+customRelSeq,fromLabel:item.label,fromDisplay:item.label,toApp:to.id,toField:"",kind:item.kind,isCustom:true};
    const relIndex=from.relations.length;
    applyManualRelationData(from,rel);
    const edgeId="e_"+from.id+"_"+relIndex;
    cy.add({group:"edges",data:{id:edgeId,source:"a"+from.id,target:"a"+to.id,kind:item.kind,label:edgeDisplayLabel(item.label),fromLabel:item.label,fromDisplay:item.label,isCustom:true,bundleCount:1,bundleWidth:1.8}});
    if(oldKey) edgeMap.set(oldKey,edgeId);
    importedCount(done,"relations");
    undo.push(()=>{
      const at=from.relations.indexOf(rel);
      if(at>=0) from.relations.splice(at,1);
      if(rel.kind==="LOOKUP") from.lookupCount=Math.max(0,(from.lookupCount||0)-1);
      if(rel.kind==="REF") from.refCount=Math.max(0,(from.refCount||0)-1);
      const e=cy.getElementById(edgeId);
      if(e.length) cy.remove(e);
    });
  });
  // 元のファイルの線（アプリID と順番）→ 今の図の線のID
  const mapEdge=(ref)=>{
    const key=ref.appId+"_"+ref.ri;
    if(edgeMap.has(key)) return edgeMap.get(key);
    const appId=mapApp(ref.appId);
    if(appId===null||ref.appId<0) return null;
    const ri=mapImportedRelationIndex(oldIndex,curIndex,ref.appId,ref.ri);
    if(ri<0) return null;
    const edgeId="e_"+appId+"_"+ri;
    return cy.getElementById(edgeId).length?edgeId:null;
  };

  // 4. アプリの名前・枠の色
  clean.appOverrides.forEach(o=>{
    const appId=mapApp(o.id);
    const app=appId===null?null:findApp(appId);
    if(!app){ importedCount(skipped,"appEdits"); noteMissing(o.id); return; }
    const node=cy.getElementById("a"+app.id);
    const before={name:app.name,entry:Object.prototype.hasOwnProperty.call(appOverrides,app.id)?Object.assign({},appOverrides[app.id]):undefined,accent:node.length?node.data("accent"):""};
    const name=o.name!==undefined?o.name:app.name;
    const color=o.color!==undefined?o.color:appAccentColor(app);
    if(name===app.name&&color===appAccentColor(app)){ importedCount(existing,"appEdits"); return; }
    applyAppOverride(app,name,color);
    importedCount(done,"appEdits");
    undo.push(()=>{
      app.name=before.name;
      if(before.entry===undefined) delete appOverrides[app.id]; else appOverrides[app.id]=before.entry;
      const n=cy.getElementById("a"+app.id);
      if(n.length){ n.data("accent",before.accent||""); refreshNodeDisplay(n,app); }
      commands.forEach(c=>{ if(c.appId!==undefined&&String(c.appId)===String(app.id)) c.label="アプリ: "+before.name+(app.isCustom?" (手動追加)":" (ID:"+app.id+")"); });
    });
  });

  // 5. 項目の編集（名前・種類・区分）
  const mapFieldKey=(ref)=>{
    const appId=mapApp(ref.appId);
    if(appId===null) return null;
    const code=codeMap.get(ref.appId+"::"+ref.path);
    return {appId,key:appId+"::"+(code||ref.path)};
  };
  clean.fieldOverrides.forEach(o=>{
    const ref=mapFieldKey(o);
    const app=ref&&findApp(ref.appId);
    const field=app&&findFieldByKey(app,ref.key);
    if(!field){ importedCount(skipped,"fieldEdits"); if(!app) noteMissing(o.appId); return; }
    const beforeField={}, keys=Object.keys(o.patch);
    keys.forEach(k=>{ beforeField[k]=field[k]; });
    const beforeEntry=Object.prototype.hasOwnProperty.call(fieldOverrides,ref.key)?Object.assign({},fieldOverrides[ref.key]):undefined;
    if(keys.every(k=>field[k]===o.patch[k])){ importedCount(existing,"fieldEdits"); return; }
    Object.assign(field,o.patch);
    fieldOverrides[ref.key]=Object.assign({},fieldOverrides[ref.key],o.patch);
    importedCount(done,"fieldEdits");
    undo.push(()=>{
      keys.forEach(k=>{ if(beforeField[k]===undefined) delete field[k]; else field[k]=beforeField[k]; });
      if(beforeEntry===undefined) delete fieldOverrides[ref.key]; else fieldOverrides[ref.key]=beforeEntry;
    });
  });

  // 6. 関連線の編集（名前・種類）
  clean.relationOverrides.forEach(o=>{
    const edgeId=mapEdge(o);
    const ref=edgeId&&parseEdgeId(edgeId);
    const app=ref&&findApp(ref.appId);
    const rel=app&&(app.relations||[])[ref.ri];
    if(!rel){ importedCount(skipped,"relationEdits"); if(mapApp(o.appId)===null) noteMissing(o.appId); return; }
    const keys=Object.keys(o.patch);
    if(keys.every(k=>rel[k]===o.patch[k])){ importedCount(existing,"relationEdits"); return; }
    const beforeRel={}; keys.forEach(k=>{ beforeRel[k]=rel[k]; });
    const beforeEntry=Object.prototype.hasOwnProperty.call(relationOverrides,edgeId)?Object.assign({},relationOverrides[edgeId]):undefined;
    applyRelationOverride(app,edgeId,ref.ri,o.patch);
    importedCount(done,"relationEdits");
    undo.push(()=>{
      keys.forEach(k=>{ if(beforeRel[k]===undefined) delete rel[k]; else rel[k]=beforeRel[k]; });
      if(beforeEntry===undefined) delete relationOverrides[edgeId]; else relationOverrides[edgeId]=beforeEntry;
      const e=cy.getElementById(edgeId);
      if(e.length){ e.data("kind",rel.kind); e.data("label",edgeDisplayLabel(rel.fromDisplay||rel.fromLabel||"")); e.data("fromLabel",rel.fromLabel); e.data("fromDisplay",rel.fromDisplay||rel.fromLabel||""); }
    });
  });

  // 7. 図からの削除（アプリと一緒に、そのアプリの線も隠す）・固定・隠した項目
  const removeNodeIds=new Set();
  clean.removedNodes.forEach(node=>{
    const id=mapNode(node);
    if(!id||!cy.getElementById(id).length){ importedCount(skipped,"removed"); if(node.kind==="app") noteMissing(node.appId); return; }
    if(manuallyRemovedNodeIds.has(id)){ importedCount(existing,"removed"); return; }
    removeNodeIds.add(id);
  });
  removeNodeIds.forEach(id=>{
    const node=cy.getElementById(id);
    const hiddenEdges=[];
    manuallyRemovedNodeIds.add(id);
    node.addClass("app-manual-hidden");
    node.connectedEdges().forEach(edge=>{
      if(nodeHiddenEdgeIds.has(edge.id())) return;
      nodeHiddenEdgeIds.add(edge.id());
      hiddenEdges.push({id:edge.id(),had:edge.hasClass("rel-manual-hidden")});
      edge.addClass("rel-manual-hidden");
    });
    importedCount(done,"removedApps");
    undo.push(()=>{
      manuallyRemovedNodeIds.delete(id);
      const n=cy.getElementById(id);
      if(n.length) n.removeClass("app-manual-hidden");
      hiddenEdges.forEach(h=>{ nodeHiddenEdgeIds.delete(h.id); const e=cy.getElementById(h.id); if(e.length&&!h.had&&!manuallyRemovedEdgeIds.has(h.id)) e.removeClass("rel-manual-hidden"); });
    });
  });
  clean.removedEdges.forEach(ref=>{
    const edgeId=mapEdge(ref);
    if(!edgeId){ importedCount(skipped,"removed"); if(mapApp(ref.appId)===null) noteMissing(ref.appId); return; }
    if(manuallyRemovedEdgeIds.has(edgeId)){ importedCount(existing,"removed"); return; }
    const edge=cy.getElementById(edgeId);
    const had=edge.hasClass("rel-manual-hidden");
    manuallyRemovedEdgeIds.add(edgeId);
    edge.addClass("rel-manual-hidden");
    importedCount(done,"removedRelations");
    undo.push(()=>{ manuallyRemovedEdgeIds.delete(edgeId); const e=cy.getElementById(edgeId); if(e.length&&!had&&!nodeHiddenEdgeIds.has(edgeId)) e.removeClass("rel-manual-hidden"); });
  });
  clean.pinnedNodes.forEach(node=>{
    const id=mapNode(node);
    const n=id&&cy.getElementById(id);
    if(!n||!n.length){ importedCount(skipped,"pins"); if(node.kind==="app") noteMissing(node.appId); return; }
    if(pinnedNodeIds.has(id)){ importedCount(existing,"pins"); return; }
    // 位置を当てはめてから固定する（固定したアプリは動かせないため、ここでは印だけ付けておく）
    importedCount(done,"pins");
    undo.push(()=>{ const m=cy.getElementById(id); if(m.length) unpinNode(m,true); });
  });
  clean.hiddenFields.forEach(ref=>{
    const mapped=mapFieldKey(ref);
    const app=mapped&&findApp(mapped.appId);
    if(!app||!findFieldByKey(app,mapped.key)){ importedCount(skipped,"hiddenFields"); if(!app) noteMissing(ref.appId); return; }
    if(hiddenFieldKeys.has(mapped.key)){ importedCount(existing,"hiddenFields"); return; }
    hiddenFieldKeys.add(mapped.key);
    importedCount(done,"hiddenFields");
    undo.push(()=>{ hiddenFieldKeys.delete(mapped.key); });
  });

  // 8. 表示範囲と位置（今の版: 保存したときの表示範囲。以前の版: 全体）。位置の無いアプリは、取り込んだ位置の下に並べる
  const mapScope=(scope)=>{
    if(!scope||scope.mode!=="around") return {mode:"all",roots:[],depth:1};
    const roots=scope.roots.map(id=>id<0?(appIdMap.has(id)?appIdMap.get(id):null):mapApp(id)).filter(id=>id!==null).map(String);
    return roots.length?{mode:"around",roots,depth:scope.depth}:{mode:"all",roots:[],depth:1};
  };
  const mapPositions=(list)=>{
    const out=new Map();
    list.forEach(item=>{ const id=mapNode(item.node); if(id) out.set(id,item.pos); });
    return out;
  };
  const targetScope=mapScope(clean.version>=2?clean.scope:null);
  // 表示範囲を切り替えてから（切り替えで今の位置を覚え直すため）、保存した表示範囲ごとの位置を入れる
  setScope(targetScope,{keepPositions:true});
  clean.scopePositions.forEach(entry=>{
    const scope=mapScope(entry.scope);
    if(entry.scope.mode==="around"&&scope.mode!=="around") return;
    const positions={};
    mapPositions(entry.positions).forEach((pos,id)=>{ positions[id]={x:pos.x,y:pos.y}; });
    if(Object.keys(positions).length) scopePositionCache.set(scopeKeyOf(scope),positions);
  });
  const positions=mapPositions(clean.positions);
  const placed=new Set();
  positions.forEach((pos,id)=>{
    const n=cy.getElementById(id);
    if(!n.length||n.hasClass("note-node")||n.locked()) return;
    n.position({x:pos.x,y:pos.y});
    placed.add(id);
  });
  const visible=cy.nodes().filter(n=>!n.hasClass("note-node")&&!n.hasClass("scope-out")&&!n.hasClass("app-manual-hidden"));
  const placedVisible=visible.filter(n=>placed.has(n.id()));
  const rest=visible.filter(n=>!placed.has(n.id())&&!n.locked());
  let arranged=0;
  if(placedVisible.length&&rest.length){
    const box=placedVisible.boundingBox();
    const width=Math.max(box.w,1200);
    let x=box.x1, y=box.y2+160, rowH=0;
    rest.forEach(n=>{
      const span=nodeSpan(n);
      if(x>box.x1&&x+span.w>box.x1+width){ x=box.x1; y+=rowH+80; rowH=0; }
      n.position({x:x+span.w/2,y:y+span.h/2});
      x+=span.w+80;
      rowH=Math.max(rowH,span.h);
      arranged+=1;
    });
  }
  if(placed.size) importedCount(done,"positions",placed.size);
  const unplaced=clean.positions.length-positions.size;
  if(unplaced>0) importedCount(skipped,"positions",unplaced);
  clean.positions.forEach(item=>{ if(item.node.kind==="app"&&!mapNode(item.node)) noteMissing(item.node.appId); });
  clean.pinnedNodes.forEach(node=>{ const id=mapNode(node); const n=id&&cy.getElementById(id); if(n&&n.length&&!pinnedNodeIds.has(id)) pinNode(n,true); });

  // 9. メモ（同じ内容・同じ位置のメモがあれば取り込まない）
  const notes=cy.nodes(".note-node");
  clean.notes.forEach(note=>{
    const same=notes.some(n=>n.data("label")===note.text&&Math.abs(n.position("x")-note.x)<1&&Math.abs(n.position("y")-note.y)<1);
    if(same){ importedCount(existing,"notes"); return; }
    noteSeq=Math.max(noteSeq,maxManualNumber(cy.nodes(".note-node").map(n=>n.id()),"note_"))+1;
    const id="note_"+noteSeq;
    addNoteElement({id,text:note.text,color:note.color,x:note.x,y:note.y});
    importedCount(done,"notes");
    undo.push(()=>{ const n=cy.getElementById(id); if(n.length) cy.remove(n); });
  });

  customFieldSeq=Math.max(customFieldSeq,maxManualNumber([].concat(...APPS.map(a=>(a.allFields||a.fields||[]).map(f=>f&&f.code))),"manual_"));
  refreshAfterEditImport();
  fit();
  return {done,skipped,existing,missingApps:[...missingApps].sort((a,b)=>a-b),arranged,scope:targetScope,undo};
}
// 取り込み・取り込みの取り消しのあとに、カード・線・一覧・表を合わせる
function refreshAfterEditImport(){
  invalidateRelationCounts();
  APPS.forEach(app=>{
    const n=cy.getElementById("a"+app.id);
    if(n.length){ n.data("relCount",(app.relations||[]).length); n.data("fieldCount",visibleFieldsForNode(app).length); }
  });
  refreshNodeLabels();
  refreshNodeCards();
  if(scopeMembers) applyScopeClasses();
  applyRelationFilter();
  applyRelationLabelVisibility();
  if(semanticZoomActive) applySemanticZoom(cy.zoom(),true);
  if(focusMode&&currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId),true);
  recomputeErAnalysis();
  afterGraphChange();
  refreshSidebar();
  refreshOpenDetail();
}

// ─── 結果の説明 ───
const ER_IMPORT_LABELS=[
  ["apps","手動で追加したアプリ"],["fields","手動で追加した項目"],["relations","手動で追加した関連線"],
  ["appEdits","アプリの名前・枠の色"],["fieldEdits","項目の編集"],["relationEdits","関連線の編集"],["notes","メモ"],
  ["positions","位置"],["removedApps","図から削除したアプリ"],["removedRelations","図から削除した関連線"],["removed","図からの削除"],
  ["pins","固定"],["hiddenFields","隠した項目"]
];
function sumImportCounts(map){ return Object.keys(map).reduce((s,k)=>s+map[k],0); }
function describeEditImport(result,meta){
  const lines=[];
  lines.push("取り込んだファイル: "+(meta.fileName||"-")+"（"+(meta.version>=2?"今の版":"以前の版")+"の編集済みHTML）");
  if(meta.savedAt) lines.push("保存した日時: "+new Date(meta.savedAt).toLocaleString("ja-JP"));
  lines.push("");
  const doneTotal=sumImportCounts(result.done);
  lines.push(doneTotal?"取り込んだ編集":"取り込んだ編集はありません");
  ER_IMPORT_LABELS.forEach(([key,label])=>{ if(result.done[key]) lines.push("- "+label+": "+result.done[key]+" 件"); });
  if(result.arranged) lines.push("- ファイルに位置が無いアプリ "+result.arranged+" 件は、取り込んだ位置の下に並べました");
  lines.push("表示範囲: "+(result.scope.mode==="all"?"全体":"保存したときの範囲（"+result.scope.roots.map(id=>{const a=findApp(id);return a?a.name:"App "+id;}).join("、")+" のまわり・深さ "+result.scope.depth+"）")
    +(meta.version>=2?"":"（以前の版は全体の図だけを保存しています）"));
  const skippedTotal=sumImportCounts(result.skipped);
  if(skippedTotal){
    lines.push("");
    lines.push("対象外: "+skippedTotal+" 件（今の図に無いアプリ・項目・関連線の編集）");
    ER_IMPORT_LABELS.forEach(([key,label])=>{ if(result.skipped[key]) lines.push("- "+label+": "+result.skipped[key]+" 件"); });
    if(result.missingApps.length) lines.push("- 今の図に無いアプリ: "+result.missingApps.slice(0,10).map(id=>"App "+id).join("、")+(result.missingApps.length>10?" ほか "+(result.missingApps.length-10)+" 件":""));
  }
  const existingTotal=sumImportCounts(result.existing);
  if(existingTotal) lines.push("同じ内容が今の図にあったため取り込まなかった編集: "+existingTotal+" 件");
  if(meta.invalid) lines.push("形が正しくないため読まなかった値: "+meta.invalid+" 件");
  if(!meta.hasApps) lines.push("ファイルに元の図のデータが無いため、kintone の関連線の編集・削除は対応付けられませんでした");
  lines.push("");
  lines.push("表示設定（配置・カードの項目・線の種類・線のまとめなど）は今の図のままです。「元に戻す」（Ctrl+Z）で取り込む前に戻せます。残すには「出力 → 編集済みHTMLを保存」。");
  return {text:lines.join("\n"),doneTotal,skippedTotal,existingTotal};
}

/** 編集済みHTMLの文字列から編集を取り込む。結果の説明を返す（失敗したときは error）。 */
function importEditedHtmlText(text,fileName){
  const read=readEditedHtmlText(text);
  if(read.error) return {error:read.error};
  const clean=sanitizeImportedEditState(read.state);
  const result=applyImportedEditState(clean,read.apps);
  const undo=result.undo;
  if(sumImportCounts(result.done)){
    pushUndo("編集済みHTMLの取り込み",()=>{
      for(let i=undo.length-1;i>=0;i--){ try{ undo[i](); }catch(err){ console.error("[ER] 取り込みの取り消しに失敗",err); } }
      refreshAfterEditImport();
      fit();
    });
  }
  return describeEditImport(result,{fileName,version:clean.version,savedAt:clean.savedAt,invalid:clean.invalid,hasApps:!!read.apps});
}
function openEditImport(){
  closeAllMenus();
  const input=document.getElementById("edit-import-file");
  if(!input){ toast("この画面では取り込めません"); return; }
  input.value="";
  input.click();
}
async function importEditedHtmlFile(file){
  if(!file) return;
  if(file.size>ER_IMPORT_MAX_BYTES){ toast("ファイルが大きすぎます（64MB まで）。編集済みHTMLか確認してください"); return; }
  try{
    const text=await file.text();
    const result=importEditedHtmlText(text,file.name);
    if(result.error){ toast(result.error); return; }
    toast(result.doneTotal?("編集を取り込みました: "+result.doneTotal+" 件"+(result.skippedTotal?"（対象外 "+result.skippedTotal+" 件）":"")):"取り込める編集はありませんでした");
    openModal("編集済みHTMLから取り込みました",result.text,exportFilename("ER図_取り込み結果","txt"));
  }catch(err){
    console.error("[ER] 編集済みHTMLの取り込みに失敗",err);
    toast("取り込みに失敗しました: "+((err&&err.message)||err));
  }
}
(function(){
  const input=document.getElementById("edit-import-file");
  // 同じファイルをもう一度選んでも取り込めるよう、読んだら選択を空に戻す
  if(input) input.addEventListener("change",()=>{ const file=input.files&&input.files[0]; input.value=""; importEditedHtmlFile(file); });
})();
