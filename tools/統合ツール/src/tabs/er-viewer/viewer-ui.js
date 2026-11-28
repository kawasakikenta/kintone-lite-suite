// ER図ビューアー: 画面の部品（検索・アプリ一覧・詳細・構造チェック・表のビュー・メニュー・キーボード・印刷）。

// ─── 関連の説明（詳細・表・吹き出し・出力で共通） ───
// 関連の詳細（コピーするフィールド・表示するフィールド・絞り込み条件）。er-model.ts の describeErRelation* と同じ結果にする。
function relCopyText(r){
  const pairs=Array.isArray(r&&r.copyFields)?r.copyFields:[];
  return pairs.filter(m=>m&&m.from&&m.to).map(m=>r.kind==="ACTION"?m.from+" → 起動先 "+m.to:"参照先 "+m.from+" → "+m.to).join(" / ");
}
function relDisplayText(r){
  return (Array.isArray(r&&r.displayFields)?r.displayFields:[]).filter(Boolean).join(" / ");
}
function relFilterText(r){
  return typeof (r&&r.filterCond)==="string"?r.filterCond.trim():"";
}
function relFieldsText(r){
  return r&&r.kind==="REF"?relDisplayText(r):relCopyText(r);
}
// 詳細パネルの関連の行に出す、コピー・表示・絞り込みの説明（折り返して全文を示す）
function relationDetailHtml(rel){
  const rows=[["コピー",relCopyText(rel)],["表示",relDisplayText(rel)],["絞り込み",relFilterText(rel)]].filter(row=>row[1]);
  return rows.map(row=>'<div class="field-detail"><b>'+row[0]+'</b>: '+escapeHtml(row[1])+'</div>').join("");
}
function fieldLabelByCode(app,code){
  if(!app||!code) return "";
  const field=(app.allFields||app.fields||[]).find(f=>f&&(String(f.code)===String(code)||String(f.path||"")===String(code)));
  return field?buildFieldDisplayName(field):"";
}
function labelWithCode(label,code){
  const l=String(label||""),c=String(code||"");
  if(!l) return c;
  if(!c||l===c) return l;
  return l+"（"+c+"）";
}
// 参照元の項目: ルックアップは項目、関連レコード一覧は一覧の名前と結合元、アプリアクションはアクション名
function relSourceFieldText(rel){
  if(rel.kind==="REF") return "一覧「"+(rel.controlFieldLabel||rel.controlField||"-")+"」・結合 "+labelWithCode(rel.fromDisplay||rel.fromLabel,rel.sourceJoinField||rel.from);
  if(rel.kind==="ACTION") return "アクション「"+(rel.fromDisplay||rel.fromLabel||"-")+"」";
  return labelWithCode(rel.fromDisplay||rel.fromLabel,String(rel.from||"").startsWith("__")?"":rel.from);
}
function relTargetFieldText(rel,target){
  if(rel.kind==="ACTION"||!rel.toField) return "";
  return labelWithCode(fieldLabelByCode(target,rel.toField),rel.toField);
}
function appDisplayName(app,id){
  return app?String(app.name||("アプリ "+app.id)):"未取得の参照先";
}

// ─── 検索（図の強調・アプリ一覧・表で共通） ───
let searchQuery="";
let searchMatchNodes=[],searchMatchIndex=-1,searchHiddenOnlyIds=new Set();
function normalizedQuery(){ return String(searchQuery||"").trim().toLowerCase(); }
function fieldMatchesQuery(f,low){
  return buildFieldDisplayName(f).toLowerCase().includes(low)||String(f.code||"").toLowerCase().includes(low)||String(f.path||"").toLowerCase().includes(low);
}
// アプリ名・ID と、取得済みの全項目の名前・コードで探す（表示密度によってカードに出ない項目でも、どのアプリにあるかを探せるように）
function appMatchesQuery(app,low){
  if(!low) return true;
  if(String(app.name||"").toLowerCase().includes(low) || String(app.id).includes(low)) return true;
  return allFieldsForApp(app).some(f=>!isFieldHidden(app,f)&&fieldMatchesQuery(f,low));
}
function updateSearchMeta(query, matched, hiddenOnly, outside){
  const pill = document.getElementById("search-meta");
  if(!pill) return;
  const normalized = String(query || "").trim();
  pill.hidden = !normalized;
  if(!normalized){
    pill.innerHTML = "<b>検索</b> すべて";
    pill.title = "";
    return;
  }
  // 操作バーが折り返さないよう、表示は短いまま、図に出ていない項目で一致した件数は吹き出しで示す
  pill.innerHTML = "<b>検索</b> " + matched + "件";
  const notes = [];
  if(outside) notes.push("うち" + outside + "件は図の表示範囲の外です（Enter でそのアプリのまわりへ移ります）");
  if(hiddenOnly) notes.push("うち" + hiddenOnly + "件は、現在の表示密度では図に出ていない項目で一致したアプリです（表示密度を「詳細」にすると項目を確認できます）");
  pill.title = normalized + (notes.length ? "。" + notes.join("。") : "");
}
function searchGraph(q){
  searchQuery=String(q||"");
  cy.elements().removeClass("highlighted dimmed");
  const low=normalizedQuery();
  if(!low){
    updateSearchMeta("", 0);
    searchMatchNodes=[];searchMatchIndex=-1;
    refreshAppList();
    refreshActiveTable();
    return;
  }
  const fieldMatches=f=>fieldMatchesQuery(f,low);
  searchHiddenOnlyIds=new Set();
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    if(!app) return false;
    if(app.name.toLowerCase().includes(low) || String(app.id).includes(low)) return true;
    if(visibleFieldsForNode(app).some(fieldMatches)) return true;
    if(allFieldsForApp(app).some(f=>!isFieldHidden(app,f)&&fieldMatches(f))){ searchHiddenOnlyIds.add(n.id()); return true; }
    return false;
  });
  const outside=matched.filter(n=>n.hasClass("scope-out")).length;
  updateSearchMeta(q, matched.length, searchHiddenOnlyIds.size, outside);
  searchMatchNodes=matched.sort((a,b)=>String(appMap.get(a.data("appId"))?.name||"").localeCompare(String(appMap.get(b.data("appId"))?.name||""))).toArray();
  searchMatchIndex=-1;
  if(matched.length){
    matched.addClass("highlighted");
    const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
    cy.elements().not(matched).not(visibleEdges).not(".note-node").addClass("dimmed");
  }
  refreshAppList();
  refreshActiveTable();
}
function focusNextSearchMatch(){
  if(activeView!=="diagram"){ setView("diagram"); }
  if(!searchMatchNodes.length){toast("検索に一致するアプリがありません");return;}
  searchMatchIndex=(searchMatchIndex+1)%searchMatchNodes.length;
  const n=searchMatchNodes[searchMatchIndex];
  const index=searchMatchIndex;
  ensureNodeVisible(n).then(()=>{
    cy.animate({center:{eles:n},zoom:Math.max(cy.zoom(),1.1)},{duration:300});
    toast("一致 "+(index+1)+"/"+searchMatchNodes.length+": "+(appMap.get(n.data("appId"))?.name||"")+(searchHiddenOnlyIds.has(n.id())?"（一致した項目は現在の表示密度では図に出ていません）":""));
  });
}
function clearSearch(){
  const box=document.getElementById("search-box");
  if(box) box.value="";
  searchGraph("");
}

