import { describe, expect, it } from 'vitest';
import { Script, createContext, runInContext } from 'node:vm';
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
  it('uses ASCII Mermaid attribute names and keeps the real code in exports', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    const helper = script.match(/const mermaidAttributeName=[\s\S]*?\r?\n};/);
    expect(helper).not.toBeNull();
    const context = createContext({});
    runInContext(`${helper![0]}; globalThis.result = (() => { const used = new Set(); return [mermaidAttributeName('案件番号', used), mermaidAttributeName('amount', used), mermaidAttributeName('amount', used), mermaidAttributeName('文字列__1行_', used)]; })();`, context);
    expect(Array.from((context as any).result)).toEqual(['field_1', 'amount', 'amount_2', 'field_4']);
    expect(script).toContain('const baseCol=oneLineLabel(f.code)||"unnamed";');
    expect(script).not.toMatch(/const sn=/);
  });

  it('names every export after the start app, environment and time', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    expect(script).toContain('function exportFilename(base,ext){');
    expect(script).not.toMatch(/"(?:ER図|ERモデル)[^"]*\.(?:mmd|drawio|sql|puml|json|csv|md)"/);
    expect(script).not.toContain('kintone_erd');
  });

  it('renders image exports on a white background with context', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    expect(script).toContain('return cy.png({bg:"#ffffff",full:true,scale:Math.min(2,maxSide/Math.max(box.w,box.h,1))/(window.devicePixelRatio||1)});');
    expect(script).toContain('const url=URL.createObjectURL(dataUrlToBlob(data));');
    expect(script).toContain('await waitForCardImages();');
    expect(script).toContain('buildExportImage(6000).then(data=>{');
  });

  it('draws app cards as valid SVG even when names contain markup characters', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    const helper = script.match(/function cardXml\(text\)\{[\s\S]*?\r?\n\}/);
    expect(helper).not.toBeNull();
    const context = createContext({});
    runInContext(`${helper![0]}; globalThis.result = cardXml('活動 & "メモ" <重要>\u0007');`, context);
    expect((context as any).result).toBe('活動 &amp; &quot;メモ&quot; &lt;重要&gt;');
    expect(script).toContain('"background-image":"data(cardImage)"');
    expect(script).toContain('"background-image":"data(lowImage)"');
  });

  it('keeps relation colors while focusing and exports without on-screen emphasis', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    expect(script).toContain('{selector:"edge.focus-edge",style:{"width":2.6,"z-index":998}}');
    expect(script).toContain('cy.elements().removeClass(EXPORT_CLEARED_CLASSES.join(" "));');
    expect(script).toContain('emphasis.forEach(([name,elements])=>elements.addClass(name));');
  });

  it('embeds the Mermaid diagram into the Markdown spec within the size limit', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    expect(script).toContain('const ER_MD_MERMAID_MAX_CHARS=40000;');
    expect(script).toContain('if(mermaidText.length<=ER_MD_MERMAID_MAX_CHARS) lines.push(fence+"mermaid",mermaidText.trimEnd(),fence);');
  });

  it('omits the start marker when every app is a start app', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    expect(script).toContain('return ids.includes(String(app.id))&&new Set(ids).size<APPS.length;');
  });

  it('wraps oversized hierarchy ranks only for the dagre layout', () => {
    const script = extractViewerScript(buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' }));
    expect(script).toContain('function wrapTallRanks(nodes, animate){');
    expect(script).toContain('if(box.h <= maxHeight * 1.25) return false;');
    expect(script).toContain('function wrapWideRanks(nodes){');
    expect(script).toContain('wrapTargets.length > 1 && wrapRanks(wrapTargets, !initial);');
    expect(script).toContain('name === "dagre" && ER_DAGRE_READY');
  });

  it('shows the key facts while the summary card is collapsed', () => {
    const html = buildHTML(baseApps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard' });
    expect(html).toContain('id="overview-pill"');
    expect(html).toMatch(/2アプリ · 2関連/);
  });

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

  it('keeps the bootstrap script valid for app names with backslashes and quotes', () => {
    const html = buildHTML([{ ...baseApps[0], name: "C:\\users\\xdata\\u00 it's" }], {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const bootstrap = html.match(/<script>\r?\n\(function\(\)\{([\s\S]*?)\}\)\(\);\r?\n<\/script>/);
    if (!bootstrap) throw new Error('ER bootstrap script was not found');
    expect(() => new Script(`(function(){${bootstrap[1]}})`, { filename: 'er-bootstrap.js' })).not.toThrow();
    expect(bootstrap[1]).toContain('C:\\\\users\\\\xdata\\\\u00 it&#39;s');
  });

  describe('CDN fallback loading', () => {
    const html = buildHTML(baseApps, {
      startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
    });
    const bootstrap = html.match(/<script>\r?\n(\(function\(\)\{[\s\S]*?\}\)\(\);)\r?\n<\/script>/)?.[1] ?? '';

    /** 読み込み結果を src ごとに指定して起動スクリプトを実行する。 */
    function runBootstrap(initial: Record<string, unknown>, loads: Record<string, string | null>) {
      const requested: Array<{ src: string; integrity: string; crossOrigin: string }> = [];
      const runtime: string[] = [];
      const host: { innerHTML: string; style: Record<string, string> } = { innerHTML: '', style: {} };
      const context: any = {
        document: {
          getElementById: (id: string) => {
            if (id === 'er-main') return { textContent: 'VIEWER_SOURCE', after: (el: any) => runtime.push(el.textContent) };
            if (id === 'cy') return host;
            return { setAttribute: () => undefined };
          },
          createElement: () => ({ setAttribute: () => undefined }),
          head: {
            appendChild: (el: any) => {
              requested.push({ src: el.src, integrity: el.integrity, crossOrigin: el.crossOrigin });
              // 実ブラウザ同様、読み込み完了は非同期に通知する
              setTimeout(() => {
                const global = loads[el.src];
                if (global) { context.window[global] = () => undefined; el.onload?.(); } else el.onerror?.();
              }, 0);
            }
          }
        }
      };
      context.window = context;
      Object.assign(context, initial);
      createContext(context);
      runInContext(bootstrap, context);
      return { requested, runtime, host };
    }
    /** 起動スクリプトが図の起動か案内表示のどちらかへ到達するまで待つ（CPU負荷でタイマーが遅れても安定させる）。 */
    async function settled(result: ReturnType<typeof runBootstrap>) {
      for (let i = 0; i < 400 && !result.runtime.length && !result.host.innerHTML; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    it('loads the alternate CDN through new script elements when the primary scripts failed', async () => {
      const result = runBootstrap({}, {
        'https://cdn.jsdelivr.net/npm/cytoscape@3.26.0/dist/cytoscape.min.js': 'cytoscape',
        'https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.js': 'cytoscapeDagre'
      });
      await settled(result);
      expect(result.requested.map((r) => r.src)).toEqual([
        'https://cdn.jsdelivr.net/npm/cytoscape@3.26.0/dist/cytoscape.min.js',
        'https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.js'
      ]);
      expect(result.requested.every((r) => /^sha384-/.test(r.integrity) && r.crossOrigin === 'anonymous')).toBe(true);
      expect(result.runtime).toEqual(['VIEWER_SOURCE']);
      expect(result.host.innerHTML).toBe('');
    });

    it('marks alternate libraries so edited-HTML export does not freeze them into the saved page', () => {
      const viewer = extractViewerScript(html);
      expect(bootstrap).toContain('script.setAttribute("data-er-fallback-lib","1")');
      expect(viewer).toContain('clone.querySelectorAll("script[data-er-fallback-lib]")');
    });

    it('does not reload libraries that the primary scripts already provided', async () => {
      const result = runBootstrap({ cytoscape: () => undefined, cytoscapeDagre: () => undefined }, {});
      await settled(result);
      expect(result.requested).toEqual([]);
      expect(result.runtime).toEqual(['VIEWER_SOURCE']);
    });

    it('only retries the missing layout plugin and keeps the viewer when it still fails', async () => {
      const result = runBootstrap({ cytoscape: () => undefined }, {});
      await settled(result);
      expect(result.requested.map((r) => r.src)).toEqual(['https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.js']);
      expect(result.runtime).toEqual(['VIEWER_SOURCE']);
    });

    it('shows the app table only after every alternate failed', async () => {
      const result = runBootstrap({}, {});
      expect(result.host.innerHTML).toBe('');
      await settled(result);
      expect(result.requested).toHaveLength(2);
      expect(result.runtime).toEqual([]);
      expect(result.host.innerHTML).toContain('ER図ライブラリを読み込めませんでした');
      expect(result.host.innerHTML).toContain('<td>物件</td>');
    });
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
    expect(script).toContain('Math.min(MAX_FIT_ZOOM,availW/Math.max(box.w,1),availH/Math.max(box.h,1))');
    expect(script).toContain('cy.viewport({zoom,pan:');
    expect(script).toContain('cy.on("zoom", updateZoomLabel)');
    expect(script).toContain('function buildSemanticNodeLabel(app)');
    expect(script).toContain('const low=Number(zoom)<0.6;');
    expect(script).toContain('node.addClass("semantic-low")');
    expect(script).toContain('node.data("label",semanticZoomLabelBackup.get(node.id()))');
    expect(script).toContain('applySemanticZoom(cy.zoom());');
    expect(script).toContain('selector:"node.semantic-low"');
    expect(script).toContain('"font-size":"18px"');
    expect(script).toContain('selector:"edge.semantic-low"');
    expect(script).toContain('mode.textContent=cy.zoom()<0.35?"構造":(cy.zoom()<0.6?"概要":"")');
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
    expect(html).toMatch(/@media \(max-width: 900px\)\{[\s\S]*?#mobile-menu-btn\{display:inline-flex;\}[\s\S]*?#topbar > \.tb-menu\[data-mobile="hide"\]/);
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
    expect(script).toContain('function recomputeErAnalysis()');
    expect(html).not.toContain('fonts.googleapis.com');
  });
});
