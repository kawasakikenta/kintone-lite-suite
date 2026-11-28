// ER図ビューアー: 画面の操作の受け口。
// CSP の script-src は埋め込んだスクリプトのハッシュだけを許可し、'unsafe-inline' を使わない。そのため onclick などのイベント属性は使えない
// （どこかで文字の逃がしが漏れても、差し込まれたイベント属性や、javascript スキームの URL は動かない）。
// ボタンなどには操作の名前を data-action（押す）・data-change（選ぶ）・data-input（入力する）・data-keydown（キーを押す）に書き、
// document で受けて、下の表にある操作だけを呼ぶ（表に無い名前は何もしない。関数の名前をそのまま呼ぶことはしない）。
// 受けるのは捕捉の段階（capture）。イベント属性と同じく、要素や上の要素に付けた処理より先に動く。
// 動的に作る HTML（詳細パネル・表・構造チェック・表示範囲の帯・色の見本）も同じ書き方にする。保存し直した HTML でもそのまま動く。

// 押したときの操作。el は data-action を持つ要素、event は click
const ER_CLICK_ACTIONS={
  // 操作バー
  "sidebar-toggle":el=>toggleSidebar(undefined,el),
  "overview-toggle":()=>toggleOverview(),
  "view":el=>setView(el.dataset.view),
  "mobile-menu":()=>toggleMobileMenu(),
  "menu":el=>toggleMenu(el.dataset.menu),
  "theme":()=>toggleTheme(),
  "help":()=>openHelp(),
  // 表示設定
  "scope-start":()=>showStartScope(),
  "scope-all":()=>showAllScope(),
  "scope-depth":el=>setScopeDepth(Number(el.dataset.depth)),
  "layout":el=>setLayout(el.dataset.layoutBtn),
  "separate-nolink":()=>toggleSeparateNoLink(),
  "simple-mode":()=>toggleSimpleMode(),
  "relation-kind":el=>toggleRelationKind(el.dataset.kind),
  "bundle":()=>toggleEdgeBundling(),
  "relation-labels":()=>toggleRelationLabels(),
  "focus-mode":()=>toggleFocusMode(),
  "clear-focus":()=>{clearFocus();closeAllMenus();},
  "path-finder":()=>togglePathFinder(),
  "minimap":()=>toggleMinimap(),
  "fullscreen":()=>toggleFullscreen(),
  // 編集
  "undo":()=>undoLast(),
  "add-app":()=>openAddApp(),
  "add-field":()=>openAddField(),
  "add-relation":()=>openAddRelation(),
  "add-note":()=>openAddNote(),
  "edit-app":el=>openEditApp(el.dataset.app),
  "toggle-pin":()=>togglePinFromSelection(),
  "remove-relations":()=>removeSelectedRelations(),
  "remove-apps":()=>removeSelectedApps(),
  "align":el=>alignSelected(el.dataset.axis),
  "distribute":el=>distributeSelected(el.dataset.axis),
  "color-by-depth":()=>autoColorByDepth(),
  "clear-colors":()=>clearNodeColors(),
  "restore-relations":()=>restoreRemovedRelations(),
  "restore-apps":()=>restoreRemovedApps(),
  "restore-all-fields":()=>restoreAllHiddenFields(),
  "clear-pins":()=>clearPins(),
  "edit-import":()=>openEditImport(),
  // 出力
  "print":()=>printDiagram(),
  "save-html":()=>exportEditedHtml(),
  "png":()=>exportPNG(),
  "markdown":()=>showMarkdown(),
  "csv-apps":()=>showCSVApps(),
  "csv-fields":()=>showCSVFields(),
  "csv-relations":()=>showCSVRelations(),
  "json":()=>showJSON(),
  "mermaid":()=>showMermaid(),
  "drawio":()=>showDrawio(),
  "plantuml":()=>showPlantUML(),
  "sql":()=>showSQL(),
  "share-url":()=>copyShareUrl(),
  // アプリ一覧（左）・構造チェック・凡例
  "sidebar-close":()=>closeSidebar(),
  "analysis-toggle":()=>toggleAnalysisPanel(),
  "analysis-open":()=>{toggleAnalysisPanel(true);showDiagramView();},
  "analysis-close":()=>toggleAnalysisPanel(false),
  "analysis-focus":el=>focusAnalysisApps(el.dataset.analysisIds),
  "legend-toggle":()=>toggleLegend(),
  // 表示倍率・経路探索
  "zoom-in":()=>zoomIn(),
  "zoom-out":()=>zoomOut(),
  "zoom-reset":()=>zoomReset(),
  "zoom-fit":()=>fit(),
  "zoom-presets":()=>toggleZoomPresets(),
  "zoom-percent":el=>setZoomPercent(Number(el.dataset.zoom)),
  "find-path":()=>findPath(),
  "clear-path":()=>clearPath(),
  // 詳細パネル・表
  "detail-close":()=>closeDetail(),
  "focus-app":el=>focusApp(el.dataset.app),
  "show-around":el=>showAroundApp(el.dataset.app),
  "restore-fields":el=>restoreHiddenFields(el.dataset.app),
  "edit-relation-row":el=>openEditRelationRow(el),
  "toggle-relation-row":el=>toggleRelationEdgeFromRow(el),
  "edit-field-row":el=>openEditFieldRow(el),
  "hide-field-row":el=>hideFieldFromRow(el),
  "go-edge":el=>goToRelationEdge(el.dataset.edge),
  "sort":el=>sortTable(el.dataset.table,el.dataset.sort),
  "apps-check":el=>setAppsCheck(el.dataset.check),
  "relation-table-kind":el=>toggleRelationTableKind(el.dataset.kind),
  // 取得・関連サマリー
  "overview-close":()=>hideOverview(),
  "overview-analysis":()=>{hideOverview();toggleAnalysisPanel(true);},
  "overview-relations":el=>{hideOverview();showRelationsTable(el.dataset.state||"");},
  // ダイアログ
  "backdrop":(el,event)=>{ if(event.target===el) closeErDialog(el.dataset.dialog); },
  "modal-copy":()=>copyModal(),
  "modal-download":()=>downloadModal(),
  "modal-close":()=>closeModal(),
  "editor-delete":()=>deleteFromEditor(),
  "editor-submit":()=>submitEditor(),
  "editor-close":()=>closeEditor(),
  "swatch":el=>selectSwatch(el),
  "help-close":()=>closeHelp(),
  "help-cmd":()=>{closeHelp();openCmd();}
};
// 行の中のボタン（✎・✕）は、押した後にイベントが伝わるのを止める（以前の onclick の event.stopPropagation() と同じ）
const ER_STOP_ACTIONS=new Set(["edit-relation-row","toggle-relation-row","edit-field-row","hide-field-row"]);
// 選んだときの操作（select の change）
const ER_CHANGE_ACTIONS={
  "density":el=>setDensity(el.value),
  "focus-options":()=>updateFocusOptions(),
  "app-list-filter":()=>refreshAppList(),
  "apps-status":el=>setAppsStatus(el.value),
  "relations-state":el=>setRelationsState(el.value)
};
// 入力したときの操作（input）
const ER_INPUT_ACTIONS={
  "search":el=>searchGraph(el.value),
  "cmd-filter":el=>filterCmd(el.value),
  "detail-filter":el=>filterDetailFields(el.value)
};
// キーを押したときの操作（keydown）
const ER_KEYDOWN_ACTIONS={
  "search":(el,event)=>{ if(event.key==="Enter"){ event.preventDefault(); focusNextSearchMatch(); } },
  "view-tab":(el,event)=>onViewTabKey(event)
};
// 背景を押して閉じるダイアログ
function closeErDialog(name){
  if(name==="cmd") closeCmd();
  else if(name==="modal") closeModal();
  else if(name==="editor") closeEditor();
  else if(name==="help") closeHelp();
}
function erActionListener(table,attribute){
  return function(event){
    const start=event.target;
    if(!start||typeof start.closest!=="function") return;
    const el=start.closest("["+attribute+"]");
    if(!el) return;
    const name=el.getAttribute(attribute);
    if(!Object.prototype.hasOwnProperty.call(table,name)) return;
    if(attribute==="data-action"&&ER_STOP_ACTIONS.has(name)) event.stopPropagation();
    table[name](el,event);
  };
}
document.addEventListener("click",erActionListener(ER_CLICK_ACTIONS,"data-action"),true);
document.addEventListener("change",erActionListener(ER_CHANGE_ACTIONS,"data-change"),true);
document.addEventListener("input",erActionListener(ER_INPUT_ACTIONS,"data-input"),true);
document.addEventListener("keydown",erActionListener(ER_KEYDOWN_ACTIONS,"data-keydown"),true);
