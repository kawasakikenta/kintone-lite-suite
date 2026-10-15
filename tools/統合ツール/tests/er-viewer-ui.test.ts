import { describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { buildHTML } from '../src/tabs/er.js';

function viewerScript(): string {
  const html = buildHTML([{ id: 1, name: '物件', ok: true, status: 'complete', allFields: [], relations: [] }], {
    startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {}
  });
  const match = html.match(/<script id="er-main" type="text\/plain">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('ER viewer script was not found');
  return match[1];
}

/** `function name(` から対応する閉じ括弧までを切り出す（文字列リテラル内の括弧は数えない）。 */
function extractFunction(script: string, name: string): string {
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ER viewer clipboard actions', () => {
  const script = viewerScript();

  it('builds the share URL from the current URL so blob and file pages stay valid', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const context = {
      location: { href: 'blob:https://acme.cybozu.com/5d0e-uuid#old', protocol: 'blob:', origin: 'https://acme.cybozu.com', pathname: 'https://acme.cybozu.com/5d0e-uuid' },
      navigator: { clipboard: { writeText } },
      encodeState: () => 'STATE',
      toast: vi.fn(),
      prompt: vi.fn()
    };
    runInNewContext(`${extractFunction(script, 'copyShareUrl')}; copyShareUrl();`, context);
    await flush();
    expect(writeText).toHaveBeenCalledWith('blob:https://acme.cybozu.com/5d0e-uuid#STATE');
    expect(context.toast).toHaveBeenCalledWith(expect.stringContaining('HTML保存'));
    expect(context.prompt).not.toHaveBeenCalled();
  });

  it('falls back to a manual copy prompt when the clipboard rejects', async () => {
    const context = {
      location: { href: 'file:///C:/work/er.html', protocol: 'file:' },
      navigator: { clipboard: { writeText: () => Promise.reject(new Error('denied')) } },
      encodeState: () => 'STATE',
      toast: vi.fn(),
      prompt: vi.fn()
    };
    runInNewContext(`${extractFunction(script, 'copyShareUrl')}; copyShareUrl();`, context);
    await flush();
    expect(context.prompt).toHaveBeenCalledWith(expect.any(String), 'file:///C:/work/er.html#STATE');
    expect(context.toast).not.toHaveBeenCalled();
  });

  it('tells the user when copying the export text fails', async () => {
    const context = {
      _md: { text: 'erDiagram' },
      navigator: { clipboard: { writeText: () => Promise.reject(new Error('denied')) } },
      toast: vi.fn()
    };
    runInNewContext(`${extractFunction(script, 'copyModal')}; copyModal();`, context);
    await flush();
    expect(context.toast).toHaveBeenCalledWith(expect.stringContaining('コピーに失敗'));
    expect(context.toast).not.toHaveBeenCalledWith('コピーしました！');
  });
});

describe('ER viewer dialog focus', () => {
  const script = viewerScript();

  function createDom() {
    const classes = new Map<string, Set<string>>();
    const state = { active: null as any, focused: [] as string[] };
    const element = (id: string, visible = true): any => {
      classes.set(id, new Set());
      const el: any = {
        id,
        isConnected: true,
        visible,
        textContent: '',
        classList: {
          add: (c: string) => classes.get(id)!.add(c),
          remove: (c: string) => classes.get(id)!.delete(c),
          contains: (c: string) => classes.get(id)!.has(c)
        },
        getClientRects: () => (el.visible ? [{}] : []),
        focus: () => { state.active = el; state.focused.push(id); },
        closest: () => null
      };
      return el;
    };
    const elements: Record<string, any> = {};
    for (const id of ['modal-overlay', 'modal-title', 'modal-content', 'primary', 'menuItem', 'menuTrigger', 'body']) elements[id] = element(id);
    elements.menuItem.closest = () => ({ querySelector: () => elements.menuTrigger });
    const document = {
      body: elements.body,
      get activeElement() { return state.active; },
      getElementById: (id: string) => elements[id],
      querySelector: (selector: string) => (selector === '#modal .actions .primary' ? elements.primary : null)
    };
    return { document, elements, state };
  }

  function load(dom: ReturnType<typeof createDom>) {
    const source = [
      'let _md={text:"",filename:""};',
      'let modalReturnFocus=null;',
      extractFunction(script, 'rememberDialogFocus'),
      extractFunction(script, 'restoreDialogFocus'),
      extractFunction(script, 'openModal'),
      extractFunction(script, 'closeModal')
    ].join('\n');
    const context: any = { document: dom.document };
    runInNewContext(source, context);
    return context;
  }

  it('moves focus into the export dialog and returns it to the menu button on close', () => {
    const dom = createDom();
    const context = load(dom);
    dom.state.active = dom.elements.menuItem;
    context.openModal('Mermaid', 'erDiagram', 'er.mmd');
    expect(dom.state.active).toBe(dom.elements.primary);
    // メニューを閉じると項目は表示されなくなる
    dom.elements.menuItem.visible = false;
    context.closeModal();
    expect(dom.state.active).toBe(dom.elements.menuTrigger);
  });

  it('does not steal focus when closeModal runs while no dialog is open', () => {
    const dom = createDom();
    const context = load(dom);
    dom.state.active = dom.elements.menuTrigger;
    context.closeModal();
    expect(dom.state.focused).toEqual([]);
  });
});