// ─── 詳細パネル（アプリ・関連線・未取得の参照先） ───
let detailMode="";
let detailEdgeId="";
function openSidePanel(id){
  ["detail","analysis-panel"].forEach(other=>{ if(other!==id) document.getElementById(other)?.classList.remove("open"); });
  document.getElementById("analysis-toggle-btn")?.setAttribute("aria-expanded",String(id==="analysis-panel"));
  document.getElementById(id)?.classList.add("open");
}
function detailBadgesHtml(app){
  const badges=[];
  if(isMarkedStartApp(app)) badges.push('<span class="badge badge-start">起点</span>');
  if(isFailedApp(app)) badges.push('<span class="badge badge-failed">⚠ 取得失敗</span>');
  else if(isPartialApp(app)) badges.push('<span class="badge badge-partial">△ 一部取得</span>');
  else if(!app.isCustom) badges.push('<span class="badge badge-ok">✓ 取得完了</span>');
  if(app.isCustom) badges.push('<span class="badge badge-custom">手動で追加</span>');
  if(!(app.relations||[]).length&&!incomingRelationCount(app.id)) badges.push('<span class="badge badge-nolink">関連なし</span>');
  if(isInSpaceApp(app)) badges.push('<span class="badge badge-nolink">スペース #'+escapeHtml(erSpaceId)+'</span>');
  const node=cy.getElementById("a"+app.id);
  if(node.length&&node.hasClass("app-manual-hidden")) badges.push('<span class="badge badge-nolink">図から削除済み</span>');
  return '<div class="detail-badges">'+badges.join("")+'</div>';
}
function renderAppDetail(app){
  detailMode="app";
  detailEdgeId="";
  const visibleFields = visibleFieldsForNode(app);
  const fieldGroups = detailFieldGroups(app);
  document.getElementById("detail-title").textContent = app.name;
  const realFieldTotal = typeof app.totalFieldCount === "number" ? app.totalFieldCount : visibleFields.length;
  const fieldPillText = realFieldTotal > visibleFields.length
    ? '<b>項目</b> ' + visibleFields.length + '/' + realFieldTotal
    : '<b>項目</b> ' + visibleFields.length;
  const hiddenCnt = hiddenFieldCount(app);
  const facts=[app.isCustom ? "手動で追加したアプリ" : "App " + escapeHtml(app.id)];
  if(app.createdAt) facts.push("作成 " + escapeHtml(new Date(app.createdAt).toLocaleDateString()));
  if(app.modifiedAt) facts.push("更新 " + escapeHtml(new Date(app.modifiedAt).toLocaleDateString()));
  if(!app.isCustom) facts.push("探索の深さ " + (app.depth || 0));
  const node = cy.getElementById("a"+app.id);
  document.getElementById("detail-meta").innerHTML = detailBadgesHtml(app)
    + '<div class="app-meta">' + facts.join(" ・ ") + '</div>'
    + '<div class="detail-actions">'
    + (node.length && !node.hasClass("app-manual-hidden") ? '<button type="button" class="tb tb-primary" data-app="' + escapeHtml(String(app.id)) + '" data-action="show-around">このアプリのまわりを表示</button>' : '')
    + '<button type="button" class="tb" title="図での名前と枠の色を変えます（kintone のアプリ名は変わりません）" data-app="' + escapeHtml(String(app.id)) + '" data-action="edit-app">名前・色を編集</button>'
    + (hiddenCnt ? '<button type="button" class="tb" title="このアプリで隠した項目をすべて戻します" data-app="' + escapeHtml(String(app.id)) + '" data-action="restore-fields">隠した項目 ' + hiddenCnt + ' 件を戻す</button>' : '')
    + '</div>'
    + '<div class="detail-chip-row">'
    + '<span class="meta-pill" title="表示中 / 総数（表示数はカードの項目の設定によります）">' + fieldPillText + '</span>'
    + '<span class="meta-pill"><b>ルックアップ</b> ' + fieldGroups.lookup.length + '</span>'
    + '<span class="meta-pill"><b>関連レコード一覧</b> ' + fieldGroups.ref.length + '</span>'
    + '<span class="meta-pill"><b>必須</b> ' + fieldGroups.required.length + '</span>'
    + '</div>'
    + ((app.issues||[]).length?'<div class="analysis-note '+(isFailedApp(app)?'is-error':'is-warn')+'" role="status"><strong>'+(isFailedApp(app)?'取得失敗':'一部取得')+'</strong><br>'+(app.issues||[]).map(issue=>escapeHtml(issue.message||issue.code||"取得上の注意")).join('<br>')+'</div>':'');

  let relHtml = "";
  const outbound = (app.relations || []).map((rel, ri)=>({ rel, ri }));
  relHtml += '<div class="field-group-title">参照している関連 (' + outbound.length + ')</div>';
  if(!outbound.length) relHtml += '<div class="field-sub">このアプリから参照している関連はありません。</div>';
  outbound
    .slice()
    .sort((a,b)=>(a.rel.kind===b.rel.kind?0:(["LOOKUP","REF","ACTION"].indexOf(a.rel.kind)-["LOOKUP","REF","ACTION"].indexOf(b.rel.kind)))||String(a.rel.fromDisplay || a.rel.fromLabel || a.rel.from || '').localeCompare(String(b.rel.fromDisplay || b.rel.fromLabel || b.rel.from || '')))
    .forEach((item)=>{
      const rel = item.rel;
      const targetApp = appMap.get(rel.toApp);
      const targetLabel = (targetApp ? targetApp.name : "未取得の参照先") + " (App " + rel.toApp + ")";
      const relationLabel = rel.kind==="REF" ? (rel.controlFieldLabel || rel.fromDisplay || rel.fromLabel || "関連レコード一覧") : (rel.fromDisplay || rel.fromLabel || rel.from || relationKindJp(rel.kind));
      const relationMeta = [];
      if(rel.kind==="REF") relationMeta.push("結合: "+(rel.fromDisplay||rel.sourceJoinField||rel.from||"?")+" → "+(rel.toField||"?"));
      else if(rel.toField) relationMeta.push("参照先の項目: " + labelWithCode(fieldLabelByCode(targetApp,rel.toField),rel.toField));
      if(rel.kind==="LOOKUP" && rel.fromPath && rel.fromPath !== rel.from) relationMeta.push("path: " + rel.fromPath);
      const edgeId = "e_" + app.id + "_" + item.ri;
      const edge = cy.getElementById(edgeId);
      const edgeHidden = edge.length && edge.hasClass("rel-manual-hidden");
      const relEditBtn = '<button type="button" class="row-edit" title="この関連線を編集（名前・種類）" aria-label="この関連線を編集" data-edge="' + escapeHtml(edgeId) + '" data-app="' + escapeHtml(String(app.id)) + '" data-action="edit-relation-row">✎</button>';
      const edgeBtn = edge.length
        ? relEditBtn + '<button type="button" class="row-del' + (edgeHidden ? ' row-del--restore' : '') + '" title="' + (edgeHidden ? 'この関連線を戻す' : 'この関連線を図から削除') + '" aria-label="' + (edgeHidden ? 'この関連線を戻す' : 'この関連線を図から削除') + '" data-edge="' + escapeHtml(edgeId) + '" data-app="' + escapeHtml(String(app.id)) + '" data-action="toggle-relation-row">' + (edgeHidden ? '↺' : '✕') + '</button>'
        : '';
      relHtml += '<div class="field-row' + (edgeHidden ? ' field-row--hidden' : '') + '">'
        + '<span class="field-icon kind-' + escapeHtml(rel.kind) + '" aria-hidden="true">→</span>'
        + '<div class="field-main">'
        + '<div class="field-name"><span class="kind-badge kind-' + escapeHtml(rel.kind) + '"><i></i>' + escapeHtml(relationKindJp(rel.kind)) + '</span> ' + escapeHtml(relationLabel) + '</div>'
        + '<div class="field-sub wrap">参照先: <button type="button" class="link-btn" data-app="' + escapeHtml(String(rel.toApp)) + '" data-action="focus-app">' + escapeHtml(targetLabel) + '</button>' + (relationMeta.length ? ' / ' + escapeHtml(relationMeta.join(' / ')) : '') + '</div>'
        + relationDetailHtml(rel)
        + '</div>'
        + edgeBtn
        + '</div>';
    });
  const inboundRelations = [];
  APPS.forEach((sourceApp)=>{
    (sourceApp.relations || []).forEach((rel)=>{
      if(String(rel.toApp) === String(app.id)) inboundRelations.push({ sourceApp, rel });
    });
  });
  relHtml += '<div class="field-group-title">このアプリを参照している関連 (' + inboundRelations.length + ')</div>';
  if(!inboundRelations.length) relHtml += '<div class="field-sub">このアプリを参照している関連はありません。</div>';
  inboundRelations
    .slice()
    .sort((a,b)=>String(a.sourceApp.name || a.sourceApp.id).localeCompare(String(b.sourceApp.name || b.sourceApp.id)))
    .forEach((item)=>{
      const rel=item.rel;
      const sourceLabel=(item.sourceApp.name || ("アプリ "+item.sourceApp.id)) + " (App " + item.sourceApp.id + ")";
      const relationName=rel.kind==="REF"?(rel.controlFieldLabel||rel.fromDisplay||rel.fromLabel||"関連レコード一覧"):(rel.fromDisplay || rel.fromLabel || rel.from || relationKindJp(rel.kind));
      const meta=[];
      if(rel.toField) meta.push((rel.kind==="REF"?"結合先: ":"参照先の項目: ") + labelWithCode(fieldLabelByCode(app,rel.toField),rel.toField));
      relHtml += '<button type="button" class="field-row detail-relation-button" data-app="' + escapeHtml(String(item.sourceApp.id)) + '" data-action="focus-app">'
        + '<span class="field-icon kind-' + escapeHtml(rel.kind) + '" aria-hidden="true">←</span>'
        + '<div class="field-main"><div class="field-name">' + escapeHtml(sourceLabel) + '</div><div class="field-sub">' + escapeHtml(relationKindJp(rel.kind) + ": " + relationName + (meta.length ? " / " + meta.join(" / ") : "")) + '</div>' + relationDetailHtml(rel) + '</div>'
        + '<span class="field-type">被参照</span></button>';
    });
  document.getElementById("detail-relations").innerHTML = relHtml;

  let fieldHtml = "";
  const renderGroup = (title, fields, tagClass, tagLabel) => {
    if(!fields.length) return;
    fieldHtml += '<div class="field-group-title">' + title + ' (' + fields.length + ')</div>';
    fields.forEach((field)=>{
      let tags = "";
      if(tagLabel) tags += '<span class="tag ' + tagClass + '">' + tagLabel + '</span>';
      if(field.required && tagLabel !== "必須") tags += '<span class="tag tag-req">必須</span>';
      if(field.inSubtable) tags += '<span class="tag tag-sub">表</span>';
      if(field.unique) tags += '<span class="tag tag-pk">重複不可</span>';
      const fieldName = buildFieldDisplayName(field);
      const meta = ["code: " + (field.code || "-")];
      if(field.path && field.path !== field.code) meta.push("path: " + field.path);
      if(field.tableLabel) meta.push("table: " + field.tableLabel);
      fieldHtml += '<div class="field-row" title="' + escapeHtml(fieldName) + '">'
        + '<span class="field-icon" aria-hidden="true">' + fieldIconForLabel(field) + '</span>'
        + '<div class="field-main">'
        + '<div class="field-name">' + escapeHtml(fieldName) + tags + '</div>'
        + '<div class="field-sub">' + escapeHtml(meta.join(' / ')) + '</div>'
        + '</div>'
        + '<span class="field-type">' + escapeHtml(fieldTypeJpLabel(field.type)) + '</span>'
        + '<button type="button" class="row-edit" title="この項目を編集（名前・種類・区分）" aria-label="この項目を編集" data-app="' + escapeHtml(String(app.id)) + '" data-key="' + escapeHtml(encodeURIComponent(fieldHideKey(app, field))) + '" data-action="edit-field-row">✎</button>'
        + '<button type="button" class="row-del" title="この項目を図から隠す" aria-label="この項目を図から隠す" data-app="' + escapeHtml(String(app.id)) + '" data-key="' + escapeHtml(encodeURIComponent(fieldHideKey(app, field))) + '" data-action="hide-field-row">✕</button>'
        + '</div>';
    });
  };
  renderGroup("主キー", fieldGroups.pk, "tag-pk", "PK");
  renderGroup("ルックアップ (FK)", fieldGroups.lookup, "tag-fk", "FK");
  renderGroup("関連レコード一覧", fieldGroups.ref, "tag-ref", "関連");
  renderGroup("必須の項目", fieldGroups.required, "tag-req", "必須");
  renderGroup("サブテーブル", fieldGroups.subtable, "tag-sub", "表");
  renderGroup("そのほかの項目", fieldGroups.normal, "", "");
  const fieldFilterHtml = visibleFields.length > 8
    ? '<input class="detail-filter" type="search" placeholder="このアプリの項目を絞り込む" aria-label="このアプリの項目を絞り込む" data-input="detail-filter">'
    : '';
  document.getElementById("detail-fields").innerHTML = '<div class="detail-section">' + fieldFilterHtml + (fieldHtml || '<div class="field-group-title">項目</div><div class="field-sub">表示できる項目はありません（カードの項目の設定を「詳細」にすると増えます）。</div>') + '</div>';

  openSidePanel("detail");
  setActiveApp(app.id);
}
function renderGhostDetail(node){
  detailMode="ghost";
  detailEdgeId=node.id();
  const targetAppId=node.data("targetAppId")||"不明";
  const inbound=[];
  APPS.forEach((sourceApp)=>{
    (sourceApp.relations||[]).forEach((rel)=>{
      if(String(rel.toApp)===String(targetAppId)) inbound.push({sourceApp,rel});
    });
  });
  document.getElementById("detail-title").textContent="未取得の参照先";
  document.getElementById("detail-meta").innerHTML='<div class="detail-badges"><span class="badge badge-ghost">？ 未取得</span></div><div class="app-meta">App '+escapeHtml(String(targetAppId))+'</div>'
    +'<div class="analysis-note is-warn" role="status"><strong>図の外にある参照先です</strong><br>探索の深さ・閲覧権限・削除済みなどのため、このアプリの設定は取得していません。下は、取得したアプリ側に残っている参照の情報です。</div>';
  let relationHtml='<div class="field-group-title">この参照先へ向かう関連 ('+inbound.length+')</div>';
  inbound.forEach((item)=>{
    relationHtml+='<button type="button" class="field-row detail-relation-button" data-app="'+escapeHtml(String(item.sourceApp.id))+'" data-action="focus-app">'
      +'<span class="field-icon" aria-hidden="true">←</span><div class="field-main"><div class="field-name">'+escapeHtml(item.sourceApp.name+' (App '+item.sourceApp.id+')')+'</div>'
      +'<div class="field-sub">'+escapeHtml(relationKindJp(item.rel.kind)+": "+exportRelationLabel(item.rel))+'</div>'+relationDetailHtml(item.rel)+'</div><span class="field-type">参照元</span></button>';
  });
  document.getElementById("detail-relations").innerHTML=relationHtml;
  document.getElementById("detail-fields").innerHTML='<div class="field-group-title">項目</div><div class="field-sub">参照先のアプリを取得していないため、項目は表示できません。</div>';
  openSidePanel("detail");
  setActiveApp(0);
}
// 関連線を選んだときの詳細。まとめた線は、まとめた関連線をすべて並べる
function renderEdgeDetail(edge){
  if(!edge||!edge.length) return;
  detailMode="edge";
  detailEdgeId=edge.id();
  const members=bundleMembers(edge).toArray();
  const source=appMap.get(edge.source().data("appId"));
  const target=appMap.get(edge.target().data("appId"));
  const targetName=target?target.name:"未取得の参照先 (App "+edge.target().data("targetAppId")+")";
  document.getElementById("detail-title").textContent=(source?source.name:"?")+" → "+targetName;
  document.getElementById("detail-meta").innerHTML='<div class="detail-badges"><span class="kind-badge kind-'+escapeHtml(edge.data("kind"))+'"><i></i>'+escapeHtml(relationKindJp(edge.data("kind")))+'</span></div>'
    +'<div class="app-meta">'+(members.length>1?members.length+" 本の関連線を 1 本にまとめて表示しています":"関連線 1 本")+'</div>'
    +'<div class="detail-actions">'
    +(source?'<button type="button" class="tb" data-app="'+escapeHtml(String(source.id))+'" data-action="focus-app">参照元を見る</button>':'')
    +'<button type="button" class="tb" data-app="'+escapeHtml(String(target?target.id:edge.target().data("targetAppId")))+'" data-action="focus-app">参照先を見る</button>'
    +'</div>';
  let html='<div class="field-group-title">関連線 ('+members.length+')</div>';
  members.forEach(e=>{
    const found=relationForEdgeId(e.id());
    if(!found) return;
    const rel=found.rel;
    const hidden=e.hasClass("rel-manual-hidden");
    html+='<div class="field-row'+(hidden?' field-row--hidden':'')+'">'
      +'<span class="field-icon kind-'+escapeHtml(rel.kind)+'" aria-hidden="true">→</span>'
      +'<div class="field-main"><div class="field-name">'+escapeHtml(relSourceFieldText(rel))+(rel.isCustom?'<span class="tag tag-sub">手動</span>':'')+'</div>'
      +'<div class="field-sub">'+escapeHtml(relTargetFieldText(rel,target)?"参照先の項目: "+relTargetFieldText(rel,target):relationKindJp(rel.kind))+'</div>'
      +relationDetailHtml(rel)+'</div>'
      +'<button type="button" class="row-edit" title="この関連線を編集（名前・種類）" aria-label="この関連線を編集" data-edge="'+escapeHtml(e.id())+'" data-app="'+escapeHtml(String(found.app.id))+'" data-action="edit-relation-row">✎</button>'
      +'<button type="button" class="row-del'+(hidden?' row-del--restore':'')+'" title="'+(hidden?'この関連線を戻す':'この関連線を図から削除')+'" aria-label="'+(hidden?'この関連線を戻す':'この関連線を図から削除')+'" data-edge="'+escapeHtml(e.id())+'" data-app="'+escapeHtml(String(found.app.id))+'" data-action="toggle-relation-row">'+(hidden?'↺':'✕')+'</button>'
      +'</div>';
  });
  document.getElementById("detail-relations").innerHTML=html;
  document.getElementById("detail-fields").innerHTML="";
  openSidePanel("detail");
  setActiveApp(0);
}
// 編集のあと、開いている詳細を描き直す
function refreshOpenDetail(){
  const panel=document.getElementById("detail");
  if(!panel||!panel.classList.contains("open")) return;
  if(detailMode==="app"&&activeAppId){ const app=findApp(activeAppId); if(app) renderAppDetail(app); }
  else if(detailMode==="edge"&&detailEdgeId){
    const edge=cy.getElementById(detailEdgeId);
    if(edge.length) renderEdgeDetail(bundleRepresentative(edge));
  }
}
cy.on("tap","node",e=>{
  if(e.target.hasClass("note-node")){ openEditNote(e.target.id()); return; }
  lastTappedNodeId = e.target.id();
  const app=appMap.get(e.target.data("appId"));
  if(!app){ if(e.target.data("isGhost")) renderGhostDetail(e.target); return; }
  renderAppDetail(app);
  if(focusMode) applyFocusToNode(e.target);
});
cy.on("tap","edge",e=>{
  renderEdgeDetail(e.target);
});
cy.on("cxttap","node",e=>{
  const n = e.target;
  if(n.hasClass("note-node")){ deleteNoteNodes(n); toast("メモを削除しました（Ctrl+Z で戻せます）"); return; }
  const oe = e.originalEvent || ({});
  if(oe.altKey || oe.metaKey){
    hideAppNodes(n);
    applyRelationFilter();
    afterGraphChange();
    if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
    toast("アプリを図から削除しました（Ctrl+Z で戻せます）");
    return;
  }
  if(pinnedNodeIds.has(n.id())) unpinNode(n);
  else pinNode(n);
});
cy.on("cxttap","edge",e=>{
  const edges = bundleMembers(e.target);
  hideRelationEdges(edges);
  applyRelationFilter();
  afterGraphChange();
  if(focusMode && currentFocusNodeId) applyFocusToNode(cy.getElementById(currentFocusNodeId), true);
  toast("関連線を図から削除しました（Ctrl+Z で戻せます）");
});
cy.on("tap",e=>{if(e.target===cy){closeDetail();cy.elements().removeClass("highlighted dimmed path-node path-edge");clearFocus(true);clearAnalysisHighlight();if(searchQuery.trim()) searchGraph(searchQuery);}});

