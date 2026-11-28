import { describe, expect, it } from 'vitest';
import { computeDiffRows, expandEntityRowsForDisplay } from '../../src/diff/engine';
import { enrichDiffRows } from '../../src/diff/enrich';
import { buildDiffHtml } from '../../src/diff/export';

// kintone の /k/v1/app/actions.json の応答の形。アプリアクションは「アクション名をキーにしたオブジェクト」。
const actionSettings = {
  actions: {
    見積を作成: { name: '見積を作成', id: '11', index: '0', destApp: { app: '20', code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'customer', destField: 'customer' }], entities: [{ type: 'USER', code: 'sales1' }], filterCond: '' },
    '受注.登録': { name: '受注.登録', id: '12', index: '1', destApp: { app: '21', code: '' }, mappings: [], entities: [], filterCond: '' }
  },
  revision: '3'
};

function extractInlineJsonConst(html: string, name: string): any {
  const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] || '';
  const match = script.match(new RegExp(`\\bconst ${name} = (.+);\\r?\\n`));
  if (!match) throw new Error(`${name} was not found in inline report script`);
  return JSON.parse(match[1]);
}

describe('セクション全体の追加・削除の、アプリアクション単位の表示行', () => {
  const source = { appId: '1', sections: {} };
  const target = { appId: '2', sections: { actionSettings } };

  it('名前をキーにしたアプリアクションを、アクションごとの行に展開する', () => {
    const comparison = computeDiffRows(source, target, ['actionSettings'], '');
    const rows = expandEntityRowsForDisplay(enrichDiffRows(comparison.rows, source, target));
    const children = rows.filter((row: any) => row._displayOnly);
    expect(children.map((row: any) => row.path)).toEqual(['actionSettings.actions.見積を作成', 'actionSettings.actions.受注.登録']);
    expect(children.map((row: any) => row.entityLabel)).toEqual(['見積を作成', '受注.登録']);
    expect(children[0].reasonSummary).toBe('アクション追加：見積を作成');
    expect(children[0].right).toEqual(actionSettings.actions.見積を作成);
  });

  it('HTML レポートにもアクションごとの参考行を入れる（名前の「.」で区切らない）', () => {
    const comparison = computeDiffRows(source, target, ['actionSettings'], '');
    const rows = enrichDiffRows(comparison.rows, source, target);
    const html = buildDiffHtml(source, target, rows, ['actionSettings'], '', { truncation: comparison.truncation });
    const child = extractInlineJsonConst(html, 'REPORT_ROWS').find((row: any) => row.path === 'actionSettings.actions.受注.登録');
    expect(child?._displayOnly).toBe(true);
    expect(child?.entityPathTail).toBe('');
  });

  it('アクションを配列で持つ設定JSONも、アクション名で展開する', () => {
    const rows = expandEntityRowsForDisplay([{
      _id: 'a', sectionKey: 'actionSettings', section: 'アクション設定', type: 'removed', path: 'actionSettings',
      left: { actions: [{ name: '見積を作成', destApp: { app: '20' } }] }, right: undefined
    } as any]);
    expect(rows.filter((row: any) => row._displayOnly).map((row: any) => [row.path, row.entityLabel])).toEqual([['actionSettings.actions[0]', '見積を作成']]);
  });
});
