// ER図ビューアー: 起動。すべての関数と状態を定義した後に、画面の状態を決めて最初の配置をする。
// 保存した HTML（編集済みHTML）は開いた時点の画面の部品を複製しているため、ここで開閉や表示を初期の状態に戻す。
applyTheme();
syncLayoutButtons(ER_OPTIONS.layoutName || "dagre");
syncDensityControl();
syncSeparateNoLinkButton();
syncFocusButton();
syncRelationKindButtons();
syncBundleButton();
syncSimpleModeButton();
syncRelationLabelButton();
setView("diagram");
hideOverview();
closeDetail();
syncSidebarMode();
syncLegendToggle();
const restoredScope = applySavedViewState();
applyRelationFilter();
applyRelationLabelVisibility();
updateFocusOptions();
updateSearchMeta("", 0);
renderAnalysisPanel();
refreshSidebar();
if(hasSavedLayout){
  // 保存した位置をそのまま使い、配置し直さない
  setScope(restoredScope || { mode: "all" }, { initial: true, keepPositions: true });
  if(ER_EDIT_STATE.view && typeof ER_EDIT_STATE.view.zoom === "number" && ER_EDIT_STATE.view.pan){
    cy.viewport({zoom:ER_EDIT_STATE.view.zoom, pan:ER_EDIT_STATE.view.pan});
  }else{
    setTimeout(fit,100);
  }
}else{
  setScope(defaultScope(), { initial: true });
}
setTimeout(updateZoomLabel, 300);
setTimeout(applyStateFromHash, 350);
