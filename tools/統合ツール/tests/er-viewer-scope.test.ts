import { describe, expect, it } from 'vitest';
import { createContext, runInContext } from 'node:vm';
import { buildHTML } from '../src/tabs/er.js';
import { ER_BUNDLED_LIBRARIES } from '../src/tabs/er-libraries.js';

// ER図ビューアーの表示範囲（起点まわり / 全体）・中心を真ん中に置く配置・線のまとめ・表の列を、
// 図の画面の関数を取り出して、描画しない Cytoscape（headless）の上で確かめる。
// Cytoscape は図の画面の関数と同じ実行環境（vm のコンテキスト）で動かす（別の環境で作ったオブジェクトは data() が受け付けないため）。

const html = buildHTML([{ id: 1, name: 'A', ok: true, status: 'complete', allFields: [], relations: [] }], {
  startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
});
const script = html.match(/<script id="er-main" type="text\/plain">([\s\S]*?)<\/script>/)![1];
const cytoscapeSource = ER_BUNDLED_LIBRARIES.find((lib) => lib.id === 'er-lib-cytoscape')!.source;

/** `function name(` から対応する閉じ括弧までを切り出す（文字列リテラル内の括弧は数えない）。 */
function extractFunction(name: string): string {
  const start = script.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`function ${name} was not found`);
  let depth = 0;
  let quote = '';
  for (let i = script.indexOf('{', start); i < script.length; i += 1) {
    const ch = script[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return script.slice(start, i + 1);
  }
  throw new Error(`function ${name} is not closed`);
}

const SCOPE_FUNCTIONS = ['normalizeScope', 'scopeKeyOf', 'startRootIds', 'computeScopeMembers', 'appNodeCount', 'defaultScope', 'aroundLayoutColumns'];
const BUNDLE_FUNCTIONS = ['relationKindJp', 'collapseParallelEdges', 'bundleMembers', 'bundleRepresentative'];

type Edge = [string, string, string?];

/** アプリ（a1, a2, …）と関連線（e_参照元_通し番号）の図を作り、指定した関数を読み込んだコンテキストを返す。 */
function load(appIds: number[], edges: Edge[], startIds: string[], names: string[]) {
  const elements = [
    ...appIds.map((id) => ({ data: { id: `a${id}`, appId: id } })),
    ...edges.map(([source, target, kind], i) => ({ data: { id: `e_${source}_${i}`, source: `a${source}`, target: `a${target}`, kind: kind || 'LOOKUP', label: `L${i}` } }))
  ];
  const context: any = createContext({
    ELEMENTS: JSON.stringify(elements),
    START_IDS: JSON.stringify(startIds),
    SCOPE_AUTO_MIN_APPS: Number(script.match(/const SCOPE_AUTO_MIN_APPS = (\d+);/)![1]),
    viewScope: { mode: 'all', roots: [], depth: 1 },
    scopeMembers: null
  });
  context.window = context;
  context.self = context;
  runInContext(cytoscapeSource, context);
  runInContext([
    'globalThis.cy = cytoscape({ headless: true, elements: JSON.parse(ELEMENTS) });',
    'globalThis.startAppIdSet = new Set(JSON.parse(START_IDS));',
    'globalThis.collapsedEdgeLabelBackup = new Map();',
    ...names.map(extractFunction)
  ].join('\n'), context);
  return context;
}

