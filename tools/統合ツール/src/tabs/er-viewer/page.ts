'use strict';

// ER図ビューアーの HTML の骨組み。画面の見た目は viewer.css、動きは viewer-*.js（どちらも文字列として取り込む）。
// 生成する HTML は自己完結（描画ライブラリ・CSS・スクリプトをすべてインラインで持ち、通信しない）。
import { esc } from '../../utils.js';
import viewerCss from './viewer.css?raw';
import viewerCore from './viewer-core.js?raw';
import viewerEdit from './viewer-edit.js?raw';
import viewerUi from './viewer-ui.js?raw';
import viewerExport from './viewer-export.js?raw';
import viewerImport from './viewer-import.js?raw';
import viewerBoot from './viewer-boot.js?raw';

/** 取り込んだテキストの改行を LF にそろえる（作業ツリーは CRLF のことがある）。 */
const lf = (text: string): string => String(text).replace(/\r\n?/g, '\n');

/** viewer-*.js を、起動処理が最後になる順につなぐ。 */
export const ER_VIEWER_SCRIPT = [viewerCore, viewerEdit, viewerUi, viewerExport, viewerImport, viewerBoot].map(lf).join('\n');
export const ER_VIEWER_CSS = lf(viewerCss);

export interface ErViewerAnalysisCounts {
  retrievalComplete: number;
  retrievalPartial: number;
  retrievalFailed: number;
}

export interface ErViewerPageContext {
  /** <title> */
  pageTitle: string;
  /** 見出しの横に出す対象（起点アプリ） */
  targetText: string;
  targetTitle: string;
  /** 取得日時（表示用） */
  generatedText: string;
  /** 設定JSONから作った図の取得元（「設定JSONから作成（取得日時 取得）」）。あれば見出しの取得日時の代わりに出す */
  sourceText?: string;
  /** 接続先（ホスト・空間・本番／プレビュー） */
  connectionText: string;
  libraryScripts: string;
  appCount: number;
  relationCount: number;
  summary: { relations: number; lookups: number; refs: number; actions: number; required: number };
  analysis: {
    counts: ErViewerAnalysisCounts;
    cycles: number;
    isolated: number;
    selfReferences: number;
    unresolved: number;
    highConnectionThreshold: number;
  };
  /** 取得・関連サマリーに出す取得条件 [名前, 値] */
  conditions: Array<[string, string]>;
  densityLabel: string;
  layoutLabel: string;
  /** <script id="er-main"> の中身（データの定数 + ビューアー） */
  mainScript: string;
  /** 描画ライブラリを初期化できないときの表の行（JSON 文字列リテラル） */
  fallbackRowsJson: string;
}

const LAYOUT_BUTTONS: Array<[string, string, string]> = [
  ['dagre', '階層', '関連の向きに沿って左から右へ並べます（おすすめ）'],
  ['cose', '自動', 'つながりの強さで自動に並べます'],
  ['breadthfirst', 'ツリー', '起点から木の形に並べます'],
  ['concentric', '同心円', '関連の多いアプリを中心に並べます'],
  ['grid', 'グリッド', '格子状に並べます'],
  ['circle', '円形', '円の上に並べます']
];

