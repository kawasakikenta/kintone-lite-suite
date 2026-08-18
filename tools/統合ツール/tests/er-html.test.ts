import { describe, expect, it } from 'vitest';
import { Script } from 'node:vm';
import { buildHTML } from '../src/tabs/er.js';

function extractViewerScript(html: string): string {
  const match = html.match(/<script id="er-main" type="text\/plain">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('ER viewer script was not found');
  return match[1];
}

function extractEmbeddedApps(html: string): any[] {
  const script = extractViewerScript(html);
  const match = script.match(/const APPS = ([\s\S]*?);\r?\nconst ER_OPTIONS =/);
  if (!match) throw new Error('Embedded ER apps were not found');
  return JSON.parse(match[1]);
}

const baseApps = [
  {
    id: 1,
    name: '物件',
    ok: true,
    status: 'complete',
    fields: [{ code: 'required_id', label: '物件ID', type: 'SINGLE_LINE_TEXT', required: true }],
    allFields: [
      { code: 'required_id', label: '物件ID', type: 'SINGLE_LINE_TEXT', required: true },
      { code: 'optional_note', label: '任意メモ', type: 'MULTI_LINE_TEXT', required: false }
    ],
    totalFieldCount: 2,
    requiredCount: 1,
    lookupCount: 1,
    refCount: 0,
    relations: [{ toApp: 2, kind: 'LOOKUP', from: 'required_id', fromLabel: '物件ID', toField: 'property_id' }]
  },
  {
    id: 2,
    name: '作業',
    ok: true,
    status: 'partial',
    issues: [{ scope: 'actions', code: 'actions_fetch_failed', message: 'アクション設定を取得できません' }],
    fields: [],
    allFields: [],
    totalFieldCount: 0,
    requiredCount: 0,
    lookupCount: 1,
    refCount: 0,
    relations: [{ toApp: 1, kind: 'LOOKUP', from: 'property_id' }]
  }
];

describe('ER diagram HTML', () => {
  it('embeds factual dependency checks and syntactically valid viewer code', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = extractViewerScript(html);

    expect(html).toContain('🩺 構造チェック');
    expect(html).toContain('複数アプリの循環候補');
    expect(html).toContain('取得に注意が必要');
    expect(html).toContain('const ER_ANALYSIS = {');
    expect(html).not.toContain('構造スコア');
    expect(html).not.toContain('GRADE');
    expect(html).not.toContain('${dependencyAnalysisData}');
    expect(() => new Script(script, { filename: 'er-viewer.js' })).not.toThrow();
  });

  it('keeps all acquired fields for density switching and complete exports', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = extractViewerScript(html);

    expect(html).toContain('optional_note');
    const embeddedApps = extractEmbeddedApps(html);
    expect(embeddedApps[0]).not.toHaveProperty('fields');
    expect(embeddedApps[0].allFields).toHaveLength(2);
    expect(script).toContain('function allFieldsForApp(app)');
    expect(script).toContain('const exportFieldsForApp=app=>allFieldsForApp(app)');
    expect(script).toContain('if(ER_OPTIONS.fieldDensity==="full") selected=candidates');
    expect(script).toContain('fieldTypeJpLabel(type)');
    expect(script).not.toContain('lookupEnum(FIELD_TYPE_JP');
  });

  it('uses text-only DOM construction and allowlists shared layout state', () => {
    const malicious = '<img src=x onerror="window.__erXss=1">';
    const html = buildHTML([{ ...baseApps[0], name: malicious }], {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = extractViewerScript(html);

    expect(html).not.toContain(malicious);
    expect(script).toContain('option.textContent=String(app.name');
    expect(script).toContain('label.textContent=String(command.label');
    expect(script).toContain('function normalizeLayoutName(name)');
    expect(script).toContain('const ER_DAGRE_READY =');
    expect(script).toContain('selected==="dagre"&&!ER_DAGRE_READY?"cose":selected');
    expect(script).toContain('setLayout(normalizeLayoutName(state.l))');
    expect(script).not.toContain("'<option value=\"a'+a.id+'\">'+a.name");
  });

  it('shows a readable app summary when the graph library cannot load', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });

    expect(html).toContain('ER図ライブラリを読み込めませんでした');
    expect(html).toContain('取得済みのアプリ一覧は下表で確認できます');
    expect(html).toContain('type="text/plain"');
    expect(html).toContain('typeof window.cytoscape==="function"');
    expect(html.match(/ integrity="sha384-/g)).toHaveLength(3);
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("connect-src 'none'");
  });

  it('keeps the initial graph unobstructed and exposes retrieval and inbound relation facts', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = extractViewerScript(html);

    expect(html).toContain('<div id="overview" class="collapsed">');
    expect(html).toContain('>一部取得</span>');
    expect(html).toContain('id="legend-lookup-edge" aria-pressed="true"');
    expect(html).toContain('#fab-mobile{display:flex;bottom:calc(var(--bottom-safe) + var(--pathfinder-lift) + 50px);}');
    expect(script).toContain('"△ 一部取得 "');
    expect(script).toContain('このアプリを参照している関連');
    expect(script).toContain('function renderGhostDetail(node)');
    expect(script).toContain('!isInteractiveShortcutTarget(e.target)');
    expect(script).toContain('e.target().id() + "→" + e.data("kind")');
  });

  it('offers accessible zoom presets and keeps every zoom path synchronized', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = extractViewerScript(html);

    for (const percent of [50, 75, 100, 125, 150, 200]) {
      expect(html).toContain(`class="zoom-preset" data-zoom="${percent}"`);
    }
    expect(html).toContain('id="zoom-ctrl" role="group" aria-label="表示倍率"');
    expect(html).toContain('id="zoom-level"');
    expect(html).toContain('aria-haspopup="true" aria-expanded="false"');
    expect(script).toContain('"min-zoomed-font-size":6.5');
    expect(script).toContain('"min-zoomed-font-size":7');
    expect(script).toContain('function setZoomPercent(percent)');
    expect(script).toContain('function fit(){closeZoomPresets();cy.fit(undefined,60);updateZoomLabel();}');
    expect(script).toContain('cy.on("zoom", updateZoomLabel)');
    expect(script).toContain('function buildSemanticNodeLabel(app)');
    expect(script).toContain('const low=Number(zoom)<0.7;');
    expect(script).toContain('node.addClass("semantic-low")');
    expect(script).toContain('node.data("label",semanticZoomLabelBackup.get(node.id()))');
    expect(script).toContain('applySemanticZoom(cy.zoom());');
    expect(script).toContain('selector:"node.semantic-low"');
    expect(script).toContain('"font-size":"18px"');
    expect(script).toContain('selector:"edge.semantic-low"');
    expect(script).toContain('mode.textContent=cy.zoom()<0.35?"構造":(cy.zoom()<0.7?"概要":"")');
    expect(script).toContain('"現在の表示倍率 "+percent+"%。倍率プリセットを開く"');
  });

  it('keeps responsive overlays dismissible and stacks bottom controls without collisions', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = extractViewerScript(html);

    expect(html).toContain('flex-wrap:wrap;overflow:visible;white-space:normal;');
    expect(html).toContain('id="sidebar-close" onclick="closeSidebar()"');
    expect(html).toContain('aria-controls="sidebar" aria-expanded="false"');
    expect(html).toContain('id="sidebar-fab-btn" onclick="toggleSidebar(undefined,this)"');
    expect(html).toContain('id="sidebar" role="region" aria-label="統計・フィルター" aria-hidden="true" inert');
    expect(html).toMatch(/@media \(max-width: 900px\)\{[\s\S]*?#mobile-menu-btn\{display:inline-flex;\}[\s\S]*?#topbar > \.tb-group\[data-group="layout"\]/);
    expect(html).toMatch(/@media \(max-width: 900px\)\{[\s\S]*?\.tb-menu-panel\{position:fixed;/);
    expect(html).toContain('#overview{top:calc(var(--topbar-h,52px) + 42px);}');
    expect(html).toContain('--pathfinder-lift:0px;');
    expect(html).toContain('bottom:calc(var(--bottom-safe) + var(--pathfinder-lift) + var(--legend-stack-height))');
    expect(html).toContain('.tb-menu-panel{position:fixed;left:8px;right:8px;');
    expect(html).toContain('@media (max-width:420px){');
    expect(html).toContain('#modal .actions,#editor .actions{flex-wrap:wrap;}');
    expect(html).toContain('.help-grid{grid-template-columns:minmax(0,1fr);}');
    expect(html).toContain('#zoom-ctrl > button,#zoom-level{width:42px;min-height:40px;}');
    expect(script).toContain('function closeSidebar(){toggleSidebar(false);}');
    expect(script).toContain('["sidebar-toggle-btn","sidebar-fab-btn"].forEach');
    expect(script).toContain('document.getElementById("sidebar-close")?.focus();');
    expect(script).toContain('if(restore&&document.contains(restore)) restore.focus();');
    expect(script).toContain('sidebar.setAttribute("aria-hidden",String(!open));');
    expect(script).toContain('function closeMobileMenu()');
    expect(script).toContain('setAttribute("aria-expanded",String(open))');
    expect(script).toContain('closeZoomPresets();closeSidebar();toggleAnalysisPanel(false)');
    expect(script).toContain('function syncBottomUiOffsets()');
    expect(script).toContain('const shouldStackPath=!!pathfinder?.classList.contains("open");');
    expect(script).toContain('requestAnimationFrame(syncBottomUiOffsets)');
  });

  it('neutralizes spreadsheet formula prefixes and separates ACTION exports', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const script = extractViewerScript(html);

    expect(script).toContain('/^[\\t\\r\\n ]*[=+\\-@]/');
    expect(script).toContain('%% ACTION ');
    expect(script).toContain("+' ..> '+");
    expect(script).toContain('kind:"kintone-er-model"');
    expect(script).not.toContain('$schema:"https://json-schema.org');
    expect(script).toContain('const exportStatusLabel=');
    expect(script).toContain('function exportProvenanceEntries()');
    expect(script).toContain('sourceJoinField:r.sourceJoinField||r.from||""');
    expect(script).toContain('label:r.fromDisplay||r.fromLabel||r.from||r.kind');
    expect(script).toContain('tableCode:f.tableCode||""');
    expect(script).toContain('SQLへ変換できる取得済みフィールドがないため CREATE TABLE を省略');
    expect(script).toContain('while(usedColumnNames.has(col))');
    expect(script).toContain('sqlIdentifier(sourceInfo.table)');
    expect(script).toContain('shape=tableRow');
    expect(script).toContain('未取得の参照先 (App ');
  });
});