function closeDetail(){
  document.getElementById("detail").classList.remove("open");
  detailMode="";
  detailEdgeId="";
  setActiveApp(0);
}

// 詳細パネル内の項目絞り込み（大きいアプリで目的の項目を探しやすくする）
function filterDetailFields(q){
  const low=String(q||"").trim().toLowerCase();
  document.querySelectorAll("#detail-fields .field-row").forEach(row=>{
    row.style.display=!low||row.textContent.toLowerCase().includes(low)?"":"none";
  });
  document.querySelectorAll("#detail-fields .field-group-title").forEach(title=>{
    let el=title.nextElementSibling, any=false;
    while(el&&el.classList&&el.classList.contains("field-row")){
      if(el.style.display!=="none") any=true;
      el=el.nextElementSibling;
    }
    title.style.display=!low||any?"":"none";
  });
}

// 図のそのアプリへ移る（表示範囲の外なら、そのアプリのまわりを表示してから移る）
function focusApp(id){
  const n=cy.getElementById("a"+id);
  if(n.length && !n.hasClass("app-manual-hidden")){
    if(typeof isNodeInScope==="function" && !isNodeInScope(n)) return ensureNodeVisible(n).then(()=>focusApp(id));
    if(typeof showDiagramView==="function") showDiagramView();
    cy.animate({center:{eles:n},zoom:Math.max(1,Math.min(1.5,cy.zoom()))},{ duration:400 });
    n.select();
    const app = appMap.get(Number(id)) || appMap.get(id);
    if(app) renderAppDetail(app);
    if(focusMode) applyFocusToNode(n, true);
    if(typeof closeSidebarDrawer==="function") closeSidebarDrawer();
    return;
  }
  // 取得できていない参照先は「未取得の参照先」ノードへ移動し、詳細を表示する
  const ghost=cy.getElementById("g"+String(id).replace(/[^0-9A-Za-z_-]/g,"_"));
  if(ghost.length && ghost.data("isGhost") && !ghost.hasClass("app-manual-hidden")){
    if(typeof isNodeInScope==="function" && !isNodeInScope(ghost)) return ensureNodeVisible(ghost).then(()=>focusApp(id));
    if(typeof showDiagramView==="function") showDiagramView();
    cy.animate({center:{eles:ghost},zoom:Math.max(1,Math.min(1.5,cy.zoom()))},{ duration:400 });
    ghost.select();
    renderGhostDetail(ghost);
    return;
  }
  if(n.length && n.hasClass("app-manual-hidden")) toast("このアプリは図から削除しています（編集 → 削除したアプリを戻す）");
}
// 関連一覧の行から、図のその線へ移る
function goToRelationEdge(edgeId){
  const edge=cy.getElementById(edgeId);
  if(!edge.length){ toast("この関連線は図にありません"); return; }
  showDiagramView();
  if(edge.hasClass("rel-manual-hidden")){ toast("この関連線は図から削除しています（編集 → 削除した関連線を戻す）"); return; }
  if(!relationKindState[edge.data("kind")]){ relationKindState[edge.data("kind")]=true; syncRelationKindButtons(); applyRelationFilter(); }
  const source=edge.source(), target=edge.target();
  const reveal=isNodeInScope(source)&&isNodeInScope(target)?Promise.resolve():(source.data("appId")!=null?showAroundApp(source.data("appId")):showAllScope());
  reveal.then(()=>{
    const rep=bundleRepresentative(edge);
    cy.elements().unselect();
    rep.select();
    clearFocus(true);
    renderEdgeDetail(rep);
    fitElements(source.union(target).union(rep),{animate:true,maxZoom:1.1});
  });
}

// ─── 構造チェック ───
function analysisItem(title, meta, ids, tone){
  const safeIds=(ids||[]).map(id=>String(id).replace(/[^0-9-]/g,"")).filter(Boolean).join(",");
  return '<button type="button" class="analysis-item'+(tone?' analysis-item--'+tone:'')+'" data-analysis-ids="'+safeIds+'" data-action="analysis-focus"><strong>'+escapeHtml(title)+'</strong><span>'+escapeHtml(meta)+'</span></button>';
}
function renderAnalysisPanel(){
  const host=document.getElementById("analysis-content");
  if(!host) return;
  recomputeErAnalysis();
  const cycles=ER_ANALYSIS.cycles||[];
  const selfReferences=ER_ANALYSIS.selfReferences||[];
  const isolated=ER_ANALYSIS.isolatedAppIds||[];
  const hubs=ER_ANALYSIS.hubs||[];
  const unresolved=ER_ANALYSIS.unresolvedTargets||[];
  const partialIds=ER_ANALYSIS.partialAppIds||[];
  const failedIds=ER_ANALYSIS.failedAppIds||[];
  const facts=document.getElementById("analysis-facts");
  if(facts) facts.innerHTML='<div class="analysis-fact"><strong>'+ER_ANALYSIS.counts.retrievalComplete+'</strong><span>取得完了</span></div><div class="analysis-fact"><strong>'+ER_ANALYSIS.counts.retrievalPartial+'</strong><span>一部取得</span></div><div class="analysis-fact"><strong>'+ER_ANALYSIS.counts.retrievalFailed+'</strong><span>取得失敗</span></div>';
  let html='<section class="analysis-section"><h3><span>取得に注意が必要</span><span class="analysis-count">'+(partialIds.length+failedIds.length)+'</span></h3>';
  html+=partialIds.concat(failedIds).length?partialIds.concat(failedIds).map(id=>{const app=appMap.get(Number(id))||appMap.get(id);const status=failedIds.includes(id)?'取得失敗':'一部取得';const messages=(app&&app.issues||[]).map(issue=>issue.message).filter(Boolean);return analysisItem((app&&app.name)||('アプリ '+id),status+(messages.length?' / '+messages.slice(0,2).join(' / '):''),[id],failedIds.includes(id)?'risk':'warn');}).join(''):'<div class="analysis-empty">取得上の注意は記録されていません。</div>';
  html+='</section><section class="analysis-section"><h3><span>複数アプリの循環候補</span><span class="analysis-count">'+cycles.length+'</span></h3>';
  html+=cycles.length?cycles.map((cycle,i)=>analysisItem('候補 '+(i+1)+': '+cycle.appNames.join(' → '),cycle.appIds.length+'アプリ間で相互に到達できます',cycle.appIds,'risk')).join(''):'<div class="analysis-empty">複数アプリの循環候補は検出されませんでした。</div>';
  html+='</section><section class="analysis-section"><h3><span>自己参照</span><span class="analysis-count">'+selfReferences.length+'</span></h3>';
  html+=selfReferences.length?selfReferences.map(item=>analysisItem(item.appName+' (App '+item.appId+')',(item.kind||'関連')+(item.field?' / '+item.field:''),[item.appId],'')).join(''):'<div class="analysis-empty">自己参照はありません。</div>';
  html+='</section><section class="analysis-section"><h3><span>接続数が多いアプリ（'+(ER_ANALYSIS.highConnectionThreshold||3)+'件以上）</span><span class="analysis-count">'+hubs.length+'</span></h3>';
  html+=hubs.length?hubs.map(hub=>analysisItem(hub.name+' (App '+hub.appId+')','入 '+hub.incoming+' / 出 '+hub.outgoing+' / 合計 '+hub.total,[hub.appId],'')).join(''):'<div class="analysis-empty">該当するアプリはありません。</div>';
  html+='</section><section class="analysis-section"><h3><span>図内で関連のないアプリ</span><span class="analysis-count">'+isolated.length+'</span></h3>';
  html+=isolated.length?isolated.map(id=>{const app=findApp(id);return analysisItem((app&&app.name)||('アプリ '+id),'図内に入出力の関連がありません',[id],'');}).join(''):'<div class="analysis-empty">該当するアプリはありません。</div>';
  html+='</section><section class="analysis-section"><h3><span>未取得の参照先</span><span class="analysis-count">'+unresolved.length+'</span></h3>';
  html+=unresolved.length?unresolved.slice(0,20).map(item=>analysisItem(item.fromAppName+' → App '+item.toAppId,(item.kind||'関連')+(item.field?' / '+item.field:''),[item.fromAppId],'warn')).join(''):'<div class="analysis-empty">参照先はすべて図内に取得されています。</div>';
  if(unresolved.length>20) html+='<div class="analysis-empty">ほか '+(unresolved.length-20)+' 件（関連一覧の「未取得の参照先」で全件を確認できます）</div>';
  html+='</section>';
  host.innerHTML=html;
}
function clearAnalysisHighlight(){
  cy.elements().removeClass("analysis-hit analysis-dim");
}
function focusAnalysisApps(csv){
  const ids=String(csv||"").split(",").filter(Boolean);
  clearAnalysisHighlight();
  const nodes=ids.map(id=>cy.getElementById("a"+id)).filter(node=>node.length&&!node.hasClass("app-manual-hidden"));
  if(!nodes.length){toast("対象のアプリは図にありません");return;}
  if(nodes.length===1){ focusApp(ids.find(id=>cy.getElementById("a"+id).length)); return; }
  const collection=nodes.reduce((all,node)=>all.union(node),cy.collection());
  const reveal=collection.some(n=>n.hasClass("scope-out"))?showAllScope():Promise.resolve();
  showDiagramView();
  reveal.then(()=>{
    cy.nodes().not(".note-node").not(collection).addClass("analysis-dim");
    collection.addClass("analysis-hit");
    fitElements(collection,{animate:true});
    toast(collection.length+"アプリを強調しました（背景を押すと解除）");
  });
}
function toggleAnalysisPanel(force){
  const panel=document.getElementById("analysis-panel");
  const open=typeof force==="boolean"?force:!panel.classList.contains("open");
  if(open){ renderAnalysisPanel(); closeSidebarDrawer(); closeDetail(); openSidePanel("analysis-panel"); }
  else panel.classList.remove("open");
  document.getElementById("analysis-toggle-btn")?.setAttribute("aria-expanded",String(open));
}
function refreshSidebarChecks(){
  const host=document.getElementById("sidebar-check-facts");
  if(!host) return;
  const a=ER_ANALYSIS;
  const item=(label,count)=>'<span class="'+(count?'is-warn':'')+'">'+label+' <b>'+count+'</b></span>';
  host.innerHTML=item("取得失敗",a.counts.retrievalFailed)+item("一部取得",a.counts.retrievalPartial)+item("循環候補",(a.cycles||[]).length)+item("自己参照",(a.selfReferences||[]).length)+item("関連なし",(a.isolatedAppIds||[]).length)+item("未取得の参照先",(a.unresolvedTargets||[]).length);
}

// ─── アプリ一覧（左） ───
let sidebarReturnFocus=null;
let sidebarDesktopOpen=true;
function isDrawerLayout(){ return !!(window.matchMedia&&window.matchMedia("(max-width:1023px)").matches); }
function sidebarIsOpen(){
  const sidebar=document.getElementById("sidebar");
  return isDrawerLayout()?sidebar.classList.contains("open"):!sidebar.classList.contains("collapsed");
}
function syncSidebarMode(){
  const sidebar=document.getElementById("sidebar");
  const backdrop=document.getElementById("sidebar-backdrop");
  if(isDrawerLayout()){
    const open=sidebar.classList.contains("open");
    sidebar.classList.remove("collapsed");
    sidebar.inert=!open;
    sidebar.setAttribute("aria-hidden",String(!open));
    backdrop?.classList.toggle("open",open);
  }else{
    sidebar.classList.remove("open");
    sidebar.classList.toggle("collapsed",!sidebarDesktopOpen);
    sidebar.inert=false;
    sidebar.removeAttribute("aria-hidden");
    backdrop?.classList.remove("open");
  }
  document.getElementById("sidebar-toggle-btn")?.setAttribute("aria-expanded",String(sidebarIsOpen()));
}
function toggleSidebar(force, trigger){
  const sidebar=document.getElementById("sidebar");
  const wasOpen=sidebarIsOpen();
  const open=typeof force==="boolean"?force:!wasOpen;
  if(isDrawerLayout()){
    if(open&&!wasOpen){
      const active=document.activeElement;
      sidebarReturnFocus=trigger&&typeof trigger.focus==="function"?trigger:(active&&active!==document.body?active:document.getElementById("sidebar-toggle-btn"));
    }
    sidebar.classList.toggle("open",open);
    syncSidebarMode();
    if(open&&!wasOpen) document.getElementById("sidebar-close")?.focus();
    else if(!open&&wasOpen){
      const restore=sidebarReturnFocus;
      sidebarReturnFocus=null;
      if(restore&&document.contains(restore)&&restore.getClientRects().length) restore.focus();
    }
  }else{
    sidebarDesktopOpen=open;
    syncSidebarMode();
    requestAnimationFrame(()=>{ cy.resize(); });
  }
}
function closeSidebar(){toggleSidebar(false);}
// 引き出し式（狭い画面）のときだけ閉じる。広い画面の左の一覧は閉じない
function closeSidebarDrawer(){ if(isDrawerLayout()&&sidebarIsOpen()) toggleSidebar(false); }

