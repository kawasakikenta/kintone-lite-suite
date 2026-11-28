// ER図ビューアー: データ・カード・図の描画・配置・表示範囲・関連線の表示。
// buildHTML（tabs/er.ts）が viewer-*.js をこの順につないで <script id="er-main" type="text/plain"> へ埋め込む。
// 先頭で APPS・ER_OPTIONS・ER_ANALYSIS・FIELD_TYPE_JP_LABEL・ER_MD_MERMAID_MAX_CHARS が定義される。
// 起動処理（配置・表示範囲・パネルの描画）は viewer-boot.js にまとめ、各ファイルの最上位では関数と状態だけを定義する。
const appMap = new Map(APPS.map(a=>[a.id,a]));
const ER_LAYOUT_NAMES = new Set(["dagre","breadthfirst","cose","concentric","grid","circle"]);
const ER_DENSITY_NAMES = new Set(["none","compact","standard","full"]);
// cytoscape-dagre 2.5.0 は別に同梱した dagre 0.8.5（window.dagre）を使うため、両方がそろったときだけ「階層」の配置を使う
const ER_DAGRE_READY = typeof window.cytoscapeDagre === "function" && !!(window.dagre && window.dagre.graphlib && window.dagre.graphlib.Graph);
function normalizeLayoutName(name){
  const normalized=String(name||"").trim();
  const selected=ER_LAYOUT_NAMES.has(normalized)?normalized:"dagre";
  return selected==="dagre"&&!ER_DAGRE_READY?"cose":selected;
}
function normalizeDensityName(name){
  const normalized=String(name||"").trim();
  return ER_DENSITY_NAMES.has(normalized)?normalized:"standard";
}
// 「編集済みHTMLを保存」で埋め込まれた編集状態（手動追加・配置・表示設定）。以前の版で保存した形式（stateVersion なし）の中身もそのまま読む。
// 状態は実行しない JSON の script 要素（type="application/json"）に置く。CSP で許可するスクリプトは保存しても変わらない
const ER_EDIT_STATE = readEmbeddedEditState();
function readEmbeddedEditState(){
  const el=document.getElementById("er-edit-state");
  if(!el||String(el.getAttribute("type")||"").toLowerCase()!=="application/json") return null;
  try{
    const state=JSON.parse(el.textContent||"");
    return state&&typeof state==="object"&&!Array.isArray(state)?state:null;
  }catch(err){
    console.error("[ER] 保存した編集状態を読み取れません",err);
    return null;
  }
}
if(ER_EDIT_STATE && ER_EDIT_STATE.options){
  if(ER_EDIT_STATE.options.layoutName) ER_OPTIONS.layoutName = normalizeLayoutName(ER_EDIT_STATE.options.layoutName);
  if(ER_EDIT_STATE.options.fieldDensity) ER_OPTIONS.fieldDensity = normalizeDensityName(ER_EDIT_STATE.options.fieldDensity);
}
ER_OPTIONS.layoutName=normalizeLayoutName(ER_OPTIONS.layoutName);
ER_OPTIONS.fieldDensity=normalizeDensityName(ER_OPTIONS.fieldDensity);
if (ER_DAGRE_READY) cytoscape.use(window.cytoscapeDagre);

