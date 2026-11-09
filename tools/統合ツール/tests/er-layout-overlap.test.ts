import { describe, expect, it } from 'vitest';
import { createContext, runInContext } from 'node:vm';
import { buildHTML } from '../src/tabs/er.js';

const html = buildHTML([
  { id: 1, name: 'A', ok: true, status: 'complete', allFields: [], totalFieldCount: 0, relations: [] }
], { startAppId: '1', startAppIds: ['1'], layoutName: 'cose', fieldDensity: 'standard', source: {} });
const script = html.match(/<script id="er-main" type="text\/plain">([\s\S]*?)<\/script>/)![1];

type StubNode = {
  id: () => string;
  data: (key: string) => number | undefined;
  outerWidth: () => number;
  outerHeight: () => number;
  position: (value?: { x: number; y: number }) => { x: number; y: number };
  hasClass: (name: string) => boolean;
  locked: () => boolean;
  animate: (opts: { position: { x: number; y: number } }) => void;
  pos: { x: number; y: number };
  animated: number;
};

function stubNode(id: string, x: number, y: number, options: { w?: number; h?: number; lowW?: number; lowH?: number; locked?: boolean } = {}): StubNode {
  const node: StubNode = {
    pos: { x, y },
    animated: 0,
    id: () => id,
    data: (key) => ({ cardW: options.w ?? 300, cardH: options.h ?? 100, lowW: options.lowW ?? 0, lowH: options.lowH ?? 0 } as Record<string, number>)[key],
    outerWidth: () => options.w ?? 300,
    outerHeight: () => options.h ?? 100,
    position: (value) => {
      if (value) node.pos = { x: value.x, y: value.y };
      return { ...node.pos };
    },
    hasClass: () => false,
    locked: () => !!options.locked,
    animate: (opts) => { node.animated += 1; node.pos = { ...opts.position }; }
  };
  return node;
}

/** 図の画面の関数だけを取り出して、スタブのノードに対して実行する。 */
function loadSeparate() {
  const pick = (pattern: RegExp) => {
    const match = script.match(pattern);
    if (!match) throw new Error(`ER viewer code not found: ${pattern}`);
    return match[0];
  };
  const source = [
    pick(/function nodeSpan\(n\)\{[\s\S]*?\r?\n\}/),
    pick(/const OVERLAP_GAP = \d+;/),
    pick(/const OVERLAP_MAX_NODES = \d+;/),
    pick(/function separateOverlappingNodes\(nodes, animate\)\{[\s\S]*?\r?\n\}/)
  ].join('\n');
  const context = createContext({});
  runInContext(`${source}\nglobalThis.api={separateOverlappingNodes,gap:OVERLAP_GAP,max:OVERLAP_MAX_NODES};`, context);
  return (context as any).api as { separateOverlappingNodes: (nodes: unknown, animate: boolean) => boolean; gap: number; max: number };
}

const collection = (nodes: StubNode[]) => ({ toArray: () => nodes });

function overlapping(nodes: StubNode[], span = (n: StubNode) => ({ w: n.outerWidth(), h: n.outerHeight() })) {
  const pairs: string[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = span(nodes[i]);
      const b = span(nodes[j]);
      const w = (a.w + b.w) / 2 - Math.abs(nodes[i].pos.x - nodes[j].pos.x);
      const h = (a.h + b.h) / 2 - Math.abs(nodes[i].pos.y - nodes[j].pos.y);
      if (w > 0 && h > 0) pairs.push(`${nodes[i].id()}/${nodes[j].id()}`);
    }
  }
  return pairs;
}

describe('ER viewer: overlapping cards after a layout', () => {
  const { separateOverlappingNodes, gap, max } = loadSeparate();

  it('leaves a layout without overlaps untouched', () => {
    const nodes = [stubNode('a', 0, 0), stubNode('b', 400, 0), stubNode('c', 0, 200)];
    expect(separateOverlappingNodes(collection(nodes), false)).toBe(false);
    expect(nodes.map((n) => n.pos)).toEqual([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 0, y: 200 }]);
  });

  it('pushes cards that were placed on top of each other apart, keeping a gap', () => {
    const nodes = [stubNode('a', 0, 0), stubNode('b', 0, 0), stubNode('c', 50, 20)];
    expect(separateOverlappingNodes(collection(nodes), false)).toBe(true);
    expect(overlapping(nodes, (n) => ({ w: n.outerWidth() + gap, h: n.outerHeight() + gap }))).toEqual([]);
  });

  it('uses the larger of the detail card and the overview card, so cards do not touch after zooming out', () => {
    // 詳細のカードは 300 幅で重ならないが、縮小時の概要カード（420 幅）にすると重なる並び
    const nodes = [stubNode('a', 0, 0, { w: 300, lowW: 420, lowH: 78 }), stubNode('b', 332, 0, { w: 300, lowW: 420, lowH: 78 })];
    expect(overlapping(nodes)).toEqual([]);
    expect(separateOverlappingNodes(collection(nodes), false)).toBe(true);
    expect(overlapping(nodes, (n) => ({ w: 420 + gap, h: 100 + gap }))).toEqual([]);
  });

  it('never moves a locked (pinned) card and moves the other one the whole way', () => {
    const pinned = stubNode('pinned', 0, 0, { locked: true });
    const other = stubNode('other', 100, 0);
    expect(separateOverlappingNodes(collection([pinned, other]), false)).toBe(true);
    expect(pinned.pos).toEqual({ x: 0, y: 0 });
    expect(overlapping([pinned, other], (n) => ({ w: n.outerWidth() + gap, h: n.outerHeight() + gap }))).toEqual([]);
  });

  it('separates a crowded cluster of 40 cards', () => {
    const nodes = Array.from({ length: 40 }, (_, i) => stubNode(`n${i}`, (i % 8) * 60, Math.floor(i / 8) * 30, { w: 200 + (i % 5) * 30, h: 60 + (i % 3) * 40 }));
    expect(overlapping(nodes).length).toBeGreaterThan(20);
    expect(separateOverlappingNodes(collection(nodes), false)).toBe(true);
    expect(overlapping(nodes)).toEqual([]);
  });

  it('animates the move after a user-visible layout and sets positions directly otherwise', () => {
    const animated = [stubNode('a', 0, 0), stubNode('b', 10, 0)];
    separateOverlappingNodes(collection(animated), true);
    expect(animated.every((n) => n.animated === 1)).toBe(true);
    const direct = [stubNode('a', 0, 0), stubNode('b', 10, 0)];
    separateOverlappingNodes(collection(direct), false);
    expect(direct.every((n) => n.animated === 0)).toBe(true);
  });

  it('skips very large diagrams instead of freezing the page', () => {
    const nodes = Array.from({ length: max + 1 }, (_, i) => stubNode(`n${i}`, 0, 0));
    expect(separateOverlappingNodes(collection(nodes), false)).toBe(false);
    expect(nodes.every((n) => n.pos.x === 0 && n.pos.y === 0)).toBe(true);
  });

  it('runs after the layout in both layout paths, and sizes the no-link grid by the larger card', () => {
    expect(script).toContain('const separated = separateOverlappingNodes(wrapTargets, !initial);');
    expect(script).toContain('if(initial || wrapped || separated) setTimeout(fit, initial ? 200 : 450);');
    expect(script).toContain('separateOverlappingNodes(parts.linked, false);\n    placeNoLinkGrid(parts.linked, parts.isolated, !initial);');
    expect(script).toContain('const span = nodeSpan(n);\n    cellW = Math.max(cellW, span.w);');
  });
});