// 集計・項目の種類・アプリ一覧・表をまとめて描き直す
function refreshSidebar(){
  const activeTypes=new Set([...document.querySelectorAll("#type-filters .filter-chip.active")].map(e=>e.dataset.type));
  const visibleFieldsTotal=APPS.reduce((s,a)=>s+visibleFieldsForNode(a).length,0);
  const totalFieldsAcrossApps=APPS.reduce((s,a)=>s+(typeof a.totalFieldCount==="number"?a.totalFieldCount:visibleFieldsForNode(a).length),0);
  const totalRels=APPS.reduce((s,a)=>s+a.relations.length,0);
  const lookups=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="LOOKUP").length,0);
  const actions=APPS.reduce((s,a)=>s+a.relations.filter(r=>r.kind==="ACTION").length,0);
  const refs=totalRels-lookups-actions;
  const typeCount={};
  APPS.forEach(a=>visibleFieldsForNode(a).forEach(f=>{typeCount[f.type]=(typeCount[f.type]||0)+1;}));

  let html='<div class="stat-row"><span>アプリ数</span><span class="stat-val">'+APPS.length+'</span></div>';
  html+='<div class="stat-row"><span>項目数（合計）</span><span class="stat-val">'+totalFieldsAcrossApps+'</span></div>';
  if(visibleFieldsTotal!==totalFieldsAcrossApps){
    html+='<div class="stat-row"><span>カードに表示中の項目</span><span class="stat-val">'+visibleFieldsTotal+'</span></div>';
  }
  html+='<div class="stat-row"><span>ルックアップ</span><span class="stat-val">'+lookups+'</span></div>';
  html+='<div class="stat-row"><span>関連レコード一覧</span><span class="stat-val">'+refs+'</span></div>';
  html+='<div class="stat-row"><span>アプリアクション</span><span class="stat-val">'+actions+'</span></div>';
  html+='<div class="stat-row"><span>関連（合計）</span><span class="stat-val">'+totalRels+'</span></div>';
  html+='<div class="stat-row"><span>取得完了</span><span class="stat-val">'+APPS.filter(a=>(a.status||"complete")==="complete"&&a.ok!==false).length+'</span></div>';
  html+='<div class="stat-row"><span>一部取得</span><span class="stat-val">'+APPS.filter(a=>a.status==="partial").length+'</span></div>';
  html+='<div class="stat-row"><span>取得失敗</span><span class="stat-val">'+APPS.filter(a=>a.status==="failed"||a.ok===false).length+'</span></div>';
  document.getElementById("stats-summary").innerHTML=html;

  // type filters
  const filterHost=document.getElementById("type-filters");
  filterHost.replaceChildren();
  Object.entries(typeCount).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="filter-chip"+(activeTypes.has(t)?" active":"");
    button.dataset.type=t;
    button.textContent=fieldTypeJpLabel(t)+" ("+c+")";
    button.setAttribute("aria-pressed",activeTypes.has(t)?"true":"false");
    button.addEventListener("click",()=>filterByType(button));
    filterHost.appendChild(button);
  });

  recomputeErAnalysis();
  refreshSidebarChecks();
  refreshAppList();
  refreshScopeBar();
  refreshActiveTable();
}

function appListSortKey(a){
  return [startAppIdSet.has(String(a.id))?0:1,a.depth||0,String(a.name||"")];
}
function refreshAppList(){
  const host=document.getElementById("app-list");
  if(!host) return;
  const filter=document.getElementById("app-list-filter")?.value||"";
  const low=normalizedQuery();
  const sorted = APPS
    .slice()
    .sort((a,b)=>{
      const ka=appListSortKey(a),kb=appListSortKey(b);
      if(ka[0]!==kb[0]) return ka[0]-kb[0];
      if(ka[1]!==kb[1]) return ka[1]-kb[1];
      return ka[2].localeCompare(kb[2],"ja");
    });
  const rows=sorted.map(a=>{
    const node=cy.getElementById('a'+a.id);
    return {a,node,removed:node.length&&node.hasClass('app-manual-hidden'),inScope:isNodeInScope(node),out:(a.relations||[]).length,inc:incomingRelationCount(a.id)};
  }).filter(row=>{
    if(low&&!appMatchesQuery(row.a,low)) return false;
    if(filter==="scope") return row.inScope&&!row.removed;
    if(filter==="attention") return isFailedApp(row.a)||isPartialApp(row.a);
    if(filter==="nolink") return !row.out&&!row.inc;
    if(filter==="start") return startAppIdSet.has(String(row.a.id));
    return true;
  });
  const count=document.getElementById("sidebar-count");
  if(count) count.textContent=rows.length===APPS.length?String(APPS.length):rows.length+" / "+APPS.length;
  const renderItem=(row)=>{
    const a=row.a;
    const classes=['app-list-item'];
    if(Number(activeAppId)===Number(a.id)) classes.push('active-app');
    if(!row.inScope) classes.push('is-out');
    if(row.removed) classes.push('is-removed');
    const badges=[];
    if(isMarkedStartApp(a)) badges.push('<span class="badge badge-start">起点</span>');
    if(isFailedApp(a)) badges.push('<span class="badge badge-failed">⚠ 失敗</span>');
    else if(isPartialApp(a)) badges.push('<span class="badge badge-partial">△ 一部</span>');
    if(a.isCustom) badges.push('<span class="badge badge-custom">手動</span>');
    const sub=['<span>'+(a.isCustom?'手動追加':'App '+escapeHtml(a.id))+'</span>'];
    if(!row.out&&!row.inc) sub.push('<span>関連なし</span>');
    else sub.push('<span>参照 <b>'+row.out+'</b> ・ 被参照 <b>'+row.inc+'</b></span>');
    if(row.removed) sub.push('<span>図から削除済み</span>');
    else if(!row.inScope) sub.push('<span>図の外</span>');
    const label=a.name+'、'+(a.isCustom?'手動追加':'App '+a.id)+'、参照 '+row.out+'、被参照 '+row.inc+(row.inScope?'':'、図の外');
    return '<button type="button" role="listitem" class="'+classes.join(' ')+'" data-app="'+escapeHtml(String(a.id))+'" data-action="focus-app" aria-label="'+escapeHtml(label)+'"><span class="ali-top"><span class="ali-name">'+escapeHtml(a.name)+'</span>'+badges.join('')+'</span><span class="ali-sub">'+sub.join('')+'</span></button>';
  };
  let html="";
  if(!rows.length) html='<div class="analysis-empty">条件に合うアプリはありません。</div>';
  else if(viewScope.mode==="around"&&!filter){
    const inside=rows.filter(r=>r.inScope&&!r.removed), outside=rows.filter(r=>!r.inScope||r.removed);
    if(inside.length){ html+='<div class="app-list-group">図に表示中 ('+inside.length+')</div>'; inside.forEach(r=>{html+=renderItem(r);}); }
    if(outside.length){ html+='<div class="app-list-group">図の外 ('+outside.length+') — 押すとそのアプリのまわりを表示</div>'; outside.forEach(r=>{html+=renderItem(r);}); }
  }else{
    const linked=rows.filter(r=>r.out||r.inc), noLink=rows.filter(r=>!r.out&&!r.inc);
    if(noLink.length&&linked.length){
      html+='<div class="app-list-group">関連あり ('+linked.length+')</div>'; linked.forEach(r=>{html+=renderItem(r);});
      html+='<div class="app-list-group">関連なし ('+noLink.length+')</div>'; noLink.forEach(r=>{html+=renderItem(r);});
    }else rows.forEach(r=>{html+=renderItem(r);});
  }
  host.innerHTML=html;
}

function filterByType(el){
  el.classList.toggle("active");
  el.setAttribute("aria-pressed",el.classList.contains("active")?"true":"false");
  const active=[...document.querySelectorAll("#type-filters .filter-chip.active")].map(e=>e.dataset.type);
  cy.elements().removeClass("highlighted dimmed");
  if(!active.length) return;
  const matched=cy.nodes().not(".app-manual-hidden").filter(n=>{
    const app=appMap.get(n.data("appId"));
    return app&&visibleFieldsForNode(app).some(f=>active.includes(f.type));
  });
  matched.addClass("highlighted");
  const visibleEdges = matched.connectedEdges().filter(e=>!e.hasClass("rel-hidden") && !e.hasClass("rel-manual-hidden"));
  cy.elements().not(matched).not(visibleEdges).not(".note-node").addClass("dimmed");
}

// ─── 図の表示範囲の帯 ───
function refreshScopeBar(){
  const bar=document.getElementById("scope-bar");
  if(!bar||typeof viewScope==="undefined") return;
  const total=appNodeCount();
  const shown=cy.nodes().filter(n=>!n.hasClass("note-node")&&!n.hasClass("app-manual-hidden")&&!n.hasClass("scope-out")).length;
  let html="";
  if(viewScope.mode==="all"){
    html+='<span class="scope-label">全体を表示<small class="scope-count">'+total+' アプリ</small></span>';
    if(canShowStartScope()) html+='<button type="button" class="tb" id="scope-start-btn" data-action="scope-start">起点まわりだけ表示</button>';
  }else{
    const start=isStartScope(viewScope);
    const rootNames=viewScope.roots.map(id=>{const a=findApp(id);return a?a.name:("App "+id);});
    const title=start?"起点まわり":("「"+rootNames[0]+"」"+(rootNames.length>1?" ほか "+(rootNames.length-1)+" 件":"")+" のまわり");
    html+='<span class="scope-label" title="'+escapeHtml(rootNames.join("、"))+'">'+escapeHtml(title)+'<small class="scope-count">'+shown+' / '+total+' アプリ</small></span>';
    html+='<span class="scope-depth" role="group" aria-label="関連をたどる段数"><span>深さ</span>'
      +[1,2].map(d=>'<button type="button" id="scope-depth-'+d+'" aria-pressed="'+(viewScope.depth===d)+'" data-action="scope-depth" data-depth="'+d+'" title="'+(d===1?'直接の関連先まで':'関連先の関連先まで')+'">'+d+'</button>').join("")
      +'</span>';
    html+='<button type="button" class="tb tb-primary" id="scope-all-btn" data-action="scope-all">全体を表示</button>';
    if(!start&&canShowStartScope()) html+='<button type="button" class="tb" id="scope-start-btn" data-action="scope-start">起点まわり</button>';
  }
  if(ER_OPTIONS.reverseScanNote) html+='<span class="meta-pill meta-pill--warn" title="'+escapeHtml(ER_OPTIONS.reverseScanNote)+'">⚠ 逆引き走査が不完全</span>';
  bar.innerHTML=html;
  document.querySelectorAll("[data-scope-btn]").forEach(btn=>{
    const on=btn.dataset.scopeBtn==="all"?viewScope.mode==="all":isStartScope(viewScope);
    btn.classList.toggle("active",on);
    btn.setAttribute("aria-pressed",String(on));
    // 起点まわりにしてもアプリが減らない図（全アプリが起点など）では選べなくする
    if(btn.dataset.scopeBtn==="start"){
      btn.disabled=!on&&!canShowStartScope();
      btn.title=btn.disabled?"この図は起点まわりにしてもアプリが減りません":"起点とその関連先だけを表示します";
    }
  });
}