describe('ER viewer: scope (around the start apps / everything)', () => {
  // 起点 1 から 2〜13 を参照し、14〜20 は 13 の先にある（20 アプリ）
  const ids = Array.from({ length: 20 }, (_, i) => i + 1);
  const edges: Edge[] = [
    ...Array.from({ length: 12 }, (_, i): Edge => ['1', String(i + 2)]),
    ...Array.from({ length: 7 }, (_, i): Edge => ['13', String(i + 14)])
  ];

  it('opens a large diagram around the start apps, and small or all-start diagrams as a whole', () => {
    expect(JSON.parse(JSON.stringify(load(ids, edges, ['1'], SCOPE_FUNCTIONS).defaultScope()))).toEqual({ mode: 'around', roots: ['1'], depth: 1 });
    // 15 アプリ以下は全体
    const small = ids.slice(0, 15);
    expect(load(small, edges.filter(([s, t]) => Number(s) <= 15 && Number(t) <= 15), ['1'], SCOPE_FUNCTIONS).defaultScope().mode).toBe('all');
    // 全アプリを起点にした図は、起点まわりにしても減らないため全体
    expect(load(ids, edges, ids.map(String), SCOPE_FUNCTIONS).defaultScope().mode).toBe('all');
    // 起点が図に無い（取得できなかった）ときも全体
    expect(load(ids, edges, ['99'], SCOPE_FUNCTIONS).defaultScope().mode).toBe('all');
  });

  it('follows relations in both directions up to the chosen depth, skipping removed apps and lines', () => {
    const api = load(ids, [...edges, ['5', '1']], ['1'], SCOPE_FUNCTIONS);
    const depth1 = [...api.computeScopeMembers(['1'], 1)].sort();
    expect(depth1).toEqual(['a1', ...Array.from({ length: 12 }, (_, i) => `a${i + 2}`)].sort());
    expect(api.computeScopeMembers(['1'], 2).size).toBe(20);
    // 図から削除した線とアプリは辿らない（1 → 13 の線を消すと、13 とその先は届かない）
    api.cy.getElementById('e_1_11').addClass('rel-manual-hidden');
    api.cy.getElementById('a2').addClass('app-manual-hidden');
    const after = api.computeScopeMembers(['1'], 2);
    expect(after.has('a2')).toBe(false);
    expect(after.has('a13')).toBe(false);
    expect(after.has('a14')).toBe(false);
    expect(after.has('a5')).toBe(true);
  });

  it('accepts only known scope shapes from saved state and share URLs', () => {
    const api = load(ids, edges, ['1'], SCOPE_FUNCTIONS);
    const normalize = (raw: unknown) => JSON.parse(JSON.stringify(api.normalizeScope(raw)));
    expect(normalize({ mode: 'around', roots: ['1', 1, '999'], depth: 2 })).toEqual({ mode: 'around', roots: ['1'], depth: 2 });
    expect(normalize({ mode: 'around', roots: ['999'] })).toEqual({ mode: 'all', roots: [], depth: 1 });
    expect(normalize({ mode: 'everything', depth: 7 })).toEqual({ mode: 'all', roots: [], depth: 1 });
    expect(normalize(null)).toEqual({ mode: 'all', roots: [], depth: 1 });
    expect(api.scopeKeyOf({ mode: 'around', roots: ['3', '1'], depth: 1 })).toBe('around:1,3:1');
  });

  it('puts the centre app in the middle, apps that refer to it on the left and apps it refers to on the right', () => {
    // 1 → 2、3 → 1、1 ⇄ 4、2 → 5（深さ 2）、6 → 3（深さ 2）
    const api = load([1, 2, 3, 4, 5, 6], [['1', '2'], ['3', '1'], ['1', '4'], ['4', '1'], ['2', '5'], ['6', '3']], ['1'], SCOPE_FUNCTIONS);
    api.viewScope = { mode: 'around', roots: ['1'], depth: 2 };
    api.scopeMembers = api.computeScopeMembers(['1'], 2);
    const { col } = api.aroundLayoutColumns();
    expect(Object.fromEntries([...col])).toEqual({ a1: 0, a2: 1, a3: -1, a4: 1, a5: 2, a6: -2 });
  });
});