export function renderErViewerPage(ctx: ErViewerPageContext): string {
  const a = ctx.analysis;
  const attention = a.counts.retrievalPartial + a.counts.retrievalFailed;
  return /*html*/`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'">
<meta name="color-scheme" content="light dark">
<title>${esc(ctx.pageTitle)}</title>
${ctx.libraryScripts}
<style>
${ER_VIEWER_CSS}
</style>
</head>
<body>

<header id="topbar">
  <button type="button" class="tb tb-icon" id="sidebar-toggle-btn" onclick="toggleSidebar(undefined,this)" title="アプリ一覧を開閉 (Ctrl+B)" aria-label="アプリ一覧を開閉" aria-controls="sidebar" aria-expanded="true">☰</button>
  <div class="brand">
    <h1 id="er-title" title="${esc(ctx.targetTitle)}">kintone ER図<small>${esc(ctx.targetText)}</small></h1>
    <div class="brand-sub">
      <button type="button" class="meta-pill meta-pill--btn" id="overview-pill" onclick="toggleOverview()" title="取得・関連サマリーを開く" aria-controls="overview" aria-expanded="false">${ctx.appCount}アプリ · ${ctx.relationCount}関連 · 循環${a.cycles} · 孤立${a.isolated} · 未取得${a.unresolved}<span aria-hidden="true"> ▾</span></button>
      <span class="brand-meta" title="${ctx.sourceText ? esc(`${ctx.sourceText} · ${ctx.connectionText}`) : '取得日時と接続先'}">${ctx.sourceText ? esc(ctx.sourceText) : `${esc(ctx.generatedText)} 取得`} · ${esc(ctx.connectionText)}</span>
    </div>
  </div>
  <div class="search-wrap" role="search">
    <input id="search-box" type="search" placeholder="アプリ・項目を検索 (Ctrl+F)" aria-label="アプリ・項目を検索（図・アプリ一覧・表に効きます）" autocomplete="off" oninput="searchGraph(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();focusNextSearchMatch();}">
    <span class="meta-pill" id="search-meta" hidden aria-live="polite"><b>検索</b> すべて</span>
  </div>
  <div class="view-tabs" role="tablist" aria-label="表示の切り替え">
    <button type="button" role="tab" class="view-tab" id="tab-diagram" aria-selected="true" aria-controls="view-diagram" onclick="setView('diagram')" onkeydown="onViewTabKey(event)" title="図 (Alt+1)">図</button>
    <button type="button" role="tab" class="view-tab" id="tab-apps" aria-selected="false" aria-controls="view-apps" tabindex="-1" onclick="setView('apps')" onkeydown="onViewTabKey(event)" title="アプリ一覧 (Alt+2)">アプリ<span class="tab-long">一覧</span><span class="tab-count">${ctx.appCount}</span></button>
    <button type="button" role="tab" class="view-tab" id="tab-relations" aria-selected="false" aria-controls="view-relations" tabindex="-1" onclick="setView('relations')" onkeydown="onViewTabKey(event)" title="関連一覧 (Alt+3)">関連<span class="tab-long">一覧</span><span class="tab-count">${ctx.relationCount}</span></button>
  </div>
  <button type="button" class="tb tb-icon" id="mobile-menu-btn" onclick="toggleMobileMenu()" title="ほかの操作" aria-label="ほかの操作" aria-expanded="false">⋯</button>
  <div class="tb-actions">
    <div class="tb-menu" id="settings-menu">
      <button type="button" class="tb tb-menu-btn" id="settings-btn" onclick="toggleMenu('settings-menu')" aria-haspopup="true" aria-expanded="false" title="表示範囲・配置・カードの項目・線・強調">表示設定</button>
      <div class="tb-menu-panel settings-panel" role="group" aria-label="表示設定">
        <div class="settings-group">
          <div class="menu-heading">表示範囲</div>
          <div class="seg" role="group" aria-label="表示範囲">
            <button type="button" class="tb" data-scope-btn="start" aria-pressed="false" onclick="showStartScope()" title="起点とその関連先だけを表示します">起点まわり</button>
            <button type="button" class="tb" data-scope-btn="all" aria-pressed="false" onclick="showAllScope()" title="すべてのアプリを表示します">全体</button>
          </div>
          <div class="menu-note">アプリをダブルクリックすると、そのアプリのまわりを表示します。</div>
          <div class="menu-heading">配置</div>
          <div class="seg" role="group" aria-label="アプリの並べ方">
            ${LAYOUT_BUTTONS.map(([name, label, title]) => `<button type="button" class="tb" data-layout-btn="${name}" aria-pressed="false" onclick="setLayout('${name}')" title="${esc(title)}">${esc(label)}</button>`).join('\n            ')}
          </div>
          <button type="button" class="tb tb-check active" id="separate-nolink-btn" aria-pressed="true" onclick="toggleSeparateNoLink()" title="関連線のないアプリを、図の下にまとめて置きます">関連のないアプリを下にまとめる</button>
          <div class="menu-heading">カードの項目</div>
          <div class="settings-row">
            <select id="density-select" class="tb-select" onchange="setDensity(this.value)" aria-label="カードに出す項目の量" title="カードに出す項目の量">
              <option value="none">結合のみ（アプリ名だけ）</option>
              <option value="compact">コンパクト（結合に使う項目）</option>
              <option value="standard">標準（結合と必須の項目）</option>
              <option value="full">詳細（すべての項目）</option>
            </select>
          </div>
          <button type="button" class="tb tb-check" id="simple-mode-btn" aria-pressed="false" onclick="toggleSimpleMode()" title="項目を隠して、アプリのつながりだけを表示します">シンプル（項目を隠す）</button>
        </div>
        <div class="settings-group">
          <div class="menu-heading">関連線</div>
          <button type="button" class="tb tb-check active" id="rel-lookup-btn" aria-pressed="true" onclick="toggleRelationKind('LOOKUP')">ルックアップ（実線）</button>
          <button type="button" class="tb tb-check active" id="rel-ref-btn" aria-pressed="true" onclick="toggleRelationKind('REF')">関連レコード一覧（破線）</button>
          <button type="button" class="tb tb-check active" id="rel-action-btn" aria-pressed="true" onclick="toggleRelationKind('ACTION')">アプリアクション（点線）</button>
          <button type="button" class="tb tb-check active" id="bundle-btn" aria-pressed="true" onclick="toggleEdgeBundling()" title="同じアプリの組・同じ種類の線を 1 本にまとめ、本数を太さと吹き出しで示します">同じアプリ間の線をまとめる</button>
          <button type="button" class="tb tb-check" id="rel-label-btn" aria-pressed="false" onclick="toggleRelationLabels()" title="オフのときは、選んだ線・マウスを乗せた線・選んだアプリの線にだけラベルを出します">線のラベルを常に表示</button>
          <div class="menu-heading">選んだアプリの強調</div>
          <button type="button" class="tb tb-check active" id="focus-toggle-btn" aria-pressed="true" onclick="toggleFocusMode()" title="アプリを選ぶと、つながるアプリと線を強調します (Shift+F)">関連を強調する</button>
          <div class="settings-row">
            <select id="focus-depth" class="tb-select" onchange="updateFocusOptions()" aria-label="強調する深さ">
              <option value="1">深さ 1</option>
              <option value="2">深さ 2</option>
              <option value="3">深さ 3</option>
            </select>
            <select id="focus-direction" class="tb-select" onchange="updateFocusOptions()" aria-label="強調する向き">
              <option value="both">両方向</option>
              <option value="out">参照している側</option>
              <option value="in">参照されている側</option>
            </select>
          </div>
          <button type="button" class="tb" onclick="clearFocus();closeAllMenus()">強調を解除</button>
          <div class="menu-heading">補助</div>
          <button type="button" class="tb tb-check" id="pathfinder-btn" aria-pressed="false" onclick="togglePathFinder()" title="2 つのアプリをつなぐ関連の道筋を探します">経路探索</button>
          <button type="button" class="tb tb-check" id="minimap-btn" aria-pressed="false" onclick="toggleMinimap()">ミニマップ</button>
          <button type="button" class="tb tb-check" id="fs-btn" aria-pressed="false" onclick="toggleFullscreen()">フルスクリーン (F11)</button>
        </div>
        <div class="settings-pills"><span class="meta-pill" id="layout-pill"><b>配置</b> ${esc(ctx.layoutLabel)}</span><span class="meta-pill" id="density-pill"><b>密度</b> ${esc(ctx.densityLabel)}</span></div>
      </div>
    </div>
    <div class="tb-menu" id="edit-menu">
      <button type="button" class="tb tb-menu-btn" onclick="toggleMenu('edit-menu')" aria-haspopup="true" aria-expanded="false" title="図にだけ追加・編集します（kintone は変わりません）">編集</button>
      <div class="tb-menu-panel" role="group" aria-label="編集">
        <div class="menu-note">図にだけ反映します。kintone のアプリや設定は変わりません。残すには「出力 → 編集済みHTMLを保存」。</div>
        <button type="button" class="tb" onclick="undoLast()">元に戻す (Ctrl+Z)</button>
        <div class="menu-heading">追加</div>
        <button type="button" class="tb" onclick="openAddApp()">アプリを追加</button>
        <button type="button" class="tb" onclick="openAddField()">アプリに項目を追加</button>
        <button type="button" class="tb" onclick="openAddRelation()">関連線を追加</button>
        <button type="button" class="tb" onclick="openAddNote()">メモ（付箋）を追加</button>
        <div class="menu-heading">選んだアプリ・線</div>
        <button type="button" class="tb" onclick="openEditApp()">アプリを編集（名前・枠の色）</button>
        <button type="button" class="tb" onclick="togglePinFromSelection()">固定 / 固定を解除 (Shift+P)</button>
        <button type="button" class="tb" onclick="removeSelectedRelations()">選んだ関連線を図から削除 (Delete)</button>
        <button type="button" class="tb" onclick="removeSelectedApps()">選んだアプリを図から削除 (Delete)</button>
        <div class="menu-heading">そろえる・色分け</div>
        <button type="button" class="tb" onclick="alignSelected('x')">左にそろえる</button>
        <button type="button" class="tb" onclick="alignSelected('y')">上にそろえる</button>
        <button type="button" class="tb" onclick="distributeSelected('x')">横に等間隔で並べる</button>
        <button type="button" class="tb" onclick="distributeSelected('y')">縦に等間隔で並べる</button>
        <button type="button" class="tb" onclick="autoColorByDepth()">探索の深さごとに枠を色分け</button>
        <button type="button" class="tb" onclick="clearNodeColors()">枠の色分けを解除</button>
        <div class="menu-heading">戻す</div>
        <button type="button" class="tb" onclick="restoreRemovedRelations()">削除した関連線を戻す</button>
        <button type="button" class="tb" onclick="restoreRemovedApps()">削除したアプリを戻す</button>
        <button type="button" class="tb" onclick="restoreAllHiddenFields()">隠した項目をすべて戻す</button>
        <button type="button" class="tb" onclick="clearPins()">固定をすべて解除</button>
        <div class="menu-heading">取り込む</div>
        <button type="button" class="tb" onclick="openEditImport()" title="以前に保存した編集済みHTMLの、手動の追加・名前と色・位置・メモ・削除をこの図へ取り込みます">編集済みHTMLから取り込む</button>
        <input type="file" id="edit-import-file" accept=".html,.htm,text/html" hidden aria-label="取り込む編集済みHTML">
      </div>
    </div>
    <div class="tb-menu" id="export-menu">
      <button type="button" class="tb tb-menu-btn" onclick="toggleMenu('export-menu')" aria-haspopup="true" aria-expanded="false">出力</button>
      <div class="tb-menu-panel" role="group" aria-label="出力">
        <button type="button" class="tb" onclick="printDiagram()">印刷（見出し・図・一覧の資料）</button>
        <button type="button" class="tb" onclick="exportEditedHtml()">編集済みHTMLを保存</button>
        <button type="button" class="tb" onclick="exportPNG()">PNG 画像（白背景・表示中の範囲）</button>
        <div class="menu-heading">表・仕様書</div>
        <button type="button" class="tb" onclick="showMarkdown()">Markdown 仕様書</button>
        <button type="button" class="tb" onclick="showCSVApps()">CSV（アプリ一覧）</button>
        <button type="button" class="tb" onclick="showCSVFields()">CSV（フィールド）</button>
        <button type="button" class="tb" onclick="showCSVRelations()">CSV（関連）</button>
        <button type="button" class="tb" onclick="showJSON()">ERモデル JSON</button>
        <div class="menu-heading">ほかの作図ツール</div>
        <button type="button" class="tb" onclick="showMermaid()">Mermaid</button>
        <button type="button" class="tb" onclick="showDrawio()">draw.io XML</button>
        <button type="button" class="tb" onclick="showPlantUML()">PlantUML</button>
        <button type="button" class="tb" onclick="showSQL()">SQL DDL</button>
        <hr>
        <button type="button" class="tb" onclick="copyShareUrl()">表示状態のURLをコピー</button>
      </div>
    </div>
    <button type="button" class="tb tb-icon" id="theme-btn" onclick="toggleTheme()" title="配色を切り替える（保存しません）" aria-label="暗い配色に切り替える" aria-pressed="false">◐</button>
    <button type="button" class="tb tb-icon" id="help-btn" onclick="openHelp()" title="使い方とショートカット (?)" aria-label="ヘルプを開く">?</button>
  </div>
</header>

<div id="app-shell">
  <aside id="sidebar" aria-label="アプリ一覧">
    <div class="sidebar-head"><h2>アプリ<span class="count" id="sidebar-count">${ctx.appCount}</span></h2><button type="button" class="tb tb-icon tb-quiet" id="sidebar-close" onclick="closeSidebar()" aria-label="アプリ一覧を閉じる">✕</button></div>
    <div class="sidebar-scroll">
      <section class="sidebar-checks" aria-label="構造チェック">
        <strong>構造チェック</strong>
        <div class="check-facts" id="sidebar-check-facts"></div>
        <button type="button" class="tb" id="analysis-toggle-btn" onclick="toggleAnalysisPanel()" aria-controls="analysis-panel" aria-expanded="false" title="取得状態・循環候補・自己参照・関連のないアプリ・未取得の参照先">構造チェックを開く</button>
      </section>
      <div class="sidebar-filter-row">
        <select id="app-list-filter" class="tb-select" onchange="refreshAppList()" aria-label="アプリ一覧の絞り込み">
          <option value="">すべてのアプリ</option>
          <option value="scope">図に表示中のアプリ</option>
          <option value="start">起点のアプリ</option>
          <option value="attention">取得に注意が必要なアプリ</option>
          <option value="nolink">関連のないアプリ</option>
        </select>
      </div>
      <div id="app-list" role="list" aria-label="アプリ"></div>
      <details class="sidebar-more"><summary>集計</summary><div id="stats-summary"></div></details>
      <details class="sidebar-more"><summary>項目の種類で強調</summary><div id="type-filters"></div></details>
    </div>
  </aside>
  <div class="backdrop" id="sidebar-backdrop" onclick="closeSidebar()"></div>

  <main id="main">
    <section id="view-diagram" class="view-panel" role="tabpanel" aria-labelledby="tab-diagram">
      <div id="cy" role="img" aria-label="アプリ間の関連図。アプリ一覧・関連一覧のタブで同じ内容を表で読めます"></div>
      <div id="scope-bar" role="group" aria-label="図の表示範囲"></div>
      <div id="legend" aria-label="凡例">
        <button type="button" class="legend-toggle-btn" id="legend-toggle-btn" onclick="toggleLegend()" aria-expanded="false" aria-controls="legend-items">凡例</button>
        <div class="legend-items" id="legend-items">
          <button type="button" class="legend-toggle" id="legend-lookup-edge" aria-pressed="true" onclick="toggleRelationKind('LOOKUP')" title="ルックアップの線を表示 / 非表示"><i class="legend-line" style="border-top-style:solid;border-top-color:var(--lookup)"></i>ルックアップ</button>
          <button type="button" class="legend-toggle" id="legend-ref-edge" aria-pressed="true" onclick="toggleRelationKind('REF')" title="関連レコード一覧の線を表示 / 非表示"><i class="legend-line" style="border-top-style:dashed;border-top-color:var(--ref)"></i>関連レコード一覧</button>
          <button type="button" class="legend-toggle" id="legend-action-edge" aria-pressed="true" onclick="toggleRelationKind('ACTION')" title="アプリアクションの線を表示 / 非表示"><i class="legend-line" style="border-top-style:dotted;border-top-width:3px;border-top-color:var(--action)"></i>アクション</button>
          <span class="legend-sep" aria-hidden="true"></span>
          <span title="レコード番号"><b style="color:var(--pk)">PK</b></span>
          <span title="ルックアップ項目"><b style="color:var(--lookup)">FK</b></span>
          <span title="関連レコード一覧"><b style="color:var(--ref)">関連</b></span>
          <span title="値の重複禁止"><b style="color:var(--accent2)">一意</b></span>
          <span title="必須項目"><b style="color:var(--req)">必須</b></span>
          ${a.counts.retrievalPartial ? '<span><i class="legend-box" style="border:2px dashed var(--action)"></i>△ 一部取得</span>' : ''}
          ${a.counts.retrievalFailed ? '<span><i class="legend-box" style="border:2px solid var(--req)"></i>⚠ 取得失敗</span>' : ''}
          ${a.unresolved ? '<span><i class="legend-box" style="border:2px dashed var(--dim)"></i>？ 未取得の参照先</span>' : ''}
        </div>
      </div>
      <div id="zoom-ctrl" role="group" aria-label="表示倍率">
        <button type="button" onclick="zoomIn()" title="拡大 (+)" aria-label="拡大">＋</button>
        <button type="button" id="zoom-level" onclick="toggleZoomPresets()" title="倍率を選ぶ" aria-label="現在の表示倍率。倍率プリセットを開く" aria-haspopup="true" aria-expanded="false"><span id="zoom-value" aria-live="polite">100%</span><span id="zoom-mode"></span></button>
        <button type="button" onclick="zoomOut()" title="縮小 (-)" aria-label="縮小">－</button>
        <button type="button" onclick="zoomReset()" title="100%にリセット (0)" aria-label="表示倍率を100%にリセット">◎</button>
        <button type="button" onclick="fit()" title="画面に合わせる (Ctrl+0)" aria-label="図を画面に合わせる">⤢</button>
        <div id="zoom-presets" role="group" aria-label="倍率プリセット">
          ${[50, 75, 100, 125, 150, 200].map((p) => `<button type="button" class="zoom-preset" data-zoom="${p}" aria-pressed="${p === 100}" onclick="setZoomPercent(${p})">${p}%</button>`).join('\n          ')}
        </div>
      </div>
      <div id="minimap" aria-hidden="true"><canvas id="minimap-canvas"></canvas></div>
      <div id="pathfinder" role="group" aria-label="経路探索">
        <span>経路:</span>
        <select id="pf-from" class="tb-select" aria-label="経路の起点アプリ"></select>
        <span aria-hidden="true">→</span>
        <select id="pf-to" class="tb-select" aria-label="経路の終点アプリ"></select>
        <button type="button" class="tb tb-primary" onclick="findPath()">探す</button>
        <button type="button" class="tb" onclick="clearPath()">消す</button>
        <button type="button" class="tb tb-icon tb-quiet" onclick="togglePathFinder()" aria-label="経路探索を閉じる">✕</button>
        <span id="path-result" aria-live="polite"></span>
      </div>
    </section>

    <section id="view-apps" class="view-panel table-view" role="tabpanel" aria-labelledby="tab-apps" hidden>
      <div class="table-head">
        <div><h2>アプリ一覧</h2><p>図にあるアプリの取得状態と、参照する・される関連の数です。見出しを押すと並べ替え、アプリ名を押すと図のそのアプリへ移ります。</p></div>
      </div>
      <div class="check-chips" id="apps-checks" role="group" aria-label="構造チェックで絞り込む"></div>
      <div class="table-toolbar">
        <label class="sr-only" for="apps-status">表示するアプリ</label>
        <select id="apps-status" class="tb-select" onchange="setAppsStatus(this.value)">
          <option value="">すべてのアプリ</option>
          <option value="scope">図に表示中のアプリ</option>
          <option value="start">起点のアプリ</option>
          <option value="custom">手動で追加したアプリ</option>
          <option value="removed">図から削除したアプリ</option>
        </select>
        <span class="table-count" id="apps-count" aria-live="polite"></span>
      </div>
      <div class="table-wrap" id="apps-table"></div>
    </section>

    <section id="view-relations" class="view-panel table-view" role="tabpanel" aria-labelledby="tab-relations" hidden>
      <div class="table-head">
        <div><h2>関連一覧</h2><p>どのアプリがどのアプリを、どの項目で参照しているかの一覧です。「図で見る」で図のその線へ移ります。</p></div>
      </div>
      <div class="check-chips" id="relations-kinds" role="group" aria-label="関連の種類で絞り込む"></div>
      <div class="table-toolbar">
        <label class="sr-only" for="relations-state">表示する関連</label>
        <select id="relations-state" class="tb-select" onchange="setRelationsState(this.value)">
          <option value="">すべての関連</option>
          <option value="unresolved">参照先が未取得の関連</option>
          <option value="self">自己参照</option>
          <option value="filtered">絞り込み条件のある関連</option>
          <option value="custom">手動で追加した関連</option>
          <option value="removed">図から削除した関連</option>
        </select>
        <span class="table-count" id="relations-count" aria-live="polite"></span>
      </div>
      <div class="table-wrap" id="relations-table"></div>
    </section>
  </main>

  <aside id="detail" class="side-panel" aria-label="選んだアプリ・関連の詳細">
    <button type="button" class="close-btn" onclick="closeDetail()" aria-label="詳細を閉じる">✕</button>
    <h2 id="detail-title"></h2>
    <div id="detail-meta"></div>
    <div id="detail-relations"></div>
    <div id="detail-fields"></div>
  </aside>

  <aside id="analysis-panel" class="side-panel" aria-label="構造チェック">
    <button type="button" class="close-btn" onclick="toggleAnalysisPanel(false)" aria-label="構造チェックを閉じる">✕</button>
    <div class="analysis-head">
      <h2>🩺 構造チェック</h2>
      <p>取得状態、循環候補、自己参照、関連のないアプリなどの事実を示します。項目を押すと図のそのアプリへ移ります。</p>
    </div>
    <div class="analysis-facts" id="analysis-facts" aria-label="取得状態の件数">
      <div class="analysis-fact"><strong>${a.counts.retrievalComplete}</strong><span>取得完了</span></div>
      <div class="analysis-fact"><strong>${a.counts.retrievalPartial}</strong><span>一部取得</span></div>
      <div class="analysis-fact"><strong>${a.counts.retrievalFailed}</strong><span>取得失敗</span></div>
    </div>
    <div id="analysis-content"></div>
    <div class="analysis-note">ここでは良否を判定しません。「接続数が多い」は入出力の関連が ${a.highConnectionThreshold} 件以上のアプリを機械的に並べています。</div>
  </aside>

  <div id="overview" class="collapsed" role="dialog" aria-label="取得・関連サマリー">
    <div class="ov-head">
      <div>
        <div class="ov-title">取得・関連サマリー</div>
        <div class="ov-sub">取得できた設定と関連の事実です。良否は判定しません。数を押すと該当箇所を確認できます。</div>
      </div>
      <button type="button" class="ov-close" onclick="hideOverview()" title="サマリーを閉じる" aria-label="サマリーを閉じる">✕</button>
    </div>
    <div class="ov-grid">
      <button type="button" class="ov-card ov-card--action${attention ? ' ov-card--warn' : ''}" onclick="hideOverview();toggleAnalysisPanel(true)"><span class="ov-kpi">${attention}</span><span class="ov-label">取得に注意が必要</span></button>
      <button type="button" class="ov-card ov-card--action${a.cycles ? ' ov-card--risk' : ''}" onclick="hideOverview();toggleAnalysisPanel(true)"><span class="ov-kpi">${a.cycles}</span><span class="ov-label">循環グループ</span></button>
      <button type="button" class="ov-card ov-card--action${a.isolated ? ' ov-card--warn' : ''}" onclick="hideOverview();toggleAnalysisPanel(true)"><span class="ov-kpi">${a.isolated}</span><span class="ov-label">孤立アプリ</span></button>
      <button type="button" class="ov-card ov-card--action" onclick="hideOverview();toggleAnalysisPanel(true)"><span class="ov-kpi">${a.selfReferences}</span><span class="ov-label">自己参照</span></button>
      <button type="button" class="ov-card ov-card--action${a.unresolved ? ' ov-card--warn' : ''}" onclick="hideOverview();showRelationsTable('unresolved')"><span class="ov-kpi">${a.unresolved}</span><span class="ov-label">未取得の参照先</span></button>
      <button type="button" class="ov-card ov-card--action" onclick="hideOverview();showRelationsTable('')"><span class="ov-kpi">${ctx.summary.relations}</span><span class="ov-label">総関連</span></button>
    </div>
    <dl class="ov-conditions">
      ${ctx.conditions.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('\n      ')}
      <dt>関連の内訳</dt><dd>ルックアップ ${ctx.summary.lookups} / 関連レコード一覧 ${ctx.summary.refs} / アプリアクション ${ctx.summary.actions} / 必須項目 ${ctx.summary.required}</dd>
    </dl>
  </div>
</div>

<!-- Command Palette -->
<div id="cmd-overlay" class="overlay" onclick="if(event.target===this)closeCmd()">
  <div id="cmd-box" role="dialog" aria-modal="true" aria-label="コマンドパレット">
    <input id="cmd-input" placeholder="操作やアプリの名前を入力（表示・配置・出力・アプリ名…）" aria-label="操作やアプリを探す" oninput="filterCmd(this.value)">
    <div id="cmd-results"></div>
  </div>
</div>

<!-- Modal -->
<div id="modal-overlay" class="overlay" onclick="if(event.target===this)closeModal()">
  <div id="modal" class="dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title"></h2><pre id="modal-content"></pre>
    <div class="actions">
      <button type="button" class="primary" onclick="copyModal()">コピー</button>
      <button type="button" onclick="downloadModal()">ファイルに保存</button>
      <button type="button" onclick="closeModal()">閉じる</button>
    </div>
  </div>
</div>

<!-- Manual add editor -->
<div id="editor-overlay" class="overlay" onclick="if(event.target===this)closeEditor()">
  <div id="editor" class="dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
    <h2 id="editor-title"></h2>
    <div id="editor-sub"></div>
    <div id="editor-body"></div>
    <div class="actions">
      <button type="button" class="danger" id="editor-delete" style="display:none" onclick="deleteFromEditor()">削除</button>
      <button type="button" class="primary" id="editor-submit" onclick="submitEditor()">追加</button>
      <button type="button" onclick="closeEditor()">キャンセル</button>
    </div>
  </div>
</div>

<!-- Help / Shortcut modal -->
<div id="help-overlay" class="overlay" onclick="if(event.target===this)closeHelp()">
  <div id="help-box" class="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <h2 id="help-title">使い方とショートカット</h2>
    <div class="help-sub">上の「図・アプリ一覧・関連一覧」で表示を切り替えます。アプリが多い図は、起点とその関連先だけを表示して開きます（「全体を表示」でいつでも全体へ）。アプリを押すと右に詳細、線を押すと関連の詳細が出ます。kintone には何も書き込みません。</div>
    <div class="help-grid">
      <div class="help-section">
        <h3>表示</h3>
        <div class="help-row"><span>図 / アプリ一覧 / 関連一覧</span><kbd>Alt + 1 / 2 / 3</kbd></div>
        <div class="help-row"><span>アプリ・項目を検索</span><kbd>Ctrl/⌘ + F</kbd></div>
        <div class="help-row"><span>検索に一致したアプリへ順に移る</span><kbd>検索欄で Enter</kbd></div>
        <div class="help-row"><span>そのアプリのまわりだけを表示</span><kbd>アプリをダブルクリック</kbd></div>
        <div class="help-row"><span>画面に合わせる</span><kbd>Ctrl/⌘ + 0</kbd></div>
        <div class="help-row"><span>拡大 / 縮小 / 100%</span><kbd>+ / - / 0</kbd></div>
        <div class="help-row"><span>アプリ一覧（左）を開閉</span><kbd>Ctrl/⌘ + B</kbd></div>
        <div class="help-row"><span>コマンドパレット</span><kbd>Ctrl/⌘ + K</kbd></div>
        <div class="help-row"><span>印刷（資料として）</span><kbd>Ctrl/⌘ + P</kbd></div>
        <div class="help-row"><span>ヘルプを開く</span><kbd>?</kbd></div>
        <div class="help-row"><span>閉じる / 強調を解除</span><kbd>Esc</kbd></div>
      </div>
      <div class="help-section">
        <h3>編集（図にだけ反映）</h3>
        <div class="help-row"><span>元に戻す</span><kbd>Ctrl/⌘ + Z</kbd></div>
        <div class="help-row"><span>選んだアプリ・線を図から削除</span><kbd>Delete</kbd></div>
        <div class="help-row"><span>複数のアプリを選ぶ</span><kbd>Shift + ドラッグ / クリック</kbd></div>
        <div class="help-row"><span>関連の強調 ON / OFF</span><kbd>Shift + F</kbd></div>
        <div class="help-row"><span>固定 / 固定を解除</span><kbd>Shift + P・右クリック</kbd></div>
        <div class="help-row"><span>名前・項目・線の編集</span><kbd>詳細の ✎</kbd></div>
        <div class="help-row"><span>項目を隠す・線を削除</span><kbd>詳細の ✕</kbd></div>
        <div class="help-row"><span>メモ（付箋）の編集</span><kbd>メモを押す</kbd></div>
        <div class="help-row"><span>その位置にアプリを追加</span><kbd>背景をダブルクリック</kbd></div>
        <div class="help-row"><span>アプリを図から削除</span><kbd>Alt + 右クリック</kbd></div>
        <div class="help-row"><span>線を図から削除</span><kbd>線を右クリック</kbd></div>
      </div>
    </div>
    <div class="close-row actions"><button type="button" onclick="closeHelp()">閉じる</button><button type="button" onclick="closeHelp();openCmd()">コマンドパレットを開く</button></div>
  </div>
</div>

<div id="toast" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="print-doc"></div>

<script id="er-main" type="text/plain">
${ctx.mainScript}
<\/script>
<script>
(function(){
  const source=document.getElementById("er-main");
  // 描画ライブラリは head にインラインで同梱している。ブラウザの制限などで初期化できなかったときだけ、取得済みのアプリ一覧を表で示す。
  if(typeof window.cytoscape==="function"){
    const runtime=document.createElement("script");
    runtime.id="er-runtime";
    runtime.textContent=source.textContent||"";
    source.after(runtime);
    return;
  }
  const host=document.getElementById("cy");
  // 図の領域を body の直下へ移してから、操作バー・凡例・ズーム操作などの画面部品をすべて隠す（hidden 属性は CSS の display に負けるため使わない）。
  document.body.appendChild(host);
  Array.prototype.forEach.call(document.body.children,function(el){ if(el!==host&&el.tagName!=="SCRIPT") el.style.display="none"; });
  host.style.cssText="position:fixed;inset:0;overflow:auto;padding:32px;background:#f8fafc;color:#0f172a;font:14px/1.65 sans-serif";
  host.innerHTML='<style>#cy table{width:100%;border-collapse:collapse}#cy th,#cy td{padding:6px 10px;text-align:left;vertical-align:top;border-bottom:1px solid #cbd5e1}#cy th,#cy td:not(:nth-child(2)){white-space:nowrap}#cy td:nth-child(2){overflow-wrap:anywhere}</style><main style="max-width:960px;margin:auto"><h1 style="font-size:22px;margin-bottom:8px">ER図を描画できませんでした</h1><p>描画ライブラリを初期化できませんでした。ブラウザを再読み込みするか、別のブラウザで開いてください。取得済みのアプリ一覧は下表で確認できます。</p><table style="margin-top:20px"><thead><tr><th>アプリID</th><th>アプリ名</th><th>項目数</th><th>関連数</th><th>取得状態</th></tr></thead><tbody>'+${ctx.fallbackRowsJson}+'</tbody></table></main>';
})();
<\/script>
</body>
</html>`;
}