// ─── 表のビュー（アプリ一覧・関連一覧） ───
let activeView="diagram";
const tableState={
  apps:{sort:"name",dir:1,status:"",check:""},
  relations:{sort:"source",dir:1,kinds:{LOOKUP:true,REF:true,ACTION:true},state:""}
};
function setView(name){
  const next=["diagram","apps","relations"].includes(name)?name:"diagram";
  activeView=next;
  [["diagram","tab-diagram","view-diagram"],["apps","tab-apps","view-apps"],["relations","tab-relations","view-relations"]].forEach(([key,tabId,panelId])=>{
    const tab=document.getElementById(tabId), panel=document.getElementById(panelId);
    const on=key===next;
    if(tab){ tab.setAttribute("aria-selected",String(on)); tab.tabIndex=on?0:-1; }
    if(panel&&key!=="diagram") panel.hidden=!on;
  });
  // 図は表の下に残す（描画の大きさを保つ）。表を開いている間は操作の対象から外す
  const diagram=document.getElementById("view-diagram");
  if(diagram){ diagram.inert=next!=="diagram"; diagram.setAttribute("aria-hidden",String(next!=="diagram")); }
  if(next==="apps") renderAppsTable();
  if(next==="relations") renderRelationsTable();
  if(next!=="diagram"){ closeDetail(); toggleAnalysisPanel(false); }
  closeAllMenus();
}
function showDiagramView(){ if(activeView!=="diagram") setView("diagram"); }
function refreshActiveTable(){
  if(activeView==="apps") renderAppsTable();
  else if(activeView==="relations") renderRelationsTable();
}
// タブは左右の矢印キーでも移れる
function onViewTabKey(e){
  const order=["diagram","apps","relations"];
  const i=order.indexOf(activeView);
  let next=-1;
  if(e.key==="ArrowRight") next=(i+1)%order.length;
  else if(e.key==="ArrowLeft") next=(i+order.length-1)%order.length;
  else if(e.key==="Home") next=0;
  else if(e.key==="End") next=order.length-1;
  if(next<0) return;
  e.preventDefault();
  setView(order[next]);
  document.getElementById("tab-"+order[next])?.focus();
}
function compareValues(a,b){
  if(typeof a==="number"&&typeof b==="number") return a-b;
  return String(a==null?"":a).localeCompare(String(b==null?"":b),"ja",{numeric:true});
}
function sortRows(rows,columns,state){
  const col=columns.find(c=>c.key===state.sort)||columns[0];
  const value=col.sortValue||((row)=>row[col.key]);
  return rows.slice().sort((a,b)=>compareValues(value(a),value(b))*state.dir||compareValues(a.tiebreak,b.tiebreak));
}
function tableHeadHtml(columns,state,tableName){
  return '<thead><tr>'+columns.map(col=>{
    if(col.sortable===false) return '<th scope="col" class="plain'+(col.num?' num':'')+'">'+(col.label?escapeHtml(col.label):'<span class="sr-only">'+escapeHtml(col.srLabel||"")+'</span>')+'</th>';
    const sorted=state.sort===col.key;
    const aria=sorted?(state.dir>0?"ascending":"descending"):"none";
    return '<th scope="col"'+(col.num?' class="num"':'')+' aria-sort="'+aria+'"><button type="button" class="sort-btn" data-action="sort" data-table="'+escapeHtml(tableName)+'" data-sort="'+escapeHtml(col.key)+'">'+escapeHtml(col.label)+'</button></th>';
  }).join('')+'</tr></thead>';
}
function sortTable(tableName,key){
  // 表の名前（apps・relations）だけを受ける。data-table の値で Object のプロトタイプを書き換えない
  const state=Object.prototype.hasOwnProperty.call(tableState,tableName)?tableState[tableName]:null;
  if(!state) return;
  if(state.sort===key) state.dir=-state.dir;
  else { state.sort=key; state.dir=1; }
  refreshActiveTable();
  // 並べ替えたあとも、押した見出しにフォーカスを残す
  const th=[...document.querySelectorAll("#"+(tableName==="apps"?"apps-table":"relations-table")+" th")].find(el=>el.querySelector(".sort-btn")&&el.getAttribute("aria-sort")!=="none");
  th?.querySelector(".sort-btn")?.focus();
}
function cycleAppIdSet(){
  const set=new Set();
  (ER_ANALYSIS.cycles||[]).forEach(c=>(c.appIds||[]).forEach(id=>set.add(String(id))));
  return set;
}
function appTableRows(){
  recomputeErAnalysis();
  const cycleIds=cycleAppIdSet();
  const selfIds=new Set((ER_ANALYSIS.selfReferences||[]).map(s=>String(s.appId)));
  const isolatedIds=new Set((ER_ANALYSIS.isolatedAppIds||[]).map(String));
  const unresolvedFrom=new Set((ER_ANALYSIS.unresolvedTargets||[]).map(u=>String(u.fromAppId)));
  return APPS.map(app=>{
    const node=cy.getElementById("a"+app.id);
    const out=(app.relations||[]).length, inc=incomingRelationCount(app.id);
    const issues=(app.issues||[]).map(issue=>issue.message||issue.code||"").filter(Boolean);
    return {
      app,id:app.id,name:String(app.name||""),space:String(app.spaceId||""),
      fields:typeof app.totalFieldCount==="number"?app.totalFieldCount:allFieldsForApp(app).length,
      out,inc,status:appStatusLabel(app),issues,
      start:startAppIdSet.has(String(app.id)),removed:node.length&&node.hasClass("app-manual-hidden"),inScope:isNodeInScope(node),
      cycle:cycleIds.has(String(app.id)),self:selfIds.has(String(app.id)),isolated:isolatedIds.has(String(app.id)),unresolved:unresolvedFrom.has(String(app.id)),
      tiebreak:String(app.id)
    };
  });
}
const APP_TABLE_COLUMNS=[
  {key:"id",label:"App ID",num:true,sortValue:r=>typeof r.id==="number"?r.id:Number(r.id)||0},
  {key:"name",label:"アプリ名"},
  {key:"space",label:"スペース"},
  {key:"fields",label:"項目数",num:true},
  {key:"out",label:"参照する",num:true},
  {key:"inc",label:"参照される",num:true},
  {key:"status",label:"状態",sortValue:r=>(r.status==="取得失敗"?0:(r.status==="一部取得"?1:2))+r.name},
  {key:"go",label:"",srLabel:"図で見る",sortable:false}
];
const APP_CHECKS=[
  {key:"attention",label:"取得に注意",test:r=>r.status!=="取得完了"},
  {key:"cycle",label:"循環候補",test:r=>r.cycle},
  {key:"self",label:"自己参照",test:r=>r.self},
  {key:"isolated",label:"関連なし",test:r=>r.isolated},
  {key:"unresolved",label:"未取得の参照先あり",test:r=>r.unresolved}
];
function setAppsCheck(key){
  tableState.apps.check=tableState.apps.check===key?"":key;
  renderAppsTable();
}
function setAppsStatus(value){
  tableState.apps.status=String(value||"");
  renderAppsTable();
}
function renderAppsTable(){
  const host=document.getElementById("apps-table");
  if(!host) return;
  const state=tableState.apps;
  const all=appTableRows();
  const low=normalizedQuery();
  const check=APP_CHECKS.find(c=>c.key===state.check);
  const rows=sortRows(all.filter(r=>{
    if(low&&!appMatchesQuery(r.app,low)) return false;
    if(state.status==="start"&&!r.start) return false;
    if(state.status==="scope"&&!(r.inScope&&!r.removed)) return false;
    if(state.status==="custom"&&!r.app.isCustom) return false;
    if(state.status==="removed"&&!r.removed) return false;
    if(check&&!check.test(r)) return false;
    return true;
  }),APP_TABLE_COLUMNS,state);
  const chips=document.getElementById("apps-checks");
  if(chips) chips.innerHTML=APP_CHECKS.map(c=>{
    const n=all.filter(c.test).length;
    return '<button type="button" class="check-chip'+(n?' has-items':'')+'" aria-pressed="'+(state.check===c.key)+'" data-action="apps-check" data-check="'+escapeHtml(c.key)+'">'+escapeHtml(c.label)+' <b>'+n+'</b></button>';
  }).join('')+'<button type="button" class="check-chip" data-action="analysis-open">構造チェックの詳細</button>';
  const count=document.getElementById("apps-count");
  if(count) count.textContent=all.length+" 件中 "+rows.length+" 件";
  const status=document.getElementById("apps-status");
  if(status&&status.value!==state.status) status.value=state.status;
  if(!rows.length){ host.innerHTML='<div class="table-empty">条件に合うアプリはありません。検索や絞り込みを変えてください。</div>'; return; }
  const body=rows.map(r=>{
    const badges=[];
    if(r.start&&startMarksEnabled()) badges.push('<span class="badge badge-start">起点</span>');
    if(r.app.isCustom) badges.push('<span class="badge badge-custom">手動</span>');
    if(r.removed) badges.push('<span class="badge badge-nolink">図から削除済み</span>');
    const statusBadge=r.status==="取得失敗"?'<span class="badge badge-failed">⚠ 取得失敗</span>':(r.status==="一部取得"?'<span class="badge badge-partial">△ 一部取得</span>':'<span class="badge badge-ok">✓ 取得完了</span>');
    const flags=[];
    if(r.cycle) flags.push("循環候補");
    if(r.self) flags.push("自己参照");
    if(r.isolated) flags.push("関連なし");
    if(r.unresolved) flags.push("未取得の参照先あり");
    return '<tr'+(Number(activeAppId)===Number(r.id)?' class="is-selected"':'')+'>'
      +'<td class="num" data-label="App ID">'+(r.app.isCustom?'-':escapeHtml(r.id))+'</td>'
      +'<td data-label="アプリ名"><button type="button" class="row-link" data-app="'+escapeHtml(String(r.id))+'" data-action="focus-app">'+escapeHtml(r.name)+'</button> '+badges.join(' ')+(r.app.isCustom?'':'<div class="cell-sub">探索の深さ '+(r.app.depth||0)+'</div>')+'</td>'
      +'<td data-label="スペース">'+(r.space?'#'+escapeHtml(r.space):'<span class="cell-sub">-</span>')+'</td>'
      +'<td class="num" data-label="項目数">'+r.fields+'</td>'
      +'<td class="num" data-label="参照する">'+r.out+'</td>'
      +'<td class="num" data-label="参照される">'+r.inc+'</td>'
      +'<td data-label="状態">'+statusBadge+(r.issues.length?'<div class="cell-note">'+r.issues.map(escapeHtml).join('<br>')+'</div>':'')+(flags.length?'<div class="cell-sub">'+escapeHtml(flags.join(' ・ '))+'</div>':'')+'</td>'
      +'<td class="cell-action" data-label=""><button type="button" class="tb row-go" data-app="'+escapeHtml(String(r.id))+'" data-action="focus-app" aria-label="'+escapeHtml(r.name)+' を図で見る">図で見る</button></td>'
      +'</tr>';
  }).join('');
  host.innerHTML='<table class="data-table"><caption class="sr-only">アプリ一覧（'+rows.length+' 件）</caption>'+tableHeadHtml(APP_TABLE_COLUMNS,state,"apps")+'<tbody>'+body+'</tbody></table>';
}
function relationTableRows(){
  const rows=[];
  APPS.forEach(app=>(app.relations||[]).forEach((rel,ri)=>{
    const edgeId="e_"+app.id+"_"+ri;
    const target=appMap.get(rel.toApp)||null;
    const edge=cy.getElementById(edgeId);
    rows.push({
      edgeId,rel,source:app,target,kind:rel.kind,
      sourceName:String(app.name||""),targetName:target?String(target.name||""):"未取得の参照先 (App "+rel.toApp+")",
      sourceField:relSourceFieldText(rel),targetField:relTargetFieldText(rel,target),
      fieldsText:relFieldsText(rel),filter:relFilterText(rel),
      removed:edge.length&&edge.hasClass("rel-manual-hidden"),self:String(rel.toApp)===String(app.id),unresolved:!target,custom:!!rel.isCustom,
      tiebreak:edgeId
    });
  }));
  return rows;
}
const RELATION_TABLE_COLUMNS=[
  {key:"kind",label:"種類",sortValue:r=>["LOOKUP","REF","ACTION"].indexOf(r.kind)},
  {key:"source",label:"参照元アプリ",sortValue:r=>r.sourceName+"\u0000"+["LOOKUP","REF","ACTION"].indexOf(r.kind)},
  {key:"sourceField",label:"参照元の項目"},
  {key:"arrow",label:"",srLabel:"向き",sortable:false},
  {key:"target",label:"参照先アプリ",sortValue:r=>r.targetName},
  {key:"targetField",label:"参照先の項目"},
  {key:"fieldsText",label:"コピー・表示する項目"},
  {key:"filter",label:"絞り込み条件"},
  {key:"go",label:"",srLabel:"図で見る",sortable:false}
];
function toggleRelationTableKind(kind){
  tableState.relations.kinds[kind]=!tableState.relations.kinds[kind];
  renderRelationsTable();
}
function setRelationsState(value){
  tableState.relations.state=String(value||"");
  renderRelationsTable();
}
function showRelationsTable(state){
  tableState.relations.state=state||"";
  setView("relations");
}
function relationRowMatches(r,low){
  if(!low) return true;
  return [r.sourceName,r.targetName,r.sourceField,r.targetField,r.fieldsText,r.filter,String(r.source.id),String(r.rel.toApp),relationKindJp(r.kind)].some(v=>String(v||"").toLowerCase().includes(low));
}
function renderRelationsTable(){
  const host=document.getElementById("relations-table");
  if(!host) return;
  const state=tableState.relations;
  const all=relationTableRows();
  const low=normalizedQuery();
  const rows=sortRows(all.filter(r=>{
    if(!state.kinds[r.kind]) return false;
    if(state.state==="unresolved"&&!r.unresolved) return false;
    if(state.state==="self"&&!r.self) return false;
    if(state.state==="custom"&&!r.custom) return false;
    if(state.state==="removed"&&!r.removed) return false;
    if(state.state==="filtered"&&!r.filter) return false;
    return relationRowMatches(r,low);
  }),RELATION_TABLE_COLUMNS,state);
  const kinds=document.getElementById("relations-kinds");
  if(kinds) kinds.innerHTML=["LOOKUP","REF","ACTION"].map(kind=>{
    const n=all.filter(r=>r.kind===kind).length;
    return '<button type="button" class="check-chip" aria-pressed="'+(!!state.kinds[kind])+'" data-action="relation-table-kind" data-kind="'+escapeHtml(kind)+'"><span class="kind-badge kind-'+kind+'"><i></i>'+escapeHtml(relationKindJp(kind))+'</span> <b>'+n+'</b></button>';
  }).join('');
  const select=document.getElementById("relations-state");
  if(select&&select.value!==state.state) select.value=state.state;
  const count=document.getElementById("relations-count");
  if(count) count.textContent=all.length+" 件中 "+rows.length+" 件";
  if(!rows.length){ host.innerHTML='<div class="table-empty">条件に合う関連はありません。検索や絞り込みを変えてください。</div>'; return; }
  const appCell=(app,id,label)=>app
    ?'<button type="button" class="row-link" data-app="'+escapeHtml(String(app.id))+'" data-action="focus-app">'+escapeHtml(app.name)+'</button><div class="cell-sub">'+(app.isCustom?'手動追加':'App '+escapeHtml(app.id))+'</div>'
    :'<span class="badge badge-ghost">？ 未取得</span><div class="cell-sub">App '+escapeHtml(id)+'</div>';
  const body=rows.map(r=>{
    const notes=[];
    if(r.custom) notes.push('<span class="badge badge-custom">手動</span>');
    if(r.removed) notes.push('<span class="badge badge-nolink">図から削除済み</span>');
    if(r.self) notes.push('<span class="badge badge-nolink">自己参照</span>');
    return '<tr>'
      +'<td class="nowrap" data-label="種類"><span class="kind-badge kind-'+escapeHtml(r.kind)+'"><i></i>'+escapeHtml(relationKindJp(r.kind))+'</span>'+(notes.length?'<div>'+notes.join(' ')+'</div>':'')+'</td>'
      +'<td data-label="参照元アプリ">'+appCell(r.source,r.source.id)+'</td>'
      +'<td data-label="参照元の項目"><span class="cell-note">'+escapeHtml(r.sourceField||"-")+'</span></td>'
      +'<td class="arrow" aria-hidden="true">→</td>'
      +'<td data-label="参照先アプリ">'+appCell(r.target,r.rel.toApp)+'</td>'
      +'<td data-label="参照先の項目"><span class="cell-note">'+escapeHtml(r.targetField||"-")+'</span></td>'
      +'<td data-label="コピー・表示する項目"><span class="cell-note">'+escapeHtml(r.fieldsText||"-")+'</span></td>'
      +'<td data-label="絞り込み条件"><span class="cell-note">'+escapeHtml(r.filter||"-")+'</span></td>'
      +'<td class="cell-action" data-label=""><button type="button" class="tb row-go" data-edge="'+escapeHtml(r.edgeId)+'" data-action="go-edge" aria-label="'+escapeHtml(r.sourceName+' → '+r.targetName)+' の線を図で見る">図で見る</button></td>'
      +'</tr>';
  }).join('');
  host.innerHTML='<table class="data-table"><caption class="sr-only">関連一覧（'+rows.length+' 件）</caption>'+tableHeadHtml(RELATION_TABLE_COLUMNS,state,"relations")+'<tbody>'+body+'</tbody></table>';
}