describe('ER viewer: lines between the same pair of apps', () => {
  it('draws one line per pair and kind with the count, and can list and remove every line it stands for', () => {
    const api = load([1, 2, 3], [['1', '2'], ['1', '2'], ['1', '2'], ['1', '2', 'REF'], ['2', '1'], ['1', '3']], ['1'], BUNDLE_FUNCTIONS);
    const cy = api.cy;
    api.collapseParallelEdges(true);
    const rep = cy.getElementById('e_1_0');
    expect(rep.data('bundleCount')).toBe(3);
    expect(rep.data('label')).toBe('3本のルックアップ');
    expect(cy.edges('.edge-collapsed').map((e: any) => e.id()).sort()).toEqual(['e_1_1', 'e_1_2']);
    // 種類が違う線と、向きが逆の線はまとめない
    expect(cy.getElementById('e_1_3').hasClass('edge-collapsed')).toBe(false);
    expect(cy.getElementById('e_2_4').hasClass('edge-collapsed')).toBe(false);
    expect(api.bundleMembers(rep).map((e: any) => e.id())).toEqual(['e_1_0', 'e_1_1', 'e_1_2']);
    expect(api.bundleRepresentative(cy.getElementById('e_1_2')).id()).toBe('e_1_0');
    expect(api.bundleMembers(cy.getElementById('e_1_5')).map((e: any) => e.id())).toEqual(['e_1_5']);
    // 図から削除した線はまとめに入れない
    cy.getElementById('e_1_1').addClass('rel-manual-hidden');
    api.collapseParallelEdges(true);
    expect(cy.getElementById('e_1_0').data('bundleCount')).toBe(2);
    // まとめをやめると元のラベルに戻る
    api.collapseParallelEdges(false);
    expect(cy.edges('.edge-collapsed')).toHaveLength(0);
    expect(cy.getElementById('e_1_0').data('label')).toBe('L0');
    expect(cy.getElementById('e_1_0').data('bundleCount')).toBe(1);
  });
});

describe('ER viewer: relation and app tables', () => {
  const context: any = createContext({});
  runInContext(['buildFieldDisplayName', 'labelWithCode', 'fieldLabelByCode', 'relSourceFieldText', 'relTargetFieldText', 'compareValues', 'sortRows'].map(extractFunction).join('\n'), context);
  const target = { id: 2, allFields: [{ code: 'customer_code', label: '顧客コード' }] };

  it('names the source and target fields of each kind of relation', () => {
    expect(context.relSourceFieldText({ kind: 'LOOKUP', from: 'cust', fromDisplay: '顧客' })).toBe('顧客（cust）');
    expect(context.relSourceFieldText({ kind: 'REF', controlFieldLabel: '受注一覧', fromLabel: '案件番号', sourceJoinField: 'case_no' })).toBe('一覧「受注一覧」・結合 案件番号（case_no）');
    expect(context.relSourceFieldText({ kind: 'ACTION', from: '__ACTION__0', fromLabel: '見積を作成' })).toBe('アクション「見積を作成」');
    // 手動で引いた線は、内部のコード（__MANUAL__1）を出さない
    expect(context.relSourceFieldText({ kind: 'LOOKUP', from: '__MANUAL__1', fromLabel: '会計連携' })).toBe('会計連携');
    expect(context.relTargetFieldText({ kind: 'LOOKUP', toField: 'customer_code' }, target)).toBe('顧客コード（customer_code）');
    expect(context.relTargetFieldText({ kind: 'LOOKUP', toField: 'customer_code' }, null)).toBe('customer_code');
    expect(context.relTargetFieldText({ kind: 'ACTION', toField: '' }, target)).toBe('');
  });

  it('sorts numbers as numbers and Japanese text in reading order, both ways', () => {
    const columns = [{ key: 'id' }, { key: 'name' }];
    const rows = [{ id: 10, name: 'い', tiebreak: 'a' }, { id: 9, name: 'あ', tiebreak: 'b' }, { id: 100, name: 'う', tiebreak: 'c' }];
    const sorted = (state: object, key: string) => JSON.parse(JSON.stringify(context.sortRows(rows, columns, state))).map((r: any) => r[key]);
    expect(sorted({ sort: 'id', dir: 1 }, 'id')).toEqual([9, 10, 100]);
    expect(sorted({ sort: 'id', dir: -1 }, 'id')).toEqual([100, 10, 9]);
    expect(sorted({ sort: 'name', dir: 1 }, 'name')).toEqual(['あ', 'い', 'う']);
  });
});
