import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import viewerActions from '../../src/tabs/er-viewer/viewer-actions.js?raw';
import viewerUiRaw from '../../src/tabs/er-viewer/viewer-ui.js?raw';

const viewerUi = viewerUiRaw.replace(/\r\n/g, '\n');

/**
 * ER図ビューアーの操作の受け口（data-action など）。どこかで文字の逃がしが漏れて、細工した要素が画面に入っても、
 * 表にある操作しか呼ばれず、表に無い名前（関数の名前・Object のメンバーの名前）では何も起きないこと。
 */
describe('ER図ビューアー: data-action などは表にある操作だけを呼ぶ', () => {
  function load() {
    const listeners: Record<string, (event: any) => void> = {};
    const calls: string[] = [];
    const context: any = {
      document: { addEventListener: (type: string, fn: (event: any) => void) => { listeners[type] = fn; } },
      // 表の操作が呼ぶ関数と、表に無い名前の関数（呼ばれたら記録する）
      exportEditedHtml: () => calls.push('exportEditedHtml'),
      printDiagram: () => calls.push('printDiagram'),
      setLayout: (name: string) => calls.push(`setLayout:${name}`),
      eval: () => calls.push('eval')
    };
    runInNewContext(viewerActions, context);
    const fire = (type: string, attribute: string, name: string, dataset: Record<string, string> = {}) => {
      const el = { getAttribute: (key: string) => (key === attribute ? name : null), dataset };
      const event = { type, target: { closest: (selector: string) => (selector === `[${attribute}]` ? el : null) }, stopPropagation: () => calls.push('stop') };
      listeners[type](event);
    };
    return { fire, calls };
  }

  it('表に無い名前（関数の名前・__proto__・constructor・toString など）では何も呼ばない', () => {
    const { fire, calls } = load();
    for (const name of ['exportEditedHtml', 'eval', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', '__defineGetter__', 'save-html ', 'SAVE-HTML', '']) {
      for (const [type, attribute] of [['click', 'data-action'], ['change', 'data-change'], ['input', 'data-input'], ['keydown', 'data-keydown']]) {
        expect(() => fire(type, attribute, name), `${attribute}="${name}"`).not.toThrow();
      }
    }
    expect(calls).toEqual([]);
  });

  it('表の並べ替え（data-action="sort" の data-table）は、表の名前でない値でプロトタイプを変えない', () => {
    const start = viewerUi.indexOf('function sortTable(');
    const end = viewerUi.indexOf('\nfunction ', start + 1);
    const context: any = { refreshActiveTable: () => {}, document: { querySelectorAll: () => [] } };
    runInNewContext(`${viewerUi.slice(viewerUi.indexOf('const tableState='), viewerUi.indexOf('};', viewerUi.indexOf('const tableState=')) + 2)}\n${viewerUi.slice(start, end)}\nglobalThis.sortTable=sortTable;globalThis.tableState=tableState;`, context);
    for (const name of ['__proto__', 'constructor', 'toString']) context.sortTable(name, 'name');
    expect(runInNewContext('({}).sort === undefined && ({}).dir === undefined', context)).toBe(true);
    context.sortTable('apps', 'id');
    expect(context.tableState.apps).toMatchObject({ sort: 'id', dir: 1 });
  });

  it('表にある名前だけを、決まった操作として呼ぶ（属性の値は引数として渡すだけ）', () => {
    const { fire, calls } = load();
    fire('click', 'data-action', 'save-html');
    fire('click', 'data-action', 'print');
    fire('click', 'data-action', 'layout', { layoutBtn: 'eval' } as any);
    expect(calls).toEqual(['exportEditedHtml', 'printDiagram', 'setLayout:eval']);
  });
});