// ─── 取得・関連サマリー ───
function hideOverview(){
  const panel = document.getElementById("overview");
  if(!panel) return;
  panel.classList.add("collapsed");
  panel.classList.remove("hidden");
  document.getElementById("overview-pill")?.setAttribute("aria-expanded","false");
}
function toggleOverview(force){
  const panel = document.getElementById("overview");
  if(!panel) return;
  const open = typeof force==="boolean" ? force : panel.classList.contains("collapsed") || panel.classList.contains("hidden");
  panel.classList.toggle("collapsed", !open);
  panel.classList.remove("hidden");
  document.getElementById("overview-pill")?.setAttribute("aria-expanded",String(open));
  if(open) panel.querySelector(".ov-close")?.focus();
}

// ─── Path Finder ───
function syncToolButton(id,on){
  const btn=document.getElementById(id);
  if(btn){ btn.classList.toggle("active",!!on); btn.setAttribute("aria-pressed",String(!!on)); }
}
function togglePathFinder(){
  const pf=document.getElementById("pathfinder");
  pf.classList.toggle("open");
  const open=pf.classList.contains("open");
  syncToolButton("pathfinder-btn",open);
  if(open){
    showDiagramView();
    const apps=APPS.filter(a=>{ const n = cy.getElementById("a"+a.id); return n.length && !n.hasClass("app-manual-hidden"); });
    ["pf-from","pf-to"].forEach(id=>{
      const select=document.getElementById(id);
      select.replaceChildren();
      apps.forEach(app=>{const option=document.createElement("option");option.value="a"+app.id;option.textContent=String(app.name||("アプリ "+app.id));select.appendChild(option);});
    });
    if(activeAppId){ const from=document.getElementById("pf-from"); if(from) from.value="a"+activeAppId; }
  }
}

function findPath(){
  clearPath();
  const from=document.getElementById("pf-from").value;
  const to=document.getElementById("pf-to").value;
  if(from===to){toast("同じアプリです");return;}
  const dijkstra=cy.elements().not(".rel-hidden").not(".rel-manual-hidden").not(".app-manual-hidden").dijkstra({root:"#"+from,directed:false});
  const path=dijkstra.pathTo(cy.getElementById(to));
  if(!path||path.length===0){document.getElementById("path-result").textContent="経路なし";return;}
  const reveal=path.nodes().some(n=>n.hasClass("scope-out"))?showAllScope():Promise.resolve();
  reveal.then(()=>{
    path.addClass("path-node path-edge");
    path.edges().forEach(e=>{ if(e.hasClass("edge-collapsed")) bundleRepresentative(e).addClass("path-edge"); });
    cy.elements().not(path).not(".note-node").not(".path-edge").addClass("dimmed");
    const names=path.nodes().map(n=>appMap.get(n.data("appId"))?.name||"?").join(" → ");
    document.getElementById("path-result").textContent=names;
    fitElements(path,{animate:true});
    toast("経路: "+path.nodes().length+"アプリ");
  });
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
  syncToolButton("minimap-btn",minimapOpen);
  if(minimapOpen) startMinimap(); else clearInterval(minimapTimer);
}
function startMinimap(){
  const canvas=document.getElementById("minimap-canvas");
  const ctx=canvas.getContext("2d");
  const render=()=>{
    const palette=currentPalette();
    canvas.width=190;canvas.height=136;
    ctx.fillStyle=palette.surface;
    ctx.fillRect(0,0,190,136);
    const bb=cy.elements(":visible").boundingBox();
    if(!bb.w) return;
    const sx=180/bb.w,sy=126/bb.h,s=Math.min(sx,sy);
    const ox=(190-bb.w*s)/2,oy=(136-bb.h*s)/2;
    cy.edges(":visible").forEach(e=>{
      const sp=e.sourceEndpoint(),tp=e.targetEndpoint();
      ctx.strokeStyle=e.data("kind")==="LOOKUP"?palette.lookup:(e.data("kind")==="REF"?palette.ref:palette.action);
      ctx.lineWidth=0.6;ctx.beginPath();
      ctx.moveTo((sp.x-bb.x1)*s+ox,(sp.y-bb.y1)*s+oy);
      ctx.lineTo((tp.x-bb.x1)*s+ox,(tp.y-bb.y1)*s+oy);
      ctx.stroke();
    });
    cy.nodes(":visible").forEach(n=>{
      const p=n.position();
      if(n.hasClass("pinned-node")) ctx.fillStyle=palette.pk;
      else if(n.hasClass("focus-root")||n.selected()) ctx.fillStyle=palette.accent;
      else if(n.hasClass("path-node")) ctx.fillStyle="#db2777";
      else if(n.hasClass("highlighted")) ctx.fillStyle=palette.pk;
      else ctx.fillStyle=palette.dim;
      ctx.globalAlpha=(n.hasClass("dimmed")||n.hasClass("focus-dim"))?0.15:0.85;
      ctx.fillRect((p.x-bb.x1)*s+ox-2,(p.y-bb.y1)*s+oy-2,4,4);
      ctx.globalAlpha=1;
    });
    const ext=cy.extent();
    ctx.strokeStyle=palette.accent;ctx.lineWidth=1;ctx.globalAlpha=0.8;
    ctx.strokeRect((ext.x1-bb.x1)*s+ox,(ext.y1-bb.y1)*s+oy,(ext.x2-ext.x1)*s,(ext.y2-ext.y1)*s);
    ctx.globalAlpha=1;
  };
  clearInterval(minimapTimer);
  minimapTimer=setInterval(render,500);
  render();
}

// ─── Command Palette ───
const commands=[
  {label:"画面に合わせる",icon:"⤢",action:fit,keys:"Ctrl+0"},
  {label:"表示: 図",icon:"◇",action:()=>setView("diagram"),keys:"Alt+1"},
  {label:"表示: アプリ一覧（表）",icon:"▤",action:()=>setView("apps"),keys:"Alt+2"},
  {label:"表示: 関連一覧（表）",icon:"▤",action:()=>setView("relations"),keys:"Alt+3"},
  {label:"表示範囲: 全体を表示",icon:"◎",action:showAllScope},
  {label:"表示範囲: 起点まわりを表示",icon:"◉",action:showStartScope},
  {label:"表示範囲: 選んだアプリのまわりを表示",icon:"◉",action:()=>{ if(activeAppId) showAroundApp(activeAppId); else toast("アプリを図で選んでください"); }},
  {label:"表示範囲の深さ: 1（直接の関連先）",icon:"1",action:()=>setScopeDepth(1)},
  {label:"表示範囲の深さ: 2（関連先の関連先）",icon:"2",action:()=>setScopeDepth(2)},
  {label:"配置: 階層（Dagre）",icon:"⬡",action:()=>setLayout("dagre")},
  {label:"配置: 自動（Cose）",icon:"🔄",action:()=>setLayout("cose")},
  {label:"配置: グリッド",icon:"⊞",action:()=>setLayout("grid")},
  {label:"配置: 円形",icon:"◯",action:()=>setLayout("circle")},
  {label:"配置: ツリー",icon:"🌳",action:()=>setLayout("breadthfirst")},
  {label:"配置: 同心円",icon:"◎",action:()=>setLayout("concentric")},
  {label:"関連のないアプリを下にまとめる ON/OFF",icon:"🗂",action:toggleSeparateNoLink},
  {label:"シンプル（項目を隠す）ON/OFF",icon:"⬡",action:toggleSimpleMode},
  {label:"カードの項目: 結合のみ",icon:"⬡",action:()=>setDensity("none")},
  {label:"カードの項目: コンパクト",icon:"🪶",action:()=>setDensity("compact")},
  {label:"カードの項目: 標準",icon:"📄",action:()=>setDensity("standard")},
  {label:"カードの項目: 詳細",icon:"🧾",action:()=>setDensity("full")},
  {label:"アプリ一覧（左）を開閉",icon:"☰",action:()=>toggleSidebar(),keys:"Ctrl+B"},
  {label:"構造チェック（取得状態・循環候補・接続数）",icon:"🩺",action:()=>toggleAnalysisPanel(true)},
  {label:"取得・関連サマリー",icon:"🧭",action:()=>toggleOverview()},
  {label:"経路探索",icon:"🔍",action:togglePathFinder},
  {label:"選んだアプリの関連強調 ON/OFF",icon:"🎯",action:toggleFocusMode,keys:"Shift+F"},
  {label:"強調を解除",icon:"🧹",action:()=>clearFocus()},
  {label:"ルックアップの線 ON/OFF",icon:"🔗",action:()=>toggleRelationKind("LOOKUP")},
  {label:"関連レコード一覧の線 ON/OFF",icon:"📋",action:()=>toggleRelationKind("REF")},
  {label:"アプリアクションの線 ON/OFF",icon:"⚡",action:()=>toggleRelationKind("ACTION")},
  {label:"同じアプリ間の線をまとめる ON/OFF",icon:"≡",action:toggleEdgeBundling},
  {label:"線のラベルを常に表示 ON/OFF",icon:"🏷",action:toggleRelationLabels},
  {label:"元に戻す",icon:"↩",action:undoLast,keys:"Ctrl+Z"},
  {label:"アプリを追加",icon:"⬡",action:()=>openAddApp()},
  {label:"アプリに項目を追加",icon:"📝",action:()=>openAddField()},
  {label:"関連線を追加",icon:"🔗",action:()=>openAddRelation()},
  {label:"メモ（付箋）を追加",icon:"🗒",action:()=>openAddNote()},
  {label:"アプリを編集（名前・枠の色）",icon:"✏",action:()=>openEditApp()},
  {label:"深さごとに枠を色分け",icon:"🎨",action:autoColorByDepth},
  {label:"枠の色分けを解除",icon:"🧼",action:clearNodeColors},
  {label:"選んだアプリを左にそろえる",icon:"⇤",action:()=>alignSelected("x")},
  {label:"選んだアプリを上にそろえる",icon:"⇞",action:()=>alignSelected("y")},
  {label:"選んだアプリを横に等間隔で並べる",icon:"⇶",action:()=>distributeSelected("x")},
  {label:"選んだアプリを縦に等間隔で並べる",icon:"⇩",action:()=>distributeSelected("y")},
  {label:"選んだ関連線を図から削除",icon:"🗑",action:removeSelectedRelations,keys:"Delete"},
  {label:"削除した関連線を戻す",icon:"↺",action:restoreRemovedRelations},
  {label:"選んだアプリを図から削除",icon:"🗑",action:removeSelectedApps,keys:"Delete"},
  {label:"削除したアプリを戻す",icon:"↺",action:restoreRemovedApps},
  {label:"隠した項目をすべて戻す",icon:"↺",action:restoreAllHiddenFields},
  {label:"選んだアプリを固定 / 解除",icon:"📌",action:togglePinFromSelection,keys:"Shift+P"},
  {label:"固定をすべて解除",icon:"📍",action:clearPins},
  {label:"ミニマップ",icon:"🗺",action:toggleMinimap},
  {label:"配色を切り替える（明るい / 暗い）",icon:"◐",action:toggleTheme},
  {label:"編集済みHTMLを保存",icon:"💾",action:exportEditedHtml},
  {label:"編集済みHTMLから編集を取り込む",icon:"📥",action:openEditImport},
  {label:"PNG 画像を保存（白背景）",icon:"🖼",action:exportPNG},
  {label:"Mermaid を出力",icon:"🧜",action:showMermaid},
  {label:"draw.io XML を出力",icon:"📊",action:showDrawio},
  {label:"SQL DDL を出力",icon:"🗄",action:showSQL},
  {label:"PlantUML を出力",icon:"🌱",action:showPlantUML},
  {label:"ERモデル JSON を出力",icon:"{}",action:showJSON},
  {label:"Markdown 仕様書を出力",icon:"📝",action:showMarkdown},
  {label:"CSV（アプリ一覧）を出力",icon:"📑",action:showCSVApps},
  {label:"CSV（フィールド）を出力",icon:"📑",action:showCSVFields},
  {label:"CSV（関連）を出力",icon:"📑",action:showCSVRelations},
  {label:"印刷（資料として）",icon:"🖨",action:printDiagram,keys:"Ctrl+P"},
  {label:"表示状態のURLをコピー",icon:"🔗",action:copyShareUrl},
  {label:"フルスクリーン",icon:"⛶",action:toggleFullscreen,keys:"F11"},
  {label:"拡大",icon:"➕",action:zoomIn,keys:"+"},
  {label:"縮小",icon:"➖",action:zoomOut,keys:"-"},
  {label:"倍率を 100% に戻す",icon:"◎",action:zoomReset,keys:"0"},
  {label:"ヘルプ",icon:"?",action:openHelp,keys:"?"},
  {label:"強調と検索を解除",icon:"✨",action:()=>{cy.elements().removeClass("highlighted dimmed path-node path-edge");clearSearch();clearFocus(true);}},
];