// ─── Toast ───
let toastTimer=0;
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2400);}
function escapeHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// ─── 配色 ───
// 開いたときは OS の設定に従う。切り替えはこの画面を開いている間だけ有効（保存しない）
let isDark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
function readCssVar(name, fallback){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function currentPalette(){
  return {
    text: readCssVar("--text", isDark ? "#e2e8f0" : "#0f172a"),
    dim: readCssVar("--dim", isDark ? "#a3b1c6" : "#475569"),
    accent: readCssVar("--accent", isDark ? "#60a5fa" : "#2563eb"),
    accent2: readCssVar("--accent2", isDark ? "#a5b4fc" : "#4338ca"),
    lookup: readCssVar("--lookup", isDark ? "#60a5fa" : "#1d4ed8"),
    ref: readCssVar("--ref", isDark ? "#34d399" : "#047857"),
    pk: readCssVar("--pk", isDark ? "#fcd34d" : "#92400e"),
    req: readCssVar("--req", isDark ? "#f87171" : "#b91c1c"),
    action: readCssVar("--action", isDark ? "#fbbf24" : "#b45309"),
    bg: readCssVar("--bg", isDark ? "#0b1220" : "#f1f5f9"),
    canvas: readCssVar("--canvas", isDark ? "#0f172a" : "#f8fafc"),
    surface: readCssVar("--surface", isDark ? "#111827" : "#ffffff"),
    surface2: readCssVar("--surface2", isDark ? "#1e293b" : "#f1f5f9"),
    border: readCssVar("--border-strong", isDark ? "#475569" : "#cbd5e1")
  };
}
function formatFieldDensityLabel(density){
  const map = { none:"結合のみ", compact:"コンパクト", standard:"標準", full:"詳細" };
  return map[density] || density || "-";
}
function fieldIconForLabel(f){
  if(f.isPK) return "🔑";
  if(f.isLookup) return "🔗";
  if(f.isRef) return "📋";
  if(f.unique) return "🔒";
  if(f.type==="SUBTABLE") return "📦";
  if(f.inSubtable) return "↳";
  if(f.required) return "•";
  return "·";
}
// kintone API のフィールド ENUM を日本語化（ER 図側パネル表示用）
function fieldTypeJpLabel(type){
  if(!type) return "-";
  const key = String(type).trim().toUpperCase();
  return FIELD_TYPE_JP_LABEL[key] || type;
}
// 手動で非表示にした項目キーの集合（"アプリID::path|code"）
const hiddenFieldKeys = new Set();
function fieldHideKey(app, field){
  return String(app.id) + "::" + String(field.path || field.code || field.label || "");
}
function isFieldHidden(app, field){
  return hiddenFieldKeys.has(fieldHideKey(app, field));
}
function hiddenFieldCount(app){
  return allFieldsForApp(app).filter(f=>isFieldHidden(app, f)).length;
}
function allFieldsForApp(app){
  const fields = Array.isArray(app&&app.allFields) ? app.allFields : (Array.isArray(app&&app.fields) ? app.fields : []);
  return fields.filter(f=>f&&f.type!=="SUBTABLE"&&(ER_OPTIONS.includeSubtableFields||!f.inSubtable));
}
function fieldsForDensity(app){
  if(ER_OPTIONS.fieldDensity==="none") return [];
  const candidates=allFieldsForApp(app);
  const linked=new Set();
  (app.relations||[]).forEach(r=>{
    if(r.kind!=="LOOKUP"&&r.kind!=="REF") return;
    [r.fromPath,r.from,r.controlFieldPath,r.controlField].forEach(v=>{const key=String(v||"").trim();if(key) linked.add(key);});
  });
  const essential=f=>f.isPK||f.unique||f.isLookup||f.isRef||linked.has(String(f.path||""))||linked.has(String(f.code||""));
  let selected;
  if(ER_OPTIONS.fieldDensity==="full") selected=candidates;
  else if(ER_OPTIONS.fieldDensity==="standard"){
    selected=candidates.filter(f=>essential(f)||f.required);
    if(!selected.length) selected=candidates.slice(0,6);
  }else{
    selected=candidates.filter(essential);
    if(!selected.length) selected=candidates.slice(0,6);
  }
  const limit=Math.max(0,Number(ER_OPTIONS.maxFields)||220);
  return selected.slice(0,limit);
}
function visibleFieldsForNode(app){
  return fieldsForDensity(app).filter(f=>!isFieldHidden(app, f));
}
function buildFieldDisplayName(field){
  if(!field) return "";
  if(field.inSubtable && field.tableLabel) return field.tableLabel + " > " + (field.label || field.code || "");
  return field.label || field.code || field.path || "";
}
function fieldPrefixForNodeLabel(field){
  if(field.isPK) return "PK";
  if(field.isLookup) return "FK";
  if(field.isRef) return "関連";
  if(field.required) return "必須";
  if(field.type === "SUBTABLE") return "表";
  if(field.inSubtable) return "↳";
  return "・";
}
function buildFieldPreviewLine(field){
  const label = buildFieldDisplayName(field).trim();
  const code = String(field.code || "").trim();
  const type = String(field.type || "").trim();
  const prefix = fieldPrefixForNodeLabel(field);
  if(ER_OPTIONS.fieldDensity === "compact"){
    return prefix + " " + label;
  }
  if(ER_OPTIONS.fieldDensity === "full"){
    const extras = [];
    if(code && code !== label) extras.push("[" + code + "]");
    if(type) extras.push(fieldTypeJpLabel(type));
    return prefix + " " + label + (extras.length ? " • " + extras.join(" • ") : "");
  }
  return prefix + " " + label + (code && code !== label ? " [" + code + "]" : "");
}
// 起点の目印は、起点がアプリ全体の半分に満たないときだけ付ける（全アプリが起点の図では、全カードに付いて区別の役に立たない）
const startAppIdSet = new Set((ER_OPTIONS.startAppIds || []).map((id)=>String(id)).filter(Boolean));
function startMarksEnabled(){
  const fetched=APPS.filter(a=>!a.isCustom).length;
  return startAppIdSet.size>0&&startAppIdSet.size*2<=fetched;
}
function isMarkedStartApp(app){
  return !!app&&!app.isCustom&&startAppIdSet.has(String(app.id))&&startMarksEnabled();
}
function isFailedApp(app){ return !!app&&(app.ok===false||app.status==="failed"); }
function isPartialApp(app){ return !!app&&!isFailedApp(app)&&app.status==="partial"; }
// 参照される数（ほかのアプリ・自分自身からこのアプリへの関連の本数）
let incomingCountCache=null;
function incomingRelationCount(appId){
  if(!incomingCountCache){
    incomingCountCache=new Map();
    APPS.forEach(a=>(a.relations||[]).forEach(r=>{const key=String(r.toApp);incomingCountCache.set(key,(incomingCountCache.get(key)||0)+1);}));
  }
  return incomingCountCache.get(String(appId))||0;
}
function invalidateRelationCounts(){ incomingCountCache=null; }
function appStatusLabel(app){
  if(isFailedApp(app)) return "取得失敗";
  if(isPartialApp(app)) return "一部取得";
  return "取得完了";
}
// カードの見出しに付ける目印（色だけに頼らず、文字で示す）
function appCardBadges(app,palette){
  const badges=[];
  if(isFailedApp(app)) badges.push({text:"⚠ 取得失敗",color:palette.req});
  else if(isPartialApp(app)) badges.push({text:"△ 一部取得",color:palette.action});
  if(app.isGhost) badges.push({text:"？ 未取得",color:palette.dim});
  if(isMarkedStartApp(app)) badges.push({text:"起点",color:palette.accent});
  if(app.isCustom) badges.push({text:"手動",color:palette.accent2});
  return badges;
}
function appMetaText(app,fieldsShown){
  if(app.isGhost) return "App "+app.id+" ・ 図の外の参照先";
  const total=typeof app.totalFieldCount==="number"?app.totalFieldCount:(fieldsShown!=null?fieldsShown:allFieldsForApp(app).length);
  const fieldText=fieldsShown!=null&&total>fieldsShown?fieldsShown+"/"+total+"項目":total+"項目";
  const out=(app.relations||[]).length, inc=incomingRelationCount(app.id);
  const parts=[app.isCustom?"手動追加":"App "+app.id, fieldText];
  if(!out&&!inc) parts.push("関連なし");
  else parts.push("参照 "+out+" ・ 被参照 "+inc);
  return parts.join(" ・ ");
}
function nodeCardContent(app){
  const limits = { none: 0, compact: 6, standard: 10, full: 16 };
  const maxLines = limits[ER_OPTIONS.fieldDensity] !== undefined ? limits[ER_OPTIONS.fieldDensity] : limits.standard;
  const fields = visibleFieldsForNode(app);
  const ordered = fields.slice().sort((a,b)=>{
    const score = (f)=> (f.isPK ? 0 : (f.isLookup ? 1 : (f.isRef ? 2 : (f.required ? 3 : (f.inSubtable ? 5 : 4)))));
    const diff = score(a) - score(b);
    if(diff !== 0) return diff;
    return String(buildFieldDisplayName(a) || a.code || '').localeCompare(String(buildFieldDisplayName(b) || b.code || ''));
  });
  const shown = maxLines > 0 ? ordered.slice(0, maxLines) : [];
  const moreCount = maxLines > 0 ? Math.max(0, ordered.length - maxLines) : 0;
  const meta = appMetaText(app, ER_OPTIONS.fieldDensity==="none"?null:fields.length);
  const statusPrefix = isFailedApp(app) ? "取得失敗: " : (isPartialApp(app) ? "一部取得: " : "");
  const title = statusPrefix + app.name;
  return { title, name: app.name, meta, shown, moreCount };
}
function buildNodeLabel(app){
  const { title, meta, shown, moreCount } = nodeCardContent(app);
  const preview = shown.map((f)=>buildFieldPreviewLine(f));
  if(moreCount) preview.push("… 他 " + moreCount + " 項目");
  return [title, meta, ...preview].join("\n");
}
function buildSemanticNodeLabel(app){
  const statusPrefix = isFailedApp(app) ? "取得失敗: " : (isPartialApp(app) ? "一部取得: " : "");
  return [statusPrefix + app.name, appMetaText(app,null)].join("\n");
}
// ─── アプリカード ───
// Cytoscape のラベルは1書式しか持てないため、見出しと項目行を書き分けられる SVG 画像として描く。
// 枠線と地色は Cytoscape のスタイルで描くので、選択・強調などの状態表示も枠と地色に出る。
const CARD_FONT="'Yu Gothic UI','Hiragino Sans','Noto Sans JP',Meiryo,sans-serif";
const cardMeasure=document.createElement("canvas").getContext("2d");
function cardTextWidth(text,font){
  cardMeasure.font=font+" "+CARD_FONT;
  return cardMeasure.measureText(String(text)).width;
}
function cardFitText(text,font,maxWidth){
  const s=String(text||"");
  if(cardTextWidth(s,font)<=maxWidth) return s;
  const chars=Array.from(s);
  let lo=0,hi=chars.length;
  while(lo<hi){
    const mid=Math.ceil((lo+hi)/2);
    if(cardTextWidth(chars.slice(0,mid).join("")+"…",font)<=maxWidth) lo=mid; else hi=mid-1;
  }
  return chars.slice(0,lo).join("")+"…";
}
// 名前を幅に合わせて行に分ける（日本語は語の切れ目が無いため 1 文字ずつ詰める）。入りきらない最後の行は省略する
function cardWrapText(text,font,maxWidth,maxLines){
  const chars=Array.from(String(text||""));
  const lines=[];
  let line="";
  for(let i=0;i<chars.length;i++){
    const next=line+chars[i];
    if(line&&cardTextWidth(next,font)>maxWidth){
      lines.push(line);
      line=chars[i];
      if(lines.length===maxLines){ line=""; lines[maxLines-1]=cardFitText(lines[maxLines-1]+chars.slice(i).join(""),font,maxWidth); return {lines,truncated:true}; }
    }else line=next;
  }
  if(line) lines.push(line);
  return {lines,truncated:false};
}
function cardXml(text){
  return String(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function cardFieldBadge(field,palette){
  if(field.isPK) return {text:"PK",color:palette.pk};
  if(field.isLookup) return {text:"FK",color:palette.lookup};
  if(field.isRef) return {text:"関連",color:palette.ref};
  if(field.unique) return {text:"一意",color:palette.accent2};
  if(field.required) return {text:"必須",color:palette.req};
  return null;
}
function cardFieldNote(field,name){
  if(ER_OPTIONS.fieldDensity==="compact") return "";
  const code=String(field.code||"").trim();
  const parts=code&&code!==name?[code]:[];
  if(ER_OPTIONS.fieldDensity==="full"&&field.type) parts.push(fieldTypeJpLabel(field.type));
  return parts.join(" ・ ");
}
function cardHeaderTint(app,palette){
  if(isFailedApp(app)) return {color:palette.req,opacity:0.12};
  if(isPartialApp(app)) return {color:palette.action,opacity:0.12};
  if(app.isGhost) return {color:palette.dim,opacity:0.08};
  if(isMarkedStartApp(app)) return {color:palette.accent,opacity:0.12};
  return {color:palette.text,opacity:0.045};
}
function cardBadgeSvg(badges,right,top,fontSize,palette){
  // 右端から左へ並べ、使った幅を返す
  let x=right;
  const parts=[];
  badges.slice().reverse().forEach(b=>{
    const w=Math.ceil(cardTextWidth(b.text,"700 "+fontSize+"px"))+fontSize;
    const h=Math.round(fontSize*1.7);
    x-=w;
    parts.push('<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+h+'" rx="'+(h/2)+'" fill="'+b.color+'" fill-opacity="0.14" stroke="'+b.color+'" stroke-opacity="0.55"/>');
    parts.push('<text x="'+(x+w/2)+'" y="'+(top+h*0.7)+'" font-size="'+fontSize+'" font-weight="700" text-anchor="middle" fill="'+b.color+'">'+cardXml(b.text)+'</text>');
    x-=6;
  });
  return {svg:parts.join(""),width:right-x};
}
function svgImage(svg){
  return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
}
// 詳細表示のカード（見出し + 項目行）
function buildNodeCard(app,palette){
  const content=nodeCardContent(app);
  const title=content.name, meta=content.meta;
  const pad=14,headerH=54;
  const titleFont="700 14px",metaFont="11px";
  const rowFont="12px",noteFont="10.5px";
  const badgeW=28,rowH=22,rowGap=10,bodyPad=8;
  const badges=appCardBadges(app,palette);
  const badgeWidth=badges.reduce((sum,b)=>sum+Math.ceil(cardTextWidth(b.text,"700 10px"))+16,0);
  const rows=content.shown.map(field=>{
    const name=buildFieldDisplayName(field).trim();
    return {name,note:cardFieldNote(field,name),badge:cardFieldBadge(field,palette)};
  });
  const more=content.moreCount;
  const rowLeft=badgeW+8;
  const natural=pad*2+Math.max(
    cardTextWidth(title,titleFont)+(badgeWidth?badgeWidth+8:0),
    cardTextWidth(meta,metaFont),
    ...rows.map(r=>rowLeft+cardTextWidth(r.name,rowFont)+(r.note?rowGap+cardTextWidth(r.note,noteFont):0))
  );
  const maxW=ER_OPTIONS.fieldDensity==="full"?380:320;
  const w=Math.ceil(Math.min(maxW,Math.max(210,natural)));
  const rowCount=rows.length+(more?1:0);
  const h=headerH+(rowCount?bodyPad*2+rowCount*rowH:0);
  const inner=w-pad*2;
  const tint=cardHeaderTint(app,palette);
  const badgeSvg=cardBadgeSvg(badges,w-10,8,10,palette);
  const parts=[
    '<rect width="'+w+'" height="'+headerH+'" fill="'+tint.color+'" fill-opacity="'+tint.opacity+'"/>',
    badgeSvg.svg,
    '<text x="'+pad+'" y="23" font-size="14" font-weight="700" fill="'+palette.text+'">'+cardXml(cardFitText(title,titleFont,inner-(badgeSvg.width?badgeSvg.width+4:0)))+'</text>',
    '<text x="'+pad+'" y="42" font-size="11" fill="'+palette.dim+'">'+cardXml(cardFitText(meta,metaFont,inner))+'</text>'
  ];
  if(rowCount) parts.push('<rect y="'+(headerH-1)+'" width="'+w+'" height="1" fill="'+palette.border+'"/>');
  rows.forEach((row,index)=>{
    const top=headerH+bodyPad+index*rowH;
    const baseline=top+15;
    if(row.badge){
      parts.push('<rect x="'+pad+'" y="'+(top+3)+'" width="'+badgeW+'" height="16" rx="4" fill="'+row.badge.color+'" fill-opacity="0.14"/>');
      parts.push('<text x="'+(pad+badgeW/2)+'" y="'+(top+14.5)+'" font-size="9.5" font-weight="700" text-anchor="middle" fill="'+row.badge.color+'">'+cardXml(row.badge.text)+'</text>');
    }
    const area=inner-rowLeft;
    const noteW=row.note?cardTextWidth(row.note,noteFont):0;
    const nameMax=row.note&&noteW+rowGap<area*0.4?area-noteW-rowGap:(row.note?area*0.6:area);
    const name=cardFitText(row.name,rowFont,nameMax);
    parts.push('<text x="'+(pad+rowLeft)+'" y="'+baseline+'" font-size="12" fill="'+palette.text+'">'+cardXml(name)+'</text>');
    const noteMax=area-cardTextWidth(name,rowFont)-rowGap;
    if(row.note&&noteMax>=24){
      parts.push('<text x="'+(w-pad)+'" y="'+baseline+'" font-size="10.5" text-anchor="end" fill="'+palette.dim+'">'+cardXml(cardFitText(row.note,noteFont,noteMax))+'</text>');
    }
  });
  if(more){
    const baseline=headerH+bodyPad+rows.length*rowH+15;
    parts.push('<text x="'+(pad+rowLeft)+'" y="'+baseline+'" font-size="10.5" fill="'+palette.dim+'">他 '+more+' 項目</text>');
  }
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+(w*2)+'" height="'+(h*2)+'" viewBox="0 0 '+w+' '+h+'" font-family="'+cardXml(CARD_FONT)+'">'+parts.join("")+'</svg>';
  return {image:svgImage(svg),w,h};
}
// 縮小表示のカード。詳細カードと同じ大きさの枠に、アプリ名をできるだけ大きく描く（縮小しても名前が読める）。
// 枠の大きさを詳細カードとそろえるので、倍率を変えても配置が重ならない
const LOW_CARD_MIN_W=240, LOW_CARD_MIN_H=128;
// 名前の大きさを決める。なるべく 1 行で大きく、収まらなければ 2 行・3 行にする（短い名前を途中で折り返さない）
function overviewNameLayout(name,inner,nameArea){
  const LINE=1.22, MIN=20, MAX=46;
  const fits=(size,lines)=>{
    if(lines*size*LINE>nameArea) return null;
    const wrapped=cardWrapText(name,"700 "+size+"px",inner,lines);
    return !wrapped.truncated&&wrapped.lines.length<=lines?wrapped.lines:null;
  };
  const best=(lines)=>{
    for(let size=MAX;size>=MIN;size-=2){ const got=fits(size,lines); if(got) return {size,lines:got}; }
    return null;
  };
  const one=best(1);
  if(one&&one.size>=28) return one;
  const two=best(2);
  if(two&&(!one||two.size>=one.size+6)&&two.size>=24) return two;
  if(one) return one;
  const three=best(3);
  if(two&&(!three||two.size>=three.size)) return two;
  if(three) return three;
  const maxLines=Math.max(1,Math.min(3,Math.floor(nameArea/(MIN*LINE))));
  return {size:MIN,lines:cardWrapText(name,"700 "+MIN+"px",inner,maxLines).lines};
}
function buildOverviewCard(app,palette,size){
  const w=Math.max(LOW_CARD_MIN_W,size.w), h=Math.max(LOW_CARD_MIN_H,size.h);
  const pad=16;
  const inner=w-pad*2;
  const badges=appCardBadges(app,palette);
  const badgeH=badges.length?36:0;
  const metaSize=16;
  const meta=app.isGhost?"App "+app.id:(app.isCustom?"手動追加":"App "+app.id)+" ・ 参照 "+(app.relations||[]).length+" ・ 被参照 "+incomingRelationCount(app.id);
  const nameArea=h-pad*2-badgeH-metaSize-10;
  const name=app.isGhost?"未取得の参照先":String(app.name||"");
  const chosen=overviewNameLayout(name,inner,nameArea);
  const tint=cardHeaderTint(app,palette);
  const parts=['<rect width="'+w+'" height="'+h+'" fill="'+tint.color+'" fill-opacity="'+(tint.opacity*0.8)+'"/>'];
  if(badges.length){
    // 目印は左上に並べる
    let x=pad;
    badges.forEach(b=>{
      const bw=Math.ceil(cardTextWidth(b.text,"700 18px"))+20;
      parts.push('<rect x="'+x+'" y="'+pad+'" width="'+bw+'" height="28" rx="14" fill="'+b.color+'" fill-opacity="0.16" stroke="'+b.color+'" stroke-opacity="0.6"/>');
      parts.push('<text x="'+(x+bw/2)+'" y="'+(pad+20)+'" font-size="18" font-weight="700" text-anchor="middle" fill="'+b.color+'">'+cardXml(b.text)+'</text>');
      x+=bw+6;
    });
  }
  const lineH=chosen.size*1.22;
  const blockH=chosen.lines.length*lineH;
  let y=pad+badgeH+Math.max(0,(nameArea-blockH)/2)+chosen.size*0.95;
  chosen.lines.forEach(line=>{
    parts.push('<text x="'+pad+'" y="'+y+'" font-size="'+chosen.size+'" font-weight="700" fill="'+palette.text+'">'+cardXml(line)+'</text>');
    y+=lineH;
  });
  parts.push('<text x="'+pad+'" y="'+(h-pad)+'" font-size="'+metaSize+'" fill="'+palette.dim+'">'+cardXml(cardFitText(meta,metaSize+"px",inner))+'</text>');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+(w*2)+'" height="'+(h*2)+'" viewBox="0 0 '+w+' '+h+'" font-family="'+cardXml(CARD_FONT)+'">'+parts.join("")+'</svg>';
  return {image:svgImage(svg),w,h};
}
function nodeCardData(app){
  const palette=currentPalette();
  const card=buildNodeCard(app,palette);
  const low=buildOverviewCard(app,palette,card);
  return {cardImage:card.image,cardW:card.w,cardH:card.h,lowImage:low.image,lowW:low.w,lowH:low.h};
}
// 図の外の参照先（取得していないアプリ）のカード
function ghostPseudoApp(targetAppId){
  return {id:targetAppId,name:"未取得の参照先",isGhost:true,relations:[],allFields:[],ok:true,status:"complete"};
}
function ghostCardData(targetAppId){
  const palette=currentPalette();
  const app=ghostPseudoApp(targetAppId);
  const card=buildNodeCard(app,palette);
  const low=buildOverviewCard(app,palette,card);
  return {cardImage:card.image,cardW:card.w,cardH:card.h,lowImage:low.image,lowW:low.w,lowH:low.h};
}
function detailFieldGroups(app){
  const groups={pk:[],lookup:[],ref:[],required:[],subtable:[],normal:[]};
  visibleFieldsForNode(app).forEach(f=>{
    if(f.isPK) groups.pk.push(f);
    else if(f.isLookup) groups.lookup.push(f);
    else if(f.isRef) groups.ref.push(f);
    else if(f.type==="SUBTABLE") groups.subtable.push(f);
    else if(f.required) groups.required.push(f);
    else groups.normal.push(f);
  });
  return groups;
}
function layoutDisplayName(name){
  const map = { dagre:"階層", breadthfirst:"ツリー", cose:"自動", concentric:"同心円", grid:"グリッド", circle:"円形" };
  return map[name] || name || "-";
}
function buildLayoutOptions(name, initial, count){
  const base = { padding: 80, animate: !initial, animationDuration: initial ? 0 : 550, fit: true };
  const n = Math.max(1, Number(count) || APPS.length || 1);
  if(name === "dagre" && ER_DAGRE_READY){
    return Object.assign(base, { name: "dagre", rankDir: "LR", rankSep: 170, nodeSep: 48, edgeSep: 24, spacingFactor: 1.1 });
  }
  if(name === "grid") return Object.assign(base, { name: "grid", rows: Math.ceil(Math.sqrt(n)) });
  if(name === "circle") return Object.assign(base, { name: "circle" });
  if(name === "breadthfirst") return Object.assign(base, { name: "breadthfirst", directed: true, spacingFactor: 1.6, circle: false });
  if(name === "concentric") return Object.assign(base, { name: "concentric", concentric: n => (n.data("relCount") || 0) + 1, levelWidth: () => 2 });
  return Object.assign(base, { name: "cose", nodeRepulsion: 900000, idealEdgeLength: 280, gravity: 0.22, numIter: 1400 });
}
function densityNodeMetrics(){
  if(ER_OPTIONS.fieldDensity === "none") return { maxWidth:"240px", fontSize:"11px", padding:"14px", lineHeight:"1.35" };
  if(ER_OPTIONS.fieldDensity === "compact") return { maxWidth:"230px", fontSize:"9px", padding:"12px", lineHeight:"1.22" };
  if(ER_OPTIONS.fieldDensity === "full") return { maxWidth:"320px", fontSize:"10.5px", padding:"18px", lineHeight:"1.35" };
  return { maxWidth:"280px", fontSize:"10px", padding:"15px", lineHeight:"1.3" };
}
function buildCyStyle(palette){
  const nodeMetrics = densityNodeMetrics();
  const labelShown = {"text-opacity":1,"text-background-opacity":1,"text-border-opacity":0.7};
  return [
    {selector:"node",style:{
      "shape":"round-rectangle","label":"data(label)","text-valign":"center","text-halign":"center",
      "text-justification":"left",
      "text-wrap":"wrap","text-max-width":nodeMetrics.maxWidth,"font-size":nodeMetrics.fontSize,"line-height":nodeMetrics.lineHeight,"min-zoomed-font-size":6.5,
      "font-family":CARD_FONT,"font-weight":600,"color":palette.text,
      "text-outline-color":palette.surface,"text-outline-width":"1px",
      "background-color":palette.surface,"border-width":1.5,"border-color":palette.border,"padding":nodeMetrics.padding,"width":"label","height":"label"
    }},
    {selector:"node[cardImage]",style:{
      "label":"","padding":0,"width":"data(cardW)","height":"data(cardH)",
      "background-image":"data(cardImage)","background-fit":"contain","background-clip":"node"
    }},
    {selector:"node.no-link",style:{"border-style":"dashed","opacity":0.95}},
    {selector:"node[?isError]",style:{"border-color":palette.req,"border-width":2,"background-color":isDark ? "#2a0f14" : "#fff5f5"}},
    {selector:"node[?isPartial]",style:{"border-color":palette.action,"border-width":2,"border-style":"dashed","background-color":isDark ? "#2a1f08" : "#fffbeb"}},
    {selector:"node[?isGhost]",style:{"border-color":palette.dim,"border-style":"dashed","background-color":palette.surface2,"color":palette.dim,"font-style":"italic"}},
    {selector:"node.semantic-low",style:{"font-size":"18px","font-weight":700,"line-height":"1.35","text-max-width":"300px","min-zoomed-font-size":6,"padding":"16px","width":"label","height":"label"}},
    {selector:"node[cardImage].semantic-low",style:{"label":"","padding":0,"width":"data(lowW)","height":"data(lowH)","background-image":"data(lowImage)"}},
    {selector:"node[?isCustom]",style:{"border-style":"dashed","border-color":palette.accent2}},
    {selector:"node[?isStart]",style:{"border-color":palette.accent,"border-width":2.5}},
    {selector:"node[?inSpace]",style:{"border-color":"#0f766e","border-width":4,"border-style":"double"}},
    {selector:"node[?accent]",style:{"border-color":"data(accent)","border-width":3}},
    {selector:"node:selected",style:{"border-color":palette.accent,"border-width":3.5,"overlay-color":"transparent"}},
    {selector:"node.highlighted",style:{"border-color":palette.pk,"border-width":3.5}},
    {selector:"node.analysis-hit",style:{"border-color":palette.req,"border-width":5,"z-index":1000}},
    {selector:"node.analysis-dim",style:{"opacity":0.12}},
    {selector:"node.path-node",style:{"border-color":"#db2777","border-width":4}},
    {selector:"node.focus-root",style:{"border-color":palette.accent,"border-width":3.5,"z-index":999}},
    {selector:"node.focus-neighbor",style:{"border-color":palette.accent,"border-width":2}},
    {selector:"node.pinned-node",style:{"border-color":palette.pk,"border-width":4}},
    {selector:"node.note-node",style:{
      "shape":"round-rectangle","background-color":"data(noteColor)","background-opacity":0.96,
      "border-width":1,"border-color":"#8a8a8a","color":"#1f2430",
      "text-outline-width":0,"font-size":"11px","font-weight":500,
      "text-wrap":"wrap","text-max-width":"230px","text-valign":"center","text-halign":"center",
      "padding":"12px","width":"label","height":"label","line-height":"1.4","z-index":5
    }},
    {selector:"node.note-node:selected",style:{"border-color":palette.accent,"border-width":3}},
    {selector:"node.isolated-by-filter",style:{"opacity":0.4}},
    {selector:"node.focus-dim",style:{"opacity":0.12}},
    {selector:"node.dimmed",style:{"opacity":0.16}},
    {selector:"node.app-manual-hidden",style:{"display":"none"}},
    {selector:"node.scope-out",style:{"display":"none"}},
    {selector:"edge",style:{
      "curve-style":"bezier","arrow-scale":1,"control-point-step-size":36,
      "label":"data(label)","font-size":"11px","font-weight":600,"min-zoomed-font-size":7,
      "font-family":CARD_FONT,
      "text-background-color":palette.surface,"text-background-opacity":1,
      "text-background-padding":"4px","text-background-shape":"roundrectangle",
      "text-border-color":palette.border,"text-border-width":1,"text-border-opacity":0.7,
      "text-rotation":"none"
    }},
    {selector:'edge[kind="LOOKUP"]',style:{
      "width":1.8,"line-color":palette.lookup,"target-arrow-color":palette.lookup,"target-arrow-shape":"triangle",
      "source-arrow-shape":"circle","source-arrow-color":palette.lookup,"color":palette.lookup
    }},
    {selector:'edge[kind="REF"]',style:{
      "width":1.8,"line-color":palette.ref,"line-style":"dashed","target-arrow-color":palette.ref,
      "target-arrow-shape":"triangle","source-arrow-shape":"diamond","source-arrow-color":palette.ref,"color":palette.ref
    }},
    {selector:'edge[kind="ACTION"]',style:{
      "width":1.8,"line-color":palette.action,"line-style":"dotted","target-arrow-color":palette.action,
      "target-arrow-shape":"triangle","source-arrow-shape":"none","color":palette.action
    }},
    {selector:"edge[bundleCount > 1]",style:{"width":"data(bundleWidth)"}},
    {selector:"edge[?isUnresolved]",style:{"line-style":"dashed","opacity":0.8}},
    // 線のラベルは、選んだ線・マウスを乗せた線・選んだアプリの線だけに出す（「線のラベルを常に表示」で全部に出す）
    {selector:"edge.label-hidden",style:{"text-opacity":0,"text-background-opacity":0,"text-border-opacity":0}},
    {selector:"edge.label-hidden:selected",style:labelShown},
    {selector:"edge.label-hidden.edge-hover",style:labelShown},
    {selector:"edge.label-hidden.focus-edge",style:labelShown},
    {selector:"edge.label-hidden.path-edge",style:labelShown},
    {selector:"edge:selected",style:{"width":4,"z-index":997,"overlay-color":palette.accent,"overlay-opacity":0.12,"overlay-padding":4}},
    {selector:"edge.edge-hover",style:{"width":4,"z-index":997}},
    {selector:"edge.path-edge",style:{"width":4,"line-color":"#db2777","target-arrow-color":"#db2777","source-arrow-color":"#db2777","z-index":999}},
    {selector:"edge.focus-edge",style:{"width":2.8,"z-index":998}},
    {selector:"edge.semantic-low",style:{"text-opacity":0,"text-background-opacity":0,"text-border-opacity":0}},
    {selector:"edge.rel-hidden",style:{"display":"none"}},
    {selector:"edge.rel-manual-hidden",style:{"display":"none"}},
    {selector:"edge.edge-collapsed",style:{"display":"none"}},
    {selector:"edge.scope-out",style:{"display":"none"}},
    {selector:"edge.focus-dim",style:{"opacity":0.07}},
    {selector:"edge.dimmed",style:{"opacity":0.1}}
  ];
}
function applyTheme(){
  document.documentElement.setAttribute("data-theme",isDark?"dark":"light");
  const btn=document.getElementById("theme-btn");
  if(btn){
    btn.setAttribute("aria-pressed",String(isDark));
    btn.setAttribute("aria-label",isDark?"明るい配色に切り替える":"暗い配色に切り替える");
    btn.title=(isDark?"明るい配色に切り替える":"暗い配色に切り替える")+"（保存しません）";
  }
}
function toggleTheme(){
  isDark=!isDark;
  applyTheme();
  applyCyTheme();
  toast(isDark?"暗い配色にしました":"明るい配色にしました");
}
// カードの画像と図の色は CSS の変数から作るため、図を作る前に配色を決めておく
applyTheme();

// ─── 手動追加のデータ層（編集済みHTMLの復元でも使用） ───
let customAppSeq=0, customRelSeq=0, customFieldSeq=0;

function findApp(id){
  if(appMap.has(id)) return appMap.get(id);
  const n=Number(id);
  if(appMap.has(n)) return appMap.get(n);
  const s=String(id);
  return appMap.has(s) ? appMap.get(s) : null;
}
function registerManualApp(app){
  app.relations = Array.isArray(app.relations) ? app.relations : [];
  app.fields = Array.isArray(app.fields) ? app.fields : [];
  app.allFields = Array.isArray(app.allFields) ? app.allFields : app.fields.slice();
  app.isCustom = true;
  if(app.ok === undefined) app.ok = true;
  APPS.push(app);
  appMap.set(app.id, app);
  invalidateRelationCounts();
}
// 取得したアプリは allFields だけを持つ（fields は HTML へ埋め込まない）。手動追加のアプリは両方を持つ
function applyManualFieldData(app, field){
  if(!Array.isArray(app.allFields)) app.allFields = [];
  app.allFields.push(field);
  if(Array.isArray(app.fields)) app.fields.push(field);
  if(typeof app.totalFieldCount === "number") app.totalFieldCount += 1;
  if(field.required) app.requiredCount = (app.requiredCount||0)+1;
}
function applyManualRelationData(app, rel){
  app.relations.push(rel);
  if(rel.kind === "LOOKUP") app.lookupCount = (app.lookupCount||0)+1;
  if(rel.kind === "REF") app.refCount = (app.refCount||0)+1;
  if(typeof invalidateRelationCounts === "function") invalidateRelationCounts();
}
// ─── 上書き編集のデータ層（アプリ名/枠色・項目・関連線。編集済みHTMLで永続化） ───
const appOverrides=(ER_EDIT_STATE&&ER_EDIT_STATE.appOverrides)||{};
const fieldOverrides=(ER_EDIT_STATE&&ER_EDIT_STATE.fieldOverrides)||{};
const relationOverrides=(ER_EDIT_STATE&&ER_EDIT_STATE.relationOverrides)||{};
function findFieldByKey(app,key){
  const prefix=String(app.id)+"::";
  if(String(key).indexOf(prefix)!==0) return null;
  const suffix=String(key).slice(prefix.length);
  const match=(f)=>String(f.path||f.code||f.label||"")===suffix;
  return (app.allFields||[]).find(match)||(app.fields||[]).find(match)||null;
}
function parseEdgeId(edgeId){
  const m=/^e_(-?\d+)_(\d+)$/.exec(String(edgeId||""));
  if(!m) return null;
  return {appId:Number(m[1]),ri:Number(m[2])};
}
function relationForEdgeId(edgeId){
  const ref=parseEdgeId(edgeId);
  const app=ref&&findApp(ref.appId);
  const rel=app&&(app.relations||[])[ref.ri];
  return rel?{app,rel,ri:ref.ri}:null;
}
function appAccentColor(app){
  const o=appOverrides[app.id]||appOverrides[String(app.id)];
  return (o&&o.color)||"";
}
function applyDataOverrides(){
  Object.keys(appOverrides).forEach(id=>{
    const o=appOverrides[id];
    const app=findApp(id);
    if(app&&o&&o.name) app.name=o.name;
  });
  Object.keys(fieldOverrides).forEach(key=>{
    const app=findApp(String(key).split("::")[0]);
    if(!app) return;
    const field=findFieldByKey(app,key);
    if(field) Object.assign(field,fieldOverrides[key]);
  });
  Object.keys(relationOverrides).forEach(edgeId=>{
    const ref=parseEdgeId(edgeId);
    if(!ref) return;
    const app=findApp(ref.appId);
    const rel=app&&(app.relations||[])[ref.ri];
    if(rel) Object.assign(rel,relationOverrides[edgeId]);
  });
}

// 編集済みHTMLからの復元: 手動追加データを描画前に再適用する
if(ER_EDIT_STATE){
  try{
    (ER_EDIT_STATE.customApps||[]).forEach(raw=>{ if(raw && raw.id !== undefined && !appMap.has(raw.id)) registerManualApp(raw); });
    (ER_EDIT_STATE.customFields||[]).forEach(item=>{ const app=findApp(item && item.appId); if(app && item.field) applyManualFieldData(app, item.field); });
    (ER_EDIT_STATE.customRelations||[]).forEach(item=>{ const app=findApp(item && item.fromAppId); if(app && item.rel) applyManualRelationData(app, item.rel); });
    if(ER_EDIT_STATE.seq){
      customAppSeq=Number(ER_EDIT_STATE.seq.app)||0;
      customRelSeq=Number(ER_EDIT_STATE.seq.rel)||0;
      customFieldSeq=Number(ER_EDIT_STATE.seq.field)||0;
    }
  }catch(err){ console.error("[ER] 編集状態の復元に失敗", err); }
}
try{ applyDataOverrides(); }catch(err){ console.error("[ER] 上書き編集の復元に失敗", err); }
invalidateRelationCounts();

// ─── Cytoscape Init ───
const spaceAppIdSet = new Set((ER_OPTIONS.spaceAppIds || []).map((id)=>String(id)));
const erSpaceId = String(ER_OPTIONS.spaceId || "");
const isInSpaceApp = (app)=> !!erSpaceId && (spaceAppIdSet.has(String(app.id)) || String(app.spaceId || "") === erSpaceId);
const savedPositions=(ER_EDIT_STATE && ER_EDIT_STATE.view && ER_EDIT_STATE.view.positions) || null;
const elements=[];
APPS.forEach(app=>{
  const el={data:{
    id:"a"+app.id,
    label:buildNodeLabel(app),
    ...nodeCardData(app),
    appId:app.id,
    isError:!app.ok,
    isPartial:app.status==="partial",
    isStart:isMarkedStartApp(app),
    inSpace:isInSpaceApp(app),
    isCustom:!!app.isCustom,
    accent:appAccentColor(app),
    fieldCount:visibleFieldsForNode(app).length,
    relCount:app.relations.length,
    depth:app.depth || 0
  }};
  const sp=savedPositions && savedPositions["a"+app.id];
  if(sp && typeof sp.x === "number" && typeof sp.y === "number") el.position={x:sp.x,y:sp.y};
  elements.push(el);
});
function edgeDisplayLabel(text){
  const s=String(text||"");
  return s.length > 24 ? s.slice(0, 23) + "…" : s;
}
function ghostNodeIdFor(toApp){
  return "g"+String(toApp||"unknown").replace(/[^0-9A-Za-z_-]/g,"_");
}
// エッジIDは「e_アプリID_リレーション順」で安定化（編集済みHTML復元時に削除状態を引き継ぐため）
const ghostNodeIds=new Set();
APPS.forEach(app=>{
  app.relations.forEach((r,ri)=>{
    const hasTarget=appMap.has(r.toApp);
    const targetId=hasTarget?"a"+r.toApp:ghostNodeIdFor(r.toApp);
    if(!hasTarget&&r.toApp&&!ghostNodeIds.has(targetId)){
      ghostNodeIds.add(targetId);
      const ghost={data:{id:targetId,label:"未取得の参照先\nApp "+r.toApp,...ghostCardData(r.toApp),appId:null,targetAppId:r.toApp,isGhost:true,fieldCount:0,relCount:0,depth:(app.depth||0)+1}};
      const gp=savedPositions && savedPositions[targetId];
      if(gp && typeof gp.x === "number" && typeof gp.y === "number") ghost.position={x:gp.x,y:gp.y};
      elements.push(ghost);
    }
    if(hasTarget||r.toApp){
      const fullLabel = r.fromDisplay || r.fromLabel || (r.kind==="LOOKUP"?"ルックアップ":(r.kind==="REF"?"関連":"アクション"));
      elements.push({data:{id:"e_"+app.id+"_"+ri,source:"a"+app.id,target:targetId,kind:r.kind,label:edgeDisplayLabel(fullLabel),fromLabel:r.fromLabel,fromDisplay:r.fromDisplay || r.fromLabel || "",isCustom:!!r.isCustom,isUnresolved:!hasTarget,bundleCount:1,bundleWidth:1.8}});
    }
  });
});

const hasSavedLayout=!!savedPositions;
// 初期配置は preset で置き、起動処理（viewer-boot.js）で表示範囲を決めてから配置する
const cy=cytoscape({
  container:document.getElementById("cy"),
  elements,
  style: buildCyStyle(currentPalette()),
  layout: {name:"preset",fit:false},
  minZoom:0.05,maxZoom:4,wheelSensitivity:0.25,
  boxSelectionEnabled:true,
});

function refreshNodeCards(){
  invalidateRelationCounts();
  APPS.forEach(app=>{
    const node=cy.getElementById("a"+app.id);
    if(node.length) node.data({...nodeCardData(app),isStart:isMarkedStartApp(app)});
  });
  cy.nodes("[?isGhost]").forEach(node=>node.data(ghostCardData(node.data("targetAppId"))));
}
function refreshNodeDisplay(node,app){
  node.data({label:buildNodeLabel(app),...nodeCardData(app)});
}
function applyCyTheme(){
  refreshNodeCards();
  cy.style().fromJson(buildCyStyle(currentPalette())).update();
}
// 縮小したときは、アプリ名を大きく描いた概要カードに切り替える
const SEMANTIC_ZOOM_THRESHOLD=0.65;
const semanticZoomLabelBackup=new Map();
let semanticZoomActive=false;
function applySemanticZoom(zoom, force){
  const low=Number(zoom)<SEMANTIC_ZOOM_THRESHOLD;
  if(low===semanticZoomActive&&!force) return;
  semanticZoomActive=low;
  if(low){
    cy.nodes().not(".note-node").forEach(node=>{
      if(!node.hasClass("semantic-low")) semanticZoomLabelBackup.set(node.id(),String(node.data("label")||""));
      const app=appMap.get(node.data("appId"));
      if(app) node.data("label",buildSemanticNodeLabel(app));
      node.addClass("semantic-low");
    });
    cy.edges().addClass("semantic-low");
    return;
  }
  cy.nodes(".semantic-low").forEach(node=>{
    if(semanticZoomLabelBackup.has(node.id())) node.data("label",semanticZoomLabelBackup.get(node.id()));
    node.removeClass("semantic-low");
  });
  cy.edges().removeClass("semantic-low");
  semanticZoomLabelBackup.clear();
}
function syncLayoutButtons(name){
  document.querySelectorAll("[data-layout-btn]").forEach((btn)=>{
    const on=btn.dataset.layoutBtn === name;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
  const pill = document.getElementById("layout-pill");
  if(pill){pill.replaceChildren();const label=document.createElement("b");label.textContent="配置";pill.append(label," "+layoutDisplayName(name));}
}
function refreshNodeLabels(){
  invalidateRelationCounts();
  APPS.forEach((app)=>{
    const node = cy.getElementById("a"+app.id);
    if(!node.length) return;
    const fullLabel=buildNodeLabel(app);
    if(semanticZoomActive){
      semanticZoomLabelBackup.set(node.id(),fullLabel);
      node.data("label",buildSemanticNodeLabel(app));
      node.addClass("semantic-low");
    }else{
      node.data("label",fullLabel);
    }
    node.data(nodeCardData(app));
  });
}
function syncDensityControl(){
  const select = document.getElementById("density-select");
  if(select) select.value = ER_OPTIONS.fieldDensity || "standard";
  const pill = document.getElementById("density-pill");
  if(pill) pill.innerHTML = "<b>密度</b> " + formatFieldDensityLabel(ER_OPTIONS.fieldDensity);
}
function setDensity(value){
  const next = ["none","compact","standard","full"].includes(String(value)) ? String(value) : "standard";
  ER_OPTIONS.fieldDensity = next;
  // シンプルモード中に「結合のみ」以外へ変更したら、シンプルモードを解除する
  if(simpleMode && next !== "none") setSimpleMode(false, true);
  refreshNodeLabels();
  applyCyTheme();
  syncDensityControl();
  if(typeof refreshAppList === "function") refreshAppList();
  toast("カードの項目: " + formatFieldDensityLabel(next));
}

const MAX_FIT_ZOOM=1.25;
// 図に重なる部品（表示範囲の帯・凡例・ズーム操作）を避けて、表示中の要素を画面に収める
function fitInsets(){
  const host=cy.container().getBoundingClientRect();
  const scopeBar=document.getElementById("scope-bar");
  const sb=scopeBar&&!scopeBar.hidden?scopeBar.getBoundingClientRect():null;
  const top=Math.max(16,(sb&&sb.height?sb.bottom-host.top:0)+18);
  const legend=document.getElementById("legend");
  const lg=legend?legend.getBoundingClientRect():null;
  const bottom=Math.max(40,(lg&&lg.height?host.bottom-lg.top:0)+14);
  // 右の詳細・構造チェックが図に重なっているときは、その幅も避ける
  let right=64;
  ["detail","analysis-panel"].forEach(id=>{
    const panel=document.getElementById(id);
    if(!panel||!panel.classList.contains("open")) return;
    const r=panel.getBoundingClientRect();
    if(r.width&&r.left>host.left+host.width*0.4) right=Math.max(right,host.right-r.left+24);
  });
  return {top,bottom,left:28,right};
}
function fitViewportFor(eles,maxZoom){
  const box=eles.boundingBox();
  const inset=fitInsets();
  const availW=Math.max(cy.width()-inset.left-inset.right,120),availH=Math.max(cy.height()-inset.top-inset.bottom,120);
  const zoom=Math.max(cy.minZoom(),Math.min(maxZoom,availW/Math.max(box.w,1),availH/Math.max(box.h,1)));
  return {zoom,pan:{x:inset.left+(availW-box.w*zoom)/2-box.x1*zoom,y:inset.top+(availH-box.h*zoom)/2-box.y1*zoom}};
}
// 指定した要素を、図に重なる部品を避けて画面に収める
function fitElements(eles,options){
  const opts=options||{};
  if(!eles||!eles.length) return;
  const target=fitViewportFor(eles,opts.maxZoom||MAX_FIT_ZOOM);
  if(opts.animate) cy.animate(target,{duration:400,complete:updateZoomLabel});
  else { cy.viewport(target); updateZoomLabel(); }
}
function fit(){
  closeZoomPresets();
  const eles=cy.elements(":visible");
  // 縮小すると概要表示に変わりノードの大きさも変わるため、切り替わった後の大きさでもう一度合わせる
  for(let pass=0;eles.length&&pass<2;pass++) cy.viewport(fitViewportFor(eles,MAX_FIT_ZOOM));
  updateZoomLabel();
}

// ─── 紐づきなしアプリの分離配置 ───
// レイアウト適用時、関連線を持たないアプリを本体グラフの下の別枠（グリッド）にまとめる
let separateNoLink = true;

function isEdgeShown(e){
  return !e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden") && !e.hasClass("scope-out");
}
function nodeHasVisibleLink(n){
  return n.connectedEdges().some(e=>{
    if(e.hasClass("rel-hidden") || e.hasClass("rel-manual-hidden")) return false;
    const other = e.source().id() === n.id() ? e.target() : e.source();
    return !other.hasClass("app-manual-hidden") && !other.hasClass("scope-out");
  });
}
function layoutCandidates(){
  return cy.nodes().filter(n=>!n.hasClass("app-manual-hidden") && !n.hasClass("note-node") && !n.hasClass("scope-out"));
}
function refreshNoLinkClasses(){
  const nodes = layoutCandidates();
  const linked = nodes.filter(n=>nodeHasVisibleLink(n));
  const isolated = nodes.not(linked);
  cy.nodes().removeClass("no-link");
  isolated.addClass("no-link");
  return { linked, isolated };
}
function appNameForNode(n){
  const app = appMap.get(n.data("appId"));
  return app ? String(app.name || "") : String(n.data("label") || "");
}
// 詳細表示と概要表示（縮小時）のカードは大きさが違う。どちらの表示でも重ならないよう、大きい方の寸法で配置を考える
function nodeSpan(n){
  return {
    w: Math.max(Number(n.data("cardW")) || 0, Number(n.data("lowW")) || 0, n.outerWidth()),
    h: Math.max(Number(n.data("cardH")) || 0, Number(n.data("lowH")) || 0, n.outerHeight())
  };
}
// レイアウトが重ねて置いたアプリ（フォース・同心円・グリッドなど）を、重なりが無くなるまで少しずつ押し広げる。
// 重なりのない配置は動かさない。動かしたら true を返す（呼び出し側で全体表示に合わせ直す）
const OVERLAP_GAP = 28;
const OVERLAP_MAX_NODES = 800;
function separateOverlappingNodes(nodes, animate){
  const items = nodes.toArray().filter(n=>!n.hasClass("note-node")).map(n=>{
    const pos = n.position();
    const span = nodeSpan(n);
    return { n, x: pos.x, y: pos.y, w: span.w + OVERLAP_GAP, h: span.h + OVERLAP_GAP, fixed: n.locked() };
  });
  if(items.length < 2 || items.length > OVERLAP_MAX_NODES) return false;
  const start = items.map(item=>({x:item.x,y:item.y}));
  for(let round = 0; round < 120; round++){
    let moved = false;
    for(let i = 0; i < items.length; i++){
      for(let j = i + 1; j < items.length; j++){
        const a = items[i], b = items[j];
        if(a.fixed && b.fixed) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        if(dx === 0 && dy === 0){ dx = 0.01; b.x += dx; }
        const overlapX = (a.w + b.w) / 2 - Math.abs(dx);
        const overlapY = (a.h + b.h) / 2 - Math.abs(dy);
        if(overlapX <= 0 || overlapY <= 0) continue;
        // 食い込みが浅い向きへ、お互いに半分ずつ（固定のアプリは動かさない）離す
        const shareA = a.fixed ? 0 : (b.fixed ? 1 : 0.5);
        const shareB = 1 - shareA;
        if(overlapX < overlapY){
          const step = overlapX + 1, sign = dx >= 0 ? 1 : -1;
          a.x -= sign * step * shareA; b.x += sign * step * shareB;
        }else{
          const step = overlapY + 1, sign = dy >= 0 ? 1 : -1;
          a.y -= sign * step * shareA; b.y += sign * step * shareB;
        }
        moved = true;
      }
    }
    if(!moved) break;
  }
  let changed = false;
  items.forEach((item, i)=>{
    if(Math.abs(item.x - start[i].x) < 0.5 && Math.abs(item.y - start[i].y) < 0.5) return;
    changed = true;
    const pos = { x: item.x, y: item.y };
    if(animate) item.n.animate({position:pos},{duration:380});
    else item.n.position(pos);
  });
  return changed;
}
function placeNoLinkGrid(linked, isolated, animate){
  const bb = linked.boundingBox();
  let cellW = 0, cellH = 0;
  isolated.forEach(n=>{
    const span = nodeSpan(n);
    cellW = Math.max(cellW, span.w);
    cellH = Math.max(cellH, span.h);
  });
  cellW += 46; cellH += 42;
  const cols = Math.max(1, Math.min(isolated.length, Math.max(Math.floor(bb.w / cellW), Math.ceil(Math.sqrt(isolated.length)))));
  const startX = bb.x1 + cellW / 2;
  const startY = bb.y2 + 80 + cellH / 2;
  const sorted = isolated.sort((a,b)=>appNameForNode(a).localeCompare(appNameForNode(b), "ja"));
  sorted.forEach((n,i)=>{
    const pos = { x: startX + (i % cols) * cellW, y: startY + Math.floor(i / cols) * cellH };
    if(animate) n.animate({position:pos},{duration:380});
    else n.position(pos);
  });
}
// 1つの階層に多数のアプリが並ぶと図が縦に細長くなり全体表示で読めなくなるため、
// 階層内の順序を保ったまま複数列に折り返して画面の縦横比に近づける
function wrapTallRanks(nodes, animate){
  const gapX = 70, gapY = 28;
  const area = nodes.toArray().reduce((sum,n)=>sum+(n.outerWidth()+gapX)*(n.outerHeight()+gapY),0);
  const maxHeight = Math.max(900, Math.sqrt(area / (cy.width() / Math.max(cy.height(), 1))));
  const box = nodes.boundingBox();
  if(box.h <= maxHeight * 1.25) return false;
  const midY = (box.y1 + box.y2) / 2;
  const ranks = new Map();
  nodes.forEach(n=>{
    const x = Math.round(n.position("x"));
    if(!ranks.has(x)) ranks.set(x, []);
    ranks.get(x).push(n);
  });
  let shift = 0;
  [...ranks.keys()].sort((a,b)=>a-b).forEach(x=>{
    const rank = ranks.get(x).sort((a,b)=>a.position("y")-b.position("y"));
    const columns = [[]];
    let height = 0;
    rank.forEach(n=>{
      const h = n.outerHeight() + gapY;
      if(height + h > maxHeight && columns[columns.length-1].length){ columns.push([]); height = 0; }
      columns[columns.length-1].push(n);
      height += h;
    });
    const cellW = Math.max(...rank.map(n=>n.outerWidth())) + gapX;
    columns.forEach((column,index)=>{
      const columnH = column.reduce((sum,n)=>sum+n.outerHeight()+gapY,0);
      let y = midY - columnH / 2;
      column.forEach(n=>{
        const pos = { x: x + shift + index * cellW, y: y + n.outerHeight() / 2 };
        y += n.outerHeight() + gapY;
        if(animate) n.animate({position:pos},{duration:380});
        else n.position(pos);
      });
    });
    shift += (columns.length - 1) * cellW;
  });
  return true;
}
// 依存が長く連なると階層数だけ横に伸びるため、階層の順を保ったまま複数段に分けて画面の縦横比に近づける
function wrapWideRanks(nodes){
  const box = nodes.boundingBox();
  const aspect = cy.width() / Math.max(cy.height(), 1);
  const bands = Math.round(Math.sqrt((box.w / Math.max(box.h, 1)) / aspect));
  if(bands < 2) return false;
  const gapY = 160;
  const members = Array.from({length:bands},()=>[]);
  nodes.forEach(n=>members[Math.min(bands-1,Math.floor((n.position("x")-box.x1)/(box.w/bands)))].push(n));
  let top = box.y1;
  members.filter(band=>band.length).forEach(band=>{
    const left = Math.min(...band.map(n=>n.boundingBox().x1));
    const upper = Math.min(...band.map(n=>n.boundingBox().y1));
    const lower = Math.max(...band.map(n=>n.boundingBox().y2));
    band.forEach(n=>n.position({x:n.position("x")-left+box.x1,y:n.position("y")-upper+top}));
    top += lower - upper + gapY;
  });
  return true;
}
function wrapRanks(nodes, animate){
  const before = nodes.map(n=>({n,pos:Object.assign({},n.position())}));
  const tall = wrapTallRanks(nodes, false);
  const wrapped = wrapWideRanks(nodes) || tall;
  if(wrapped && animate) before.forEach(({n,pos})=>{
    const target = Object.assign({},n.position());
    n.position(pos);
    n.animate({position:target},{duration:380});
  });
  return wrapped;
}
// 配置の対象: 表示範囲の外とメモを除いたアプリと、その間の線（範囲外のアプリへの線を渡すと、配置が架空のアプリを作る）
function layoutTargetElements(){
  const nodes = cy.nodes().not(".note-node").not(".scope-out");
  return nodes.union(nodes.edgesWith(nodes));
}
// 「〇〇のまわり」の表示で使う配置。中心のアプリを真ん中に、それを参照するアプリを左、それが参照するアプリを右に並べる
// （深さ 2 は、その外側）。列が縦に長くなるときは、外側へ折り返して画面の縦横比に近づける
function aroundLayoutColumns(){
  const roots = viewScope.roots.map(id=>"a"+id).filter(id=>scopeMembers&&scopeMembers.has(id));
  const col = new Map(), parent = new Map();
  roots.forEach(id=>col.set(id,0));
  let frontier = roots.slice();
  for(let d = 1; d <= viewScope.depth; d++){
    const next = [];
    frontier.forEach(id=>{
      const side = col.get(id);
      // 参照している線を先に見る（参照しあうアプリは右に置く）
      const edges = cy.getElementById(id).connectedEdges().toArray().sort((a,b)=>(a.source().id()===id?0:1)-(b.source().id()===id?0:1));
      edges.forEach(e=>{
        if(e.hasClass("rel-manual-hidden")) return;
        const other = e.source().id() === id ? e.target() : e.source();
        const oid = other.id();
        if(col.has(oid) || !scopeMembers.has(oid) || other.hasClass("app-manual-hidden")) return;
        const sign = side === 0 ? (e.source().id() === id ? 1 : -1) : Math.sign(side);
        col.set(oid, sign * d);
        parent.set(oid, id);
        next.push(oid);
      });
    });
    frontier = next;
  }
  return { col, parent, roots };
}
function runAroundLayout(animate){
  const nodes = layoutCandidates().union(cy.nodes(".app-manual-hidden").not(".scope-out").not(".note-node"));
  const { col, parent, roots } = aroundLayoutColumns();
  const groups = new Map();
  nodes.forEach(n=>{
    const c = col.has(n.id()) ? col.get(n.id()) : 0;
    if(!groups.has(c)) groups.set(c, []);
    groups.get(c).push(n);
  });
  const gapX = 150, gapY = 30;
  const area = nodes.toArray().reduce((sum,n)=>{ const s=nodeSpan(n); return sum+(s.w+gapX)*(s.h+gapY); },0);
  const maxHeight = Math.max(720, Math.sqrt(area / Math.max(0.5, cy.width() / Math.max(cy.height(), 1))));
  const orderIndex = new Map();
  const keys = [...groups.keys()].sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
  const columns = new Map();
  keys.forEach(k=>{
    const list = groups.get(k).sort((a,b)=>{
      if(k === 0){ const ra = roots.includes(a.id()) ? 0 : 1, rb = roots.includes(b.id()) ? 0 : 1; if(ra !== rb) return ra - rb; }
      const pa = orderIndex.has(parent.get(a.id())) ? orderIndex.get(parent.get(a.id())) : 0;
      const pb = orderIndex.has(parent.get(b.id())) ? orderIndex.get(parent.get(b.id())) : 0;
      return pa - pb || appNameForNode(a).localeCompare(appNameForNode(b), "ja");
    });
    list.forEach((n,i)=>orderIndex.set(n.id(), i));
    const subcols = [[]];
    let height = 0;
    list.forEach(n=>{
      const h = nodeSpan(n).h + gapY;
      if(height + h > maxHeight && subcols[subcols.length-1].length){ subcols.push([]); height = 0; }
      subcols[subcols.length-1].push(n);
      height += h;
    });
    columns.set(k, subcols.map(sc=>({ nodes: sc, w: Math.max(...sc.map(n=>nodeSpan(n).w)) })));
  });
  const positions = new Map();
  const placeSubcol = (sc, centerX)=>{
    const total = sc.nodes.reduce((sum,n)=>sum+nodeSpan(n).h+gapY,0) - gapY;
    let y = -total / 2;
    sc.nodes.forEach(n=>{ const h = nodeSpan(n).h; positions.set(n.id(), { x: centerX, y: y + h / 2 }); y += h + gapY; });
  };
  const center = columns.get(0) || [];
  const centerW = center.reduce((sum,sc)=>sum+sc.w,0) + Math.max(0, center.length-1) * gapX;
  let x = -centerW / 2;
  center.forEach(sc=>{ placeSubcol(sc, x + sc.w / 2); x += sc.w + gapX; });
  let right = centerW / 2 + gapX, left = -centerW / 2 - gapX;
  keys.filter(k=>k>0).sort((a,b)=>a-b).forEach(k=>columns.get(k).forEach(sc=>{ placeSubcol(sc, right + sc.w / 2); right += sc.w + gapX; }));
  keys.filter(k=>k<0).sort((a,b)=>b-a).forEach(k=>columns.get(k).forEach(sc=>{ placeSubcol(sc, left - sc.w / 2); left -= sc.w + gapX; }));
  nodes.forEach(n=>{
    const pos = positions.get(n.id());
    if(!pos || n.locked()) return;
    if(animate) n.animate({position:pos},{duration:450});
    else n.position(pos);
  });
}
// 配置が終わって画面に合わせ直したら解決する Promise を返す
function runLayout(name, initial){
  return new Promise(resolve=>{
    // 概要表示の小さなカードで配置すると、拡大したときに重なるため詳細表示の大きさで計算する
    applySemanticZoom(1,true);
    const parts = refreshNoLinkClasses();
    const finish = (delay)=>setTimeout(()=>{ fit(); resolve(); }, delay);
    if(name === "dagre" && viewScope.mode === "around"){
      // 列に積むので重ならない。固定したアプリがあるときだけ、重なりを押し広げる（動かしながらでは位置が読めないため、その場合は動かさずに置く）
      const hasPinned = layoutCandidates().some(n=>n.locked());
      runAroundLayout(!initial && !hasPinned);
      if(hasPinned) separateOverlappingNodes(layoutCandidates(), false);
      finish(initial ? 120 : 500);
      return;
    }
    if(!separateNoLink || !parts.isolated.length || !parts.linked.length){
      // メモ(付箋)はレイアウトの対象外にして、手で置いた位置を保つ
      const targets = layoutTargetElements();
      const lay = targets.layout(buildLayoutOptions(name, initial, targets.nodes().length));
      const wrapTargets = cy.nodes().not(".note-node").not(".app-manual-hidden").not(".scope-out");
      lay.one("layoutstop",()=>{
        const wrapped = name === "dagre" && ER_DAGRE_READY && wrapTargets.length > 1 && wrapRanks(wrapTargets, !initial);
        const separated = separateOverlappingNodes(wrapTargets, !initial);
        if(initial || wrapped || separated) finish(initial ? 200 : 450);
        else { updateZoomLabel(); resolve(); }
      });
      lay.run();
      return;
    }
    const opts = buildLayoutOptions(name, initial, parts.linked.length);
    opts.fit = false;
    const visibleEdges = parts.linked.edgesWith(parts.linked).filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
    const lay = parts.linked.union(visibleEdges).layout(opts);
    lay.one("layoutstop",()=>{
      if(name === "dagre" && ER_DAGRE_READY) wrapRanks(parts.linked, false);
      separateOverlappingNodes(parts.linked, false);
      placeNoLinkGrid(parts.linked, parts.isolated, !initial);
      finish(initial ? 150 : 450);
    });
    lay.run();
  });
}
function syncSeparateNoLinkButton(){
  const btn = document.getElementById("separate-nolink-btn");
  if(btn){ btn.classList.toggle("active", separateNoLink); btn.setAttribute("aria-pressed", String(separateNoLink)); }
}
function toggleSeparateNoLink(){
  separateNoLink = !separateNoLink;
  syncSeparateNoLinkButton();
  scopePositionCache.clear();
  runLayout(ER_OPTIONS.layoutName || "dagre", false);
  toast(separateNoLink ? "関連のないアプリを下にまとめました" : "関連のないアプリをまとめずに配置しました");
}

// ─── Layout Switching ───
function setLayout(name){
  name=normalizeLayoutName(name);
  ER_OPTIONS.layoutName = name;
  syncLayoutButtons(name);
  // 配置を変えたら、ほかの表示範囲で覚えていた位置も使わない
  scopePositionCache.clear();
  runLayout(name, false);
  toast("配置: " + layoutDisplayName(name));
}

// ─── 表示範囲（起点まわり / 選んだアプリのまわり / 全体） ───
// アプリが多い図は、開いた直後は起点とその直接の関連先だけを見せる。「全体を表示」でいつでも全体へ戻れる
const SCOPE_AUTO_MIN_APPS = 15;
let viewScope = { mode: "all", roots: [], depth: 1 };
let scopeMembers = null; // 表示するノードIDの集合（全体のときは null）
const scopePositionCache = new Map(); // 表示範囲ごとに、最後の位置を覚えておく（戻ったときに配置し直さない）
function normalizeScope(raw){
  const mode = raw && raw.mode === "around" ? "around" : "all";
  const depth = raw && Number(raw.depth) === 2 ? 2 : 1;
  const roots = mode === "around" ? [...new Set((raw.roots || []).map(String))].filter(id=>cy.getElementById("a"+id).length) : [];
  if(mode === "around" && !roots.length) return { mode: "all", roots: [], depth };
  return { mode, roots, depth };
}
function scopeKeyOf(scope){
  return scope.mode === "all" ? "all" : "around:" + scope.roots.slice().sort().join(",") + ":" + scope.depth;
}
function startRootIds(){
  return [...startAppIdSet].filter(id=>{
    const n=cy.getElementById("a"+id);
    return n.length && !n.hasClass("app-manual-hidden");
  });
}
// 起点から depth 段の関連で届くノード（線の向きは問わない。手動で消した線・アプリは辿らない）
function computeScopeMembers(rootIds, depth){
  const members = new Set(rootIds.map(id=>"a"+id));
  let frontier = [...members];
  for(let d = 0; d < depth; d++){
    const next = [];
    frontier.forEach(id=>{
      cy.getElementById(id).connectedEdges().forEach(e=>{
        if(e.hasClass("rel-manual-hidden")) return;
        const other = e.source().id() === id ? e.target() : e.source();
        if(other.hasClass("app-manual-hidden") || members.has(other.id())) return;
        members.add(other.id());
        next.push(other.id());
      });
    });
    frontier = next;
    if(!frontier.length) break;
  }
  return members;
}
function appNodeCount(){
  return cy.nodes().filter(n=>!n.hasClass("note-node") && !n.hasClass("app-manual-hidden")).length;
}
// 起点まわりの表示で、アプリが十分に減るときだけ既定にする（全アプリを起点にした図などは全体を出す）
function defaultScope(){
  const roots = startRootIds();
  const total = appNodeCount();
  if(!roots.length || total <= SCOPE_AUTO_MIN_APPS) return { mode: "all", roots: [], depth: 1 };
  const around = computeScopeMembers(roots, 1);
  if(around.size >= total * 0.75) return { mode: "all", roots: [], depth: 1 };
  return { mode: "around", roots, depth: 1 };
}
function canShowStartScope(){
  const roots = startRootIds();
  if(!roots.length) return false;
  return computeScopeMembers(roots, viewScope.depth || 1).size < appNodeCount();
}
function isStartScope(scope){
  const roots = startRootIds().slice().sort().join(",");
  return scope.mode === "around" && scope.roots.slice().sort().join(",") === roots;
}
function applyScopeClasses(){
  cy.batch(()=>{
    cy.elements().removeClass("scope-out");
    if(!scopeMembers) return;
    cy.nodes().forEach(n=>{ if(!n.hasClass("note-node") && !scopeMembers.has(n.id())) n.addClass("scope-out"); });
    cy.edges().forEach(e=>{ if(e.source().hasClass("scope-out") || e.target().hasClass("scope-out")) e.addClass("scope-out"); });
  });
}
function isNodeInScope(node){
  return !!node && node.length > 0 && !node.hasClass("scope-out");
}
function snapshotScopePositions(){
  const positions = {};
  cy.nodes().not(".note-node").not(".scope-out").forEach(n=>{
    const p = n.position();
    positions[n.id()] = { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
  });
  scopePositionCache.set(scopeKeyOf(viewScope), positions);
}
function restoreScopePositions(scope){
  const cached = scopePositionCache.get(scopeKeyOf(scope));
  if(!cached) return false;
  const targets = cy.nodes().not(".note-node").not(".scope-out");
  if(!targets.every(n=>cached[n.id()])) return false;
  targets.forEach(n=>{ if(!n.locked()) n.position(cached[n.id()]); });
  return true;
}
// 表示範囲を切り替える。前に表示した範囲なら、そのときの位置に戻す（配置し直さない）
function setScope(next, options){
  const opts = options || {};
  if(!opts.initial) snapshotScopePositions();
  viewScope = normalizeScope(next);
  scopeMembers = viewScope.mode === "all" ? null : computeScopeMembers(viewScope.roots, viewScope.depth);
  applyScopeClasses();
  clearFocus(true);
  cy.elements().removeClass("analysis-hit analysis-dim path-node path-edge");
  applyRelationFilter();
  if(typeof refreshScopeBar === "function") refreshScopeBar();
  if(typeof refreshAppList === "function") refreshAppList();
  if(opts.keepPositions) return Promise.resolve();
  if(restoreScopePositions(viewScope)){
    fit();
    return Promise.resolve();
  }
  return runLayout(ER_OPTIONS.layoutName || "dagre", !!opts.initial);
}
function showAllScope(){
  if(viewScope.mode === "all"){ fit(); return Promise.resolve(); }
  const done = setScope({ mode: "all" });
  toast("全体を表示: " + appNodeCount() + "アプリ");
  closeAllMenus();
  return done;
}
function showStartScope(){
  const roots = startRootIds();
  if(!roots.length){ toast("起点のアプリが図にありません"); return Promise.resolve(); }
  const done = setScope({ mode: "around", roots, depth: viewScope.depth || 1 });
  toast("起点まわりを表示");
  closeAllMenus();
  return done;
}
function showAroundApp(appId, depth){
  const node = cy.getElementById("a"+appId);
  if(!node.length || node.hasClass("app-manual-hidden")){ toast("このアプリは図にありません"); return Promise.resolve(); }
  const done = setScope({ mode: "around", roots: [String(appId)], depth: depth || viewScope.depth || 1 });
  const app = findApp(appId);
  toast((app ? app.name : "アプリ") + " のまわりを表示");
  return done;
}
function setScopeDepth(depth){
  const d = Number(depth) === 2 ? 2 : 1;
  if(viewScope.mode !== "around"){ viewScope.depth = d; if(typeof refreshScopeBar === "function") refreshScopeBar(); return Promise.resolve(); }
  if(viewScope.depth === d) return Promise.resolve();
  return setScope({ mode: "around", roots: viewScope.roots, depth: d });
}
// 図の外にあるアプリへ移るときは、そのアプリのまわりを表示する
function ensureNodeVisible(node){
  if(!node || !node.length) return Promise.resolve(false);
  if(isNodeInScope(node)) return Promise.resolve(true);
  const appId = node.data("appId");
  if(appId != null) return showAroundApp(appId).then(()=>true);
  // 未取得の参照先は、参照しているアプリのまわりを表示する
  const source = node.incomers("node").filter(n=>n.data("appId")!=null).first();
  if(source.length) return showAroundApp(source.data("appId")).then(()=>isNodeInScope(node));
  return showAllScope().then(()=>true);
}

const relationKindState = { LOOKUP: true, REF: true, ACTION: true };
let relationLabelVisible = false;
let edgeBundling = true;
let focusMode = true;
let focusDepth = 1;
let focusDirection = "both";
let currentFocusNodeId = "";
let lastTappedNodeId = "";
let activeAppId = 0;
const pinnedNodeIds = new Set();

// ─── 同じアプリ間の線をまとめる（シンプルモードでも使う） ───
let simpleMode = false;
let simpleModeRestore = null; // { density, labels, bundling }
const collapsedEdgeLabelBackup = new Map(); // 代表エッジの元ラベル退避

function collapseParallelEdges(on){
  // いったん全解除
  cy.edges().removeClass("edge-collapsed");
  collapsedEdgeLabelBackup.forEach((label, id)=>{
    const e = cy.getElementById(id);
    if(e.length) e.data({label, bundleCount:1, bundleWidth:1.8, bundleIds:""});
  });
  collapsedEdgeLabelBackup.clear();
  if(!on) return;
  // 同じ「起点→宛先→種類」の可視エッジを1本に集約し、線種の意味を保つ
  const groups = new Map();
  cy.edges().forEach(e=>{
    if(e.hasClass("rel-manual-hidden") || e.hasClass("rel-hidden")) return;
    const key = e.source().id() + "→" + e.target().id() + "→" + e.data("kind");
    const list = groups.get(key) || [];
    list.push(e);
    groups.set(key, list);
  });
  groups.forEach(list=>{
    if(list.length < 2) return;
    list.slice(1).forEach(e=>e.addClass("edge-collapsed"));
    const rep = list[0];
    collapsedEdgeLabelBackup.set(rep.id(), rep.data("label") || "");
    rep.data({
      label: list.length + "本の" + relationKindJp(rep.data("kind")),
      bundleCount: list.length,
      bundleWidth: Math.min(6, 1.8 + (list.length - 1) * 0.9),
      bundleIds: list.map(e=>e.id()).join(",")
    });
  });
}
// まとめた線が表す関連線（まとめていなければ自分だけ）
function bundleMembers(edge){
  const ids = String(edge.data("bundleIds") || "").split(",").filter(Boolean);
  if(!ids.length) return edge;
  return ids.map(id=>cy.getElementById(id)).filter(e=>e.length).reduce((all,e)=>all.union(e), cy.collection());
}
// まとめた線の代表（まとめていなければ自分）
function bundleRepresentative(edge){
  if(!edge || !edge.length || !edge.hasClass("edge-collapsed")) return edge;
  const rep = cy.edges().filter(e=>String(e.data("bundleIds")||"").split(",").includes(edge.id())).first();
  return rep.length ? rep : edge;
}
function syncBundleButton(){
  const btn = document.getElementById("bundle-btn");
  if(btn){ btn.classList.toggle("active", edgeBundling); btn.setAttribute("aria-pressed", String(edgeBundling)); }
}
function toggleEdgeBundling(){
  edgeBundling = !edgeBundling;
  syncBundleButton();
  applyRelationFilter();
  toast(edgeBundling ? "同じアプリ間の線を 1 本にまとめました" : "関連ごとに線を分けて表示します");
}

function syncSimpleModeButton(){
  const btn = document.getElementById("simple-mode-btn");
  if(btn){ btn.classList.toggle("active", simpleMode); btn.setAttribute("aria-pressed", String(simpleMode)); }
}

function setSimpleMode(on, keepDensity){
  if(simpleMode === !!on) { syncSimpleModeButton(); return; }
  simpleMode = !!on;
  if(simpleMode){
    simpleModeRestore = { density: ER_OPTIONS.fieldDensity, labels: relationLabelVisible, bundling: edgeBundling };
    ER_OPTIONS.fieldDensity = "none";
    relationLabelVisible = false;
    edgeBundling = true;
    collapseParallelEdges(true);
  }else{
    if(!keepDensity) ER_OPTIONS.fieldDensity = (simpleModeRestore && simpleModeRestore.density && simpleModeRestore.density !== "none") ? simpleModeRestore.density : "standard";
    relationLabelVisible = simpleModeRestore ? !!simpleModeRestore.labels : false;
    edgeBundling = simpleModeRestore ? simpleModeRestore.bundling !== false : true;
    simpleModeRestore = null;
    collapseParallelEdges(edgeBundling);
  }
  refreshNodeLabels();
  applyCyTheme();
  syncDensityControl();
  applyRelationLabelVisibility();
  syncSimpleModeButton();
  syncBundleButton();
}

function toggleSimpleMode(){
  setSimpleMode(!simpleMode);
  toast(simpleMode ? "シンプル: 項目を隠してアプリのつながりだけを表示" : "シンプルを解除しました");
}

function syncLegendState(){
  [["LOOKUP","legend-lookup-edge"],["REF","legend-ref-edge"],["ACTION","legend-action-edge"]].forEach(([kind,id])=>{
    const el = document.getElementById(id);
    if(el){ el.classList.toggle("off", !relationKindState[kind]); el.setAttribute("aria-pressed", String(!!relationKindState[kind])); }
  });
}
function syncRelationLabelButton(){
  const btn = document.getElementById("rel-label-btn");
  if(!btn) return;
  btn.classList.toggle("active", relationLabelVisible);
  btn.setAttribute("aria-pressed", String(relationLabelVisible));
}
function applyRelationLabelVisibility(){
  cy.edges().toggleClass("label-hidden", !relationLabelVisible);
  syncRelationLabelButton();
}
function toggleRelationLabels(){
  relationLabelVisible = !relationLabelVisible;
  applyRelationLabelVisibility();
  toast(relationLabelVisible ? "線のラベルを常に表示します" : "線のラベルは、選んだ線とマウスを乗せた線だけに出します");
}
function setActiveApp(appId){
  activeAppId = Number(appId) || 0;
  if(typeof refreshAppList === "function") refreshAppList();
}

function applyRelationFilter(){
  const partialFilter = !relationKindState.LOOKUP || !relationKindState.REF || !relationKindState.ACTION;
  cy.edges().forEach(e=>{
    const visible = !!relationKindState[e.data("kind")];
    e.toggleClass("rel-hidden", !visible);
  });
  cy.nodes().forEach(n=>{
    const visibleEdgeCount = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden")).length;
    n.toggleClass("isolated-by-filter", partialFilter && visibleEdgeCount === 0);
  });
  collapseParallelEdges(edgeBundling || simpleMode);
  refreshNoLinkClasses();
  syncLegendState();
}

function collectFocusSet(rootNode, depth, direction){
  let nodes = cy.collection(rootNode);
  let edges = cy.collection();
  let frontier = cy.collection(rootNode);
  const visited = new Set([rootNode.id()]);

  for(let i=0;i<depth;i++){
    let next = cy.collection();
    frontier.forEach(n=>{
      let candidateEdges = n.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
      if(direction==="out") candidateEdges = candidateEdges.filter(e=>e.source().id()===n.id());
      if(direction==="in") candidateEdges = candidateEdges.filter(e=>e.target().id()===n.id());

      candidateEdges.forEach(e=>{
        edges = edges.union(e);
        let linked = cy.collection();
        if(direction==="out") linked = linked.union(e.target());
        else if(direction==="in") linked = linked.union(e.source());
        else linked = linked.union(e.connectedNodes().difference(n));

        linked.forEach(nn=>{
          if(visited.has(nn.id())) return;
          visited.add(nn.id());
          nodes = nodes.union(nn);
          next = next.union(nn);
        });
      });
    });
    frontier = next;
    if(frontier.length===0) break;
  }

  return { nodes, edges };
}

function applyFocusToNode(node, silent){
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!focusMode || !node || !node.length) return;

  const depth = Math.max(1, Number(focusDepth) || 1);
  const result = collectFocusSet(node, depth, focusDirection);
  cy.elements().not(".note-node").addClass("focus-dim");
  result.nodes.removeClass("focus-dim").addClass("focus-neighbor");
  result.edges.removeClass("focus-dim").addClass("focus-edge");
  node.removeClass("focus-neighbor").addClass("focus-root");
  currentFocusNodeId = node.id();

  if(!silent){
    const relatedCount = Math.max(0, result.nodes.length - 1);
    toast("関連強調: "+relatedCount+"アプリ");
  }
}

function clearFocus(silent){
  currentFocusNodeId = "";
  cy.elements().removeClass("focus-root focus-neighbor focus-edge focus-dim");
  if(!silent) toast("強調を解除しました");
}

function syncFocusButton(){
  const btn = document.getElementById("focus-toggle-btn");
  if(!btn) return;
  btn.classList.toggle("active", focusMode);
  btn.setAttribute("aria-pressed", String(focusMode));
}
function syncRelationKindButtons(){
  ["LOOKUP","REF","ACTION"].forEach(kind=>{
    const btn = document.getElementById(kind==="LOOKUP" ? "rel-lookup-btn" : (kind==="REF" ? "rel-ref-btn" : "rel-action-btn"));
    if(btn){ btn.classList.toggle("active", !!relationKindState[kind]); btn.setAttribute("aria-pressed", String(!!relationKindState[kind])); }
  });
}
function toggleFocusMode(){
  focusMode = !focusMode;
  syncFocusButton();
  if(!focusMode) clearFocus(true);
  else if(currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(focusMode ? "選んだアプリの関連を強調します" : "選んだアプリの関連を強調しません");
}

function updateFocusOptions(){
  focusDepth = Number(document.getElementById("focus-depth")?.value || 1);
  focusDirection = document.getElementById("focus-direction")?.value || "both";
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
}

// ─── 元に戻す (Undo) ───
const undoStack = [];
function pushUndo(label, fn){
  undoStack.push({label, fn});
  if(undoStack.length > 60) undoStack.shift();
}
function undoLast(){
  const entry = undoStack.pop();
  if(!entry){toast("元に戻す操作はありません");return;}
  try{ entry.fn(); }catch(err){ console.error("[ER] undo failed", err); }
  afterGraphChange();
  toast("元に戻しました: "+entry.label);
}
// 図の要素を消した・戻したあとに、一覧と表を合わせる
function afterGraphChange(){
  invalidateRelationCounts();
  if(typeof refreshScopeBar === "function") refreshScopeBar();
  if(typeof refreshAppList === "function") refreshAppList();
  if(typeof refreshActiveTable === "function") refreshActiveTable();
}

const manuallyRemovedEdgeIds = new Set();
const manuallyRemovedNodeIds = new Set();
const nodeHiddenEdgeIds = new Set();

function hideRelationEdges(edges){
  const ids = edges.map(e=>e.id());
  edges.forEach((e)=>{ manuallyRemovedEdgeIds.add(e.id()); e.addClass("rel-manual-hidden"); });
  pushUndo("関連線削除 "+ids.length+"件", ()=>{
    ids.forEach(id=>{
      manuallyRemovedEdgeIds.delete(id);
      const e = cy.getElementById(id);
      if(e.length) e.removeClass("rel-manual-hidden");
    });
    applyRelationFilter();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  });
}
// 選んだ線（まとめた線は、まとめた全部の関連線）
function selectedRelationEdges(){
  let edges = cy.collection();
  cy.edges(":selected").forEach(e=>{ edges = edges.union(bundleMembers(e)); });
  return edges.filter(e=>!e.hasClass("rel-manual-hidden"));
}

function removeSelectedRelations(){
  const edges = selectedRelationEdges();
  if(!edges.length){toast("削除する関連線を選んでください");return;}
  hideRelationEdges(edges);
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  applyRelationFilter();
  afterGraphChange();
  toast("関連線を図から削除しました: "+edges.length+"件（Ctrl+Z で戻せます）");
}

function restoreRemovedRelations(){
  let restored = 0;
  manuallyRemovedEdgeIds.forEach((id)=>{
    const edge = cy.getElementById(id);
    if(edge.length){ edge.removeClass("rel-manual-hidden"); restored += 1; }
  });
  manuallyRemovedEdgeIds.clear();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  applyRelationFilter();
  afterGraphChange();
  toast(restored ? ("削除した関連線を戻しました: "+restored+"件") : "戻す関連線はありません");
}

function hideAppNodes(nodes){
  const nodeIds = [], newEdgeIds = [];
  let edgeCount = 0;
  nodes.forEach((node)=>{
    manuallyRemovedNodeIds.add(node.id());
    nodeIds.push(node.id());
    node.addClass("app-manual-hidden");
    node.connectedEdges().forEach((edge)=>{
      if(!nodeHiddenEdgeIds.has(edge.id()) && !manuallyRemovedEdgeIds.has(edge.id())) newEdgeIds.push(edge.id());
      nodeHiddenEdgeIds.add(edge.id());
      if(!edge.hasClass("rel-manual-hidden")) edgeCount += 1;
      edge.addClass("rel-manual-hidden");
    });
  });
  pushUndo("アプリ削除 "+nodeIds.length+"件", ()=>{
    nodeIds.forEach(id=>{
      manuallyRemovedNodeIds.delete(id);
      const n = cy.getElementById(id);
      if(n.length) n.removeClass("app-manual-hidden");
    });
    newEdgeIds.forEach(id=>{
      nodeHiddenEdgeIds.delete(id);
      const e = cy.getElementById(id);
      if(e.length) e.removeClass("rel-manual-hidden");
    });
    applyRelationFilter();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  });
  return edgeCount;
}

function removeSelectedApps(){
  let nodes = cy.nodes(":selected").not(".app-manual-hidden").not(".note-node");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length && !n.hasClass("app-manual-hidden") && !n.hasClass("note-node")) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("削除するアプリを選んでください");return;}
  const edgeCount = hideAppNodes(nodes);
  applyRelationFilter();
  afterGraphChange();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast("アプリを図から削除しました: "+nodes.length+"件 / 関連線 "+edgeCount+"件（Ctrl+Z で戻せます）");
}

function restoreRemovedApps(){
  let restoredNodes = 0;
  manuallyRemovedNodeIds.forEach((id)=>{
    const node = cy.getElementById(id);
    if(node.length){
      node.removeClass("app-manual-hidden");
      restoredNodes += 1;
    }
  });
  let restoredEdges = 0;
  nodeHiddenEdgeIds.forEach((id)=>{
    const edge = cy.getElementById(id);
    if(!edge.length) return;
    if(manuallyRemovedEdgeIds.has(id)) return;
    edge.removeClass("rel-manual-hidden");
    restoredEdges += 1;
  });
  manuallyRemovedNodeIds.clear();
  nodeHiddenEdgeIds.clear();
  applyRelationFilter();
  afterGraphChange();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(restoredNodes ? ("削除したアプリを戻しました: "+restoredNodes+"件 / 関連線 "+restoredEdges+"件") : "戻すアプリはありません");
}
function toggleRelationKind(kind){
  relationKindState[kind] = !relationKindState[kind];
  syncRelationKindButtons();
  applyRelationFilter();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast(relationKindJp(kind) + "の線: " + (relationKindState[kind] ? "表示" : "非表示"));
}

function pinNode(node,silent){
  if(!node || !node.length) return;
  node.lock();
  node.addClass("pinned-node");
  pinnedNodeIds.add(node.id());
  if(!silent) toast("固定しました: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function unpinNode(node,silent){
  if(!node || !node.length) return;
  node.unlock();
  node.removeClass("pinned-node");
  pinnedNodeIds.delete(node.id());
  if(!silent) toast("固定を解除しました: "+(appMap.get(node.data("appId"))?.name || node.id()));
}

function togglePinFromSelection(){
  let nodes = cy.nodes(":selected");
  if(!nodes.length && lastTappedNodeId){
    const n = cy.getElementById(lastTappedNodeId);
    if(n.length) nodes = nodes.union(n);
  }
  if(!nodes.length){toast("固定するアプリを選んでください");return;}
  const allPinned = nodes.every(n=>pinnedNodeIds.has(n.id()));
  nodes.forEach(n=>{if(allPinned) unpinNode(n,true); else pinNode(n,true);});
  toast(allPinned ? "選んだアプリの固定を解除しました" : "選んだアプリを固定しました");
}

function clearPins(){
  [...pinnedNodeIds].forEach(id=>{
    const n = cy.getElementById(id);
    if(n.length) n.unlock().removeClass("pinned-node");
  });
  pinnedNodeIds.clear();
  toast("固定をすべて解除しました");
}
function relationKindJp(kind){
  return kind==="LOOKUP"?"ルックアップ":(kind==="REF"?"関連レコード一覧":"アプリアクション");
}