// Add app-focus commands
APPS.forEach(a=>{
  commands.push({label:"アプリ: "+a.name+" (ID:"+a.id+")",icon:"📱",appId:a.id,action:()=>focusApp(a.id)});
});

let cmdReturnFocus=null;
function openCmd(){
  const overlay=document.getElementById("cmd-overlay");
  if(!overlay.classList.contains("open")) cmdReturnFocus=rememberDialogFocus();
  overlay.classList.add("open");
  const inp=document.getElementById("cmd-input");inp.value="";inp.focus();
  filterCmd("");
}
function closeCmd(){
  const overlay=document.getElementById("cmd-overlay");
  const wasOpen=overlay.classList.contains("open");
  overlay.classList.remove("open");
  if(wasOpen){ const back=cmdReturnFocus; cmdReturnFocus=null; restoreDialogFocus(back); }
}

function filterCmd(q){
  const low=q.toLowerCase();
  const filtered=q?commands.filter(c=>c.label.toLowerCase().includes(low)):commands.slice(0,14);
  const box=document.getElementById("cmd-results");
  box.replaceChildren();
  filtered.forEach((command,index)=>{
    const item=document.createElement("button");
    item.type="button";
    item.className="cmd-item"+(index===0?" active":"");
    const icon=document.createElement("span");icon.textContent=String(command.icon||"");icon.setAttribute("aria-hidden","true");
    const label=document.createElement("span");label.textContent=String(command.label||"");
    item.append(icon,label);
    if(command.keys){const keys=document.createElement("span");keys.className="kbd";keys.textContent=String(command.keys);item.appendChild(keys);}
    item.addEventListener("click",()=>runCmd(commands.indexOf(command)));
    box.appendChild(item);
  });
}

function runCmd(idx){closeCmd();commands[idx].action();}

// ─── Keyboard Shortcuts ───
function isTypingTarget(el){
  if(!el) return false;
  const tag=(el.tagName||"").toUpperCase();
  return tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||el.isContentEditable;
}
function isInteractiveShortcutTarget(el){
  if(isTypingTarget(el)) return true;
  return !!(el && typeof el.closest === "function" && el.closest("button,a,summary,[role='button']"));
}
function closeTransientUi(){
  closeCmd();closeModal();closeHelp();closeEditor();closeAllMenus();closeZoomPresets();hideOverview();closeMobileMenu();
}
document.addEventListener("keydown",e=>{
  if(e.key==="k"&&(e.ctrlKey||e.metaKey)){e.preventDefault();openCmd();}
  if(e.key==="b"&&(e.ctrlKey||e.metaKey)){e.preventDefault();toggleSidebar();}
  if(e.key==="f"&&(e.ctrlKey||e.metaKey)){e.preventDefault();document.getElementById("search-box").focus();document.getElementById("search-box").select();}
  if(e.key==="p"&&(e.ctrlKey||e.metaKey)&&!e.shiftKey){e.preventDefault();printDiagram();}
  if(e.altKey&&!e.ctrlKey&&!e.metaKey&&["1","2","3"].includes(e.key)){e.preventDefault();setView(["diagram","apps","relations"][Number(e.key)-1]);}
  if(e.key==="F"&&e.shiftKey&&!e.isComposing&&!e.repeat&&!isInteractiveShortcutTarget(e.target)){e.preventDefault();toggleFocusMode();}
  if(e.key==="P"&&e.shiftKey&&!e.isComposing&&!e.repeat&&!isInteractiveShortcutTarget(e.target)){e.preventDefault();togglePinFromSelection();}
  if(e.key==="0"&&(e.ctrlKey||e.metaKey)){e.preventDefault();fit();}
  if((e.key==="z"||e.key==="Z")&&(e.ctrlKey||e.metaKey)&&!e.shiftKey&&!isTypingTarget(e.target)){e.preventDefault();undoLast();}
  if(e.key==="Escape"){
    const hadDialog=["cmd-overlay","modal-overlay","help-overlay","editor-overlay"].some(id=>document.getElementById(id)?.classList.contains("open"));
    const hadMenu=!!document.querySelector(".tb-menu.open")||!!document.querySelector("#overview:not(.collapsed)");
    closeTransientUi();
    if(hadDialog||hadMenu) return;
    if(isDrawerLayout()&&sidebarIsOpen()){ closeSidebar(); return; }
    closeDetail();toggleAnalysisPanel(false);clearFocus(true);clearAnalysisHighlight();
  }
  if((e.key==="Delete"||e.key==="Backspace")&&!isTypingTarget(e.target)&&activeView==="diagram"){
    const selEdges=cy.edges(":selected");
    const selNotes=cy.nodes(".note-node:selected");
    const selNodes=cy.nodes(":selected").not(".app-manual-hidden").not(".note-node");
    if(selEdges.length||selNodes.length||selNotes.length){
      e.preventDefault();
      if(selEdges.length) removeSelectedRelations();
      if(selNodes.length) removeSelectedApps();
      if(selNotes.length){ deleteNoteNodes(selNotes); toast("メモを削除しました: "+selNotes.length+"件（Ctrl+Z で戻せます）"); }
    }
  }
  if(!isTypingTarget(e.target)){
    if(e.key==="?"||(e.key==="/"&&e.shiftKey)){e.preventDefault();openHelp();}
    if(activeView==="diagram"&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      if(e.key==="+"||e.key==="="){e.preventDefault();zoomIn();}
      if(e.key==="-"||e.key==="_"){e.preventDefault();zoomOut();}
      if(e.key==="0"){e.preventDefault();zoomReset();}
    }
    if(e.key==="F11"){e.preventDefault();toggleFullscreen();}
  }
  // cmd palette navigation
  if(document.getElementById("cmd-overlay").classList.contains("open")){
    const items=[...document.querySelectorAll(".cmd-item")];
    const ai=items.findIndex(i=>i.classList.contains("active"));
    if(e.key==="ArrowDown"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.min(ai+1,items.length-1)]?.classList.add("active");items[Math.min(ai+1,items.length-1)]?.scrollIntoView({block:"nearest"});}
    if(e.key==="ArrowUp"){e.preventDefault();items[ai]?.classList.remove("active");items[Math.max(ai-1,0)]?.classList.add("active");items[Math.max(ai-1,0)]?.scrollIntoView({block:"nearest"});}
    if(e.key==="Enter"){e.preventDefault();items[ai]?.click();}
  }
});

// ─── Zoom controls ───
function closeZoomPresets(){
  const presets=document.getElementById("zoom-presets");
  const trigger=document.getElementById("zoom-level");
  const restoreFocus=!!(presets&&presets.contains(document.activeElement));
  presets?.classList.remove("open");
  trigger?.setAttribute("aria-expanded","false");
  if(restoreFocus) trigger?.focus();
}
function toggleZoomPresets(){
  const presets=document.getElementById("zoom-presets");
  const trigger=document.getElementById("zoom-level");
  if(!presets||!trigger) return;
  const open=!presets.classList.contains("open");
  presets.classList.toggle("open",open);
  trigger.setAttribute("aria-expanded",String(open));
  if(open){
    const current=presets.querySelector('[aria-pressed="true"]')||presets.querySelector("button");
    current?.focus();
  }
}
function updateZoomLabel(){
  const percent=Math.round(cy.zoom()*100);
  applySemanticZoom(cy.zoom());
  const value=document.getElementById("zoom-value");
  const mode=document.getElementById("zoom-mode");
  const trigger=document.getElementById("zoom-level");
  if(value) value.textContent=percent+"%";
  if(mode) mode.textContent=cy.zoom()<0.35?"構造":(cy.zoom()<SEMANTIC_ZOOM_THRESHOLD?"概要":"");
  if(trigger){
    trigger.setAttribute("aria-label","現在の表示倍率 "+percent+"%。倍率プリセットを開く");
    trigger.title=cy.zoom()<SEMANTIC_ZOOM_THRESHOLD
      ? "縮小中はアプリ名を大きく出す概要のカードです。押すと倍率を選べます"
      : "倍率を選ぶ";
  }
  document.querySelectorAll(".zoom-preset").forEach(button=>{
    button.setAttribute("aria-pressed",String(Number(button.dataset.zoom)===percent));
  });
}
function setZoomLevel(level){
  cy.zoom({level:Math.max(cy.minZoom(),Math.min(level,cy.maxZoom())),renderedPosition:{x:cy.width()/2,y:cy.height()/2}});
  updateZoomLabel();
}
function setZoomPercent(percent){setZoomLevel(Number(percent)/100);closeZoomPresets();document.getElementById("zoom-level")?.focus();}
function zoomIn(){closeZoomPresets();setZoomLevel(cy.zoom()*1.25);}
function zoomOut(){closeZoomPresets();setZoomLevel(cy.zoom()/1.25);}
function zoomReset(){closeZoomPresets();cy.zoom(1);cy.center();updateZoomLabel();}
cy.on("zoom", updateZoomLabel);

// ─── Fullscreen ───
function toggleFullscreen(){
  const doc=document;
  const el=doc.documentElement;
  try{
    if(!doc.fullscreenElement){
      (el.requestFullscreen||el.webkitRequestFullscreen).call(el);
    }else{
      (doc.exitFullscreen||doc.webkitExitFullscreen).call(doc);
    }
  }catch(_){ toast("このブラウザはフルスクリーンに対応していません"); }
}
document.addEventListener("fullscreenchange",()=>{
  syncToolButton("fs-btn",!!document.fullscreenElement);
});

// ─── Dropdown menus ───
function toggleMenu(id){
  const m=document.getElementById(id);
  if(!m) return;
  const willOpen=!m.classList.contains("open");
  closeAllMenus();
  hideOverview();
  if(willOpen){
    m.classList.add("open");
    m.querySelector(".tb-menu-btn")?.setAttribute("aria-expanded","true");
    positionMenuPanel(m);
  }
}
// 狭い画面では、メニューを操作バーの下に、画面の幅いっぱいに出す（操作バーの中の操作に重ねない）
function positionMenuPanel(menu){
  const panel=menu.querySelector(".tb-menu-panel");
  if(!panel) return;
  if(window.matchMedia&&window.matchMedia("(max-width:900px)").matches){
    const top=Math.round(document.getElementById("topbar").getBoundingClientRect().bottom+6);
    panel.style.top=top+"px";
    panel.style.maxHeight=Math.max(160,innerHeight-top-8)+"px";
  }else{
    panel.style.top="";
    panel.style.maxHeight="";
  }
}
function closeAllMenus(){
  document.querySelectorAll(".tb-menu.open").forEach(x=>{
    x.classList.remove("open");
    x.querySelector(".tb-menu-btn")?.setAttribute("aria-expanded","false");
  });
}
document.addEventListener("click",(e)=>{
  const inside=e.target.closest(".tb-menu");
  if(!inside) closeAllMenus();
  if(!e.target.closest("#zoom-ctrl")) closeZoomPresets();
  if(!e.target.closest("#overview")&&!e.target.closest("#overview-pill")) hideOverview();
});
// メニューの項目を押したら閉じる（表示設定の切り替えは続けて操作できるよう、開いたままにする）
document.querySelectorAll(".tb-menu").forEach(menu=>{
  menu.addEventListener("click",(e)=>{
    const item=e.target.closest(".tb-menu-panel button");
    if(item&&!item.closest(".settings-panel")) setTimeout(closeAllMenus,0);
  });
});

// ─── Mobile menu toggle ───
function toggleMobileMenu(){
  const topbar=document.getElementById("topbar");
  const open=!topbar.classList.contains("mobile-open");
  topbar.classList.toggle("mobile-open",open);
  document.getElementById("mobile-menu-btn")?.setAttribute("aria-expanded",String(open));
}
function closeMobileMenu(){
  document.getElementById("topbar")?.classList.remove("mobile-open");
  document.getElementById("mobile-menu-btn")?.setAttribute("aria-expanded","false");
}
let resizeTimer=0;
window.addEventListener("resize",()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{ syncSidebarMode(); cy.resize(); },120);
},{passive:true});

// ─── ダイアログのフォーカス管理（開くと中へ移し、閉じると開いた操作の位置へ戻す） ───
function rememberDialogFocus(){
  const active=document.activeElement;
  if(!active||active===document.body||typeof active.focus!=="function") return null;
  // メニュー項目から開いた場合、項目はメニューを閉じると消えるため、メニューの開閉ボタンへ戻す
  const menu=typeof active.closest==="function"?active.closest(".tb-menu"):null;
  return (menu&&menu.querySelector(".tb-menu-btn"))||active;
}
function restoreDialogFocus(target){
  if(target&&target.isConnected&&target.getClientRects().length>0) target.focus();
}

// ─── Help modal ───
let helpReturnFocus=null;
function openHelp(){
  const overlay=document.getElementById("help-overlay");
  if(!overlay.classList.contains("open")) helpReturnFocus=rememberDialogFocus();
  overlay.classList.add("open");
  const close=document.querySelector("#help-box .close-row button");
  if(close) close.focus();
}
function closeHelp(){
  const overlay=document.getElementById("help-overlay");
  const wasOpen=overlay.classList.contains("open");
  overlay.classList.remove("open");
  if(wasOpen){ const back=helpReturnFocus; helpReturnFocus=null; restoreDialogFocus(back); }
}

// ─── 印刷: 見出し・図（現在の表示の画像）・アプリ一覧・関連一覧の資料にする ───
function printConnectionText(){
  return (ER_OPTIONS.sourceHost?ER_OPTIONS.sourceHost+" / ":"")+(ER_OPTIONS.sourceGuestId?("ゲストスペース "+ER_OPTIONS.sourceGuestId):"通常空間")+" / "+(ER_OPTIONS.sourcePreview?"プレビュー":"本番");
}
function scopeDescription(){
  const total=appNodeCount();
  if(viewScope.mode==="all") return "全体（"+total+" アプリ）";
  const shown=cy.nodes().filter(n=>!n.hasClass("note-node")&&!n.hasClass("app-manual-hidden")&&!n.hasClass("scope-out")).length;
  const names=viewScope.roots.map(id=>{const a=findApp(id);return a?a.name:"App "+id;});
  return (isStartScope(viewScope)?"起点まわり":"「"+names.join("」「")+"」のまわり")+"（深さ "+viewScope.depth+"、"+shown+" / "+total+" アプリ）";
}
function buildPrintDocHtml(){
  recomputeErAnalysis();
  const startIds=ER_OPTIONS.startAppIds||[];
  const startNames=startIds.slice(0,8).map(id=>{const a=findApp(id);return a?a.name+"（App "+id+"）":"App "+id;});
  const meta=[
    ["対象（起点）",startNames.join("、")+(startIds.length>8?" ほか "+(startIds.length-8)+" 件":"")||"-"],
    ...(ER_OPTIONS.sourceLabel?[["取得元",ER_OPTIONS.sourceLabel]]:[]),
    ["取得日時",ER_OPTIONS.generatedAt?new Date(ER_OPTIONS.generatedAt).toLocaleString("ja-JP"):"-"],
    ["印刷日時",new Date().toLocaleString("ja-JP")],
    ["接続先",printConnectionText()],
    ["取得状態","取得完了 "+ER_ANALYSIS.counts.retrievalComplete+" / 一部取得 "+ER_ANALYSIS.counts.retrievalPartial+" / 取得失敗 "+ER_ANALYSIS.counts.retrievalFailed+" / 未取得の参照先 "+(ER_ANALYSIS.unresolvedTargets||[]).length],
    ["アプリ・関連",APPS.length+" アプリ / "+APPS.reduce((s,a)=>s+(a.relations||[]).length,0)+" 関連"],
    ["図の表示範囲",scopeDescription()]
  ];
  if(ER_OPTIONS.reverseScanNote) meta.push(["注意",ER_OPTIONS.reverseScanNote]);
  const apps=sortRows(appTableRows(),APP_TABLE_COLUMNS,tableState.apps);
  const rels=sortRows(relationTableRows(),RELATION_TABLE_COLUMNS,tableState.relations);
  let html='<h1>kintone ER図</h1><dl class="print-meta">'+meta.map(([k,v])=>'<dt>'+escapeHtml(k)+'</dt><dd>'+escapeHtml(v)+'</dd>').join('')+'</dl>';
  html+='<figure id="print-figure-wrap"><figcaption>図: '+escapeHtml(scopeDescription())+'。実線はルックアップ、破線は関連レコード一覧、点線はアプリアクション。</figcaption></figure>';
  html+='<h2>アプリ一覧（'+apps.length+' 件）</h2><table><thead><tr><th>App ID</th><th>アプリ名</th><th>スペース</th><th>項目数</th><th>参照する</th><th>参照される</th><th>状態</th></tr></thead><tbody>'
    +apps.map(r=>'<tr><td>'+(r.app.isCustom?'手動':escapeHtml(r.id))+'</td><td>'+escapeHtml(r.name)+(r.start&&startMarksEnabled()?'（起点）':'')+'</td><td>'+escapeHtml(r.space?'#'+r.space:'-')+'</td><td>'+r.fields+'</td><td>'+r.out+'</td><td>'+r.inc+'</td><td>'+escapeHtml(r.status+(r.issues.length?'：'+r.issues.join(' / '):''))+'</td></tr>').join('')
    +'</tbody></table>';
  html+='<h2>関連一覧（'+rels.length+' 件）</h2><table><thead><tr><th>種類</th><th>参照元アプリ</th><th>参照元の項目</th><th>参照先アプリ</th><th>参照先の項目</th><th>コピー・表示する項目</th><th>絞り込み条件</th></tr></thead><tbody>'
    +rels.map(r=>'<tr><td>'+escapeHtml(relationKindJp(r.kind))+(r.removed?'（図から削除）':'')+'</td><td>'+escapeHtml(r.sourceName)+'</td><td>'+escapeHtml(r.sourceField||'-')+'</td><td>'+escapeHtml(r.targetName)+'</td><td>'+escapeHtml(r.targetField||'-')+'</td><td>'+escapeHtml(r.fieldsText||'-')+'</td><td>'+escapeHtml(r.filter||'-')+'</td></tr>').join('')
    +'</tbody></table>';
  html+='<p class="print-note">この資料は kintone ER図（読み取り専用のツール）で作成しました。手動で追加・削除した内容を含む場合があります。</p>';
  return html;
}
// 図の画像は、印刷するときだけ作る（開いた時点では画像の要素を置かない）
let printPrepared=false;
function setPrintFigure(dataUrl){
  const wrap=document.getElementById("print-figure-wrap");
  if(!wrap||!dataUrl) return Promise.resolve();
  const img=document.createElement("img");
  img.alt="ER図（"+scopeDescription()+"）";
  wrap.insertBefore(img,wrap.firstChild);
  return new Promise(resolve=>{ img.onload=img.onerror=()=>resolve(); img.src=dataUrl; });
}
function preparePrint(){
  const doc=document.getElementById("print-doc");
  doc.innerHTML=buildPrintDocHtml();
  printPrepared=true;
  return buildExportImage(5000,{bare:true}).then(setPrintFigure).catch(err=>{ console.error("[ER] 印刷用の図の作成に失敗",err); });
}
function clearPrintDoc(){
  const doc=document.getElementById("print-doc");
  if(doc) doc.innerHTML="";
  printPrepared=false;
}
let printing=false;
function printDiagram(){
  if(printing) return;
  printing=true;
  toast("印刷用の資料を作成しています…");
  preparePrint().then(()=>{
    try{ window.print(); }catch(_){ toast("印刷を開けませんでした"); }
  }).finally(()=>{ printing=false; });
}
// ブラウザのメニューや Ctrl+P 以外の方法で印刷したときも、表と見出しは出す（図は画面の画像を使う）
window.addEventListener("beforeprint",()=>{
  if(printPrepared) return;
  const doc=document.getElementById("print-doc");
  doc.innerHTML=buildPrintDocHtml();
  try{
    const box=cy.elements(":visible").boundingBox();
    const data=cy.png({bg:"#ffffff",full:true,scale:Math.min(2,4000/Math.max(box.w,box.h,1))});
    const wrap=document.getElementById("print-figure-wrap");
    const img=document.createElement("img");
    img.alt="ER図";
    img.src=data;
    wrap.insertBefore(img,wrap.firstChild);
  }catch(err){ console.error("[ER] 印刷用の図の作成に失敗",err); }
  printPrepared=true;
});
window.addEventListener("afterprint",()=>{ setTimeout(clearPrintDoc,0); });

// ─── ダブルクリック ───
// アプリをダブルクリックすると、そのアプリのまわりだけを表示する
cy.on("dbltap","node",e=>{
  const n=e.target;
  if(n.hasClass("note-node")) return;
  if(n.data("appId")!=null) showAroundApp(n.data("appId"));
});
// 背景をダブルクリックすると、その位置にアプリを追加する
cy.on("dbltap",e=>{
  if(e.target===cy) openAddApp({x:e.position.x,y:e.position.y});
});

// ─── Hover tooltip（ノード / 関連線） ───
let tipEl;
function ensureTip(){
  if(tipEl) return tipEl;
  tipEl=document.createElement("div");
  tipEl.id="er-tooltip";
  tipEl.setAttribute("role","tooltip");
  document.body.appendChild(tipEl);
  return tipEl;
}
cy.on("mouseover","node",e=>{
  if(e.target.hasClass("note-node")) return;
  const app=appMap.get(e.target.data("appId"));
  if(!app) return;
  ensureTip();
  const _v = visibleFieldsForNode(app).length;
  const _t = typeof app.totalFieldCount === "number" ? app.totalFieldCount : _v;
  const _itemText = _t > _v ? (_v + "/" + _t) : _v;
  tipEl.innerHTML="<b>"+escapeHtml(app.name)+"</b> "+(app.isCustom?"(手動追加)":"(App "+escapeHtml(String(app.id))+")")+"<br>項目: "+_itemText+" | 参照 "+app.relations.length+" | 被参照 "+incomingRelationCount(app.id)+(isFailedApp(app)?"<br>⚠ 取得失敗":(isPartialApp(app)?"<br>△ 一部取得":""));
  tipEl.style.display="block";
});
cy.on("mouseout","node",()=>{if(tipEl) tipEl.style.display="none";});
// 線にマウスを乗せたときの補足（コピーするフィールド・表示するフィールド・絞り込み条件）。長いときは省略する
function edgeDetailTipHtml(edge){
  const found=relationForEdgeId(edge.id());
  const rel=found?found.rel:null;
  if(!rel) return "";
  const short=text=>text.length>140?text.slice(0,139)+"…":text;
  let html="";
  if(relCopyText(rel)) html+="<br>コピー: "+escapeHtml(short(relCopyText(rel)));
  if(relDisplayText(rel)) html+="<br>表示: "+escapeHtml(short(relDisplayText(rel)));
  if(relFilterText(rel)) html+="<br>絞り込み: "+escapeHtml(short(relFilterText(rel)));
  return html;
}
// 線にマウスを乗せると強調 + ラベル非表示中でも内容をその場で確認できる
cy.on("mouseover","edge",e=>{
  const edge=e.target;
  if(edge.hasClass("rel-hidden")||edge.hasClass("rel-manual-hidden")||edge.hasClass("edge-collapsed")) return;
  edge.addClass("edge-hover");
  const src=appMap.get(edge.source().data("appId"));
  const dst=appMap.get(edge.target().data("appId"));
  const count=Number(edge.data("bundleCount"))||1;
  ensureTip();
  tipEl.innerHTML="<b>"+escapeHtml(count>1?count+"本の"+relationKindJp(edge.data("kind")):(edge.data("fromDisplay")||edge.data("fromLabel")||relationKindJp(edge.data("kind"))))+"</b><br>"
    +escapeHtml(src?src.name:"?")+" → "+escapeHtml(dst?dst.name:"未取得の参照先")
    +"<br>種類: "+relationKindJp(edge.data("kind"))+(edge.data("isCustom")?"（手動追加）":"")
    +(count>1?"<br>押すと、まとめた関連線をすべて表示します":edgeDetailTipHtml(edge));
  tipEl.style.display="block";
});
cy.on("mouseout","edge",e=>{
  e.target.removeClass("edge-hover");
  if(tipEl) tipEl.style.display="none";
});
cy.on("mousemove",e=>{
  if(tipEl&&tipEl.style.display==="block"){
    const x=e.originalEvent.clientX+14,y=e.originalEvent.clientY+14;
    tipEl.style.left=Math.min(x,innerWidth-tipEl.offsetWidth-8)+"px";
    tipEl.style.top=Math.min(y,innerHeight-tipEl.offsetHeight-8)+"px";
  }
});

// ─── 凡例（狭い画面では畳む） ───
function syncLegendToggle(){
  const legend=document.getElementById("legend");
  const btn=document.getElementById("legend-toggle-btn");
  if(btn&&legend) btn.setAttribute("aria-expanded",String(legend.classList.contains("open")));
}
function toggleLegend(){
  document.getElementById("legend")?.classList.toggle("open");
  syncLegendToggle();
}
