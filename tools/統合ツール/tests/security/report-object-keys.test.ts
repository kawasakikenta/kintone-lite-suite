import { describe, expect, it } from 'vitest';
import { buildDiffHtml } from '../../src/diff/export';
import { computeDiffRows } from '../../src/diff/engine';

function extractInlineScript(html: string): string {
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error('inline report script was not found');
  return match[1];
}

/** 埋め込んだ定数を、ブラウザと同じく JavaScript の式として評価する（JSON.parse では差が見えない）。 */
function evalScriptConst(script: string, name: string): any {
  const match = script.match(new RegExp(`\\bconst ${name} = (.+);\\r?\\n`));
  if (!match) throw new Error(`${name} was not found in inline report script`);
  return new Function(`return (${match[1]});`)();
}

function evalReportFunctions(script: string, names: string[], prelude = ''): Record<string, any> {
  const functions = names.map((name) => {
    const start = script.indexOf(`  function ${name}(`);
    if (start < 0) throw new Error(`${name} was not found in generated HTML`);
    const end = script.indexOf('\n  function ', start + 1);
    return script.slice(start, end < 0 ? undefined : end);
  }).join('\n');
  return new Function(`${prelude}\n${functions}\nreturn { ${names.join(', ')} };`)();
}

// フィールドコード・一覧名・選択肢名などは kintone の利用者が付ける名前で、`__proto__` や `constructor` もあり得る。
const sourceFields = JSON.parse('{"properties":{"__proto__":{"type":"SINGLE_LINE_TEXT","code":"__proto__","label":"特殊コード"},"name":{"type":"SINGLE_LINE_TEXT","code":"name","label":"名前"}}}');
const targetFields = JSON.parse('{"properties":{"__proto__":{"type":"SINGLE_LINE_TEXT","code":"__proto__","label":"特殊コード（変更）"},"name":{"type":"SINGLE_LINE_TEXT","code":"name","label":"名前"},"constructor":{"type":"NUMBER","code":"constructor","label":"追加した数値"}}}');
const sourceViews = JSON.parse('{"views":{"__proto__":{"type":"LIST","name":"__proto__","index":"0","filterCond":"a = 1"}}}');

function buildReport() {
  const source = { appId: '1', sections: { fieldSettings: sourceFields, viewSettings: sourceViews } };
  const target = { appId: '2', sections: { fieldSettings: targetFields } };
  const { rows } = computeDiffRows(source, target, ['fieldSettings', 'viewSettings'], '');
  return buildDiffHtml(source, target, rows, ['fieldSettings', 'viewSettings'], '', { exportContentMode: 'withCompared' });
}

describe('差分HTMLレポートに埋め込む設定の名前（__proto__ など）', () => {
  const script = extractInlineScript(buildReport());

  it('`__proto__` という名前のフィールドも、比較証跡・フィールド単位表示のデータから消えない', () => {
    const sourceSections = evalScriptConst(script, 'SOURCE_SECTIONS');
    expect(Object.keys(sourceSections.fieldSettings.properties)).toEqual(['__proto__', 'name']);
    expect(Object.getPrototypeOf(sourceSections.fieldSettings.properties)).toBe(Object.prototype);
    const fieldProps = evalScriptConst(script, 'FIELD_PROPS_TGT');
    expect(Object.keys(fieldProps)).toEqual(['__proto__', 'name', 'constructor']);
    expect(fieldProps.__proto__.label).toBe('特殊コード（変更）');
  });

  it('一覧ごと消えた行の値にある `__proto__` の一覧も、行の値から消えない', () => {
    const rows = evalScriptConst(script, 'REPORT_ROWS');
    const viewRow = rows.find((row: any) => row.sectionKey === 'viewSettings');
    expect(viewRow).toBeTruthy();
    expect(JSON.stringify(viewRow.left)).toContain('"__proto__"');
  });

  it('フィールドの対応表は自身のプロパティだけを引く（constructor などが Object の関数に化けない）', () => {
    const { collectFlatFieldMap } = evalReportFunctions(script, ['collectFlatFieldMap']);
    const flat = collectFlatFieldMap(sourceFields.properties);
    expect(Object.keys(flat).sort()).toEqual(['__proto__', 'name']);
    expect(flat.__proto__.label).toBe('特殊コード');
    expect(flat.constructor).toBeUndefined();
    expect(flat.toString).toBeUndefined();
  });

  it('比較元に無いフィールド（constructor）は、比較元の定義を Object.prototype から拾わない', () => {
    const { buildFieldJsonGroups } = evalReportFunctions(
      script,
      ['ownValue', 'stripInternalFieldKeys', 'relativePathFromRow', 'tokenizePath', 'extractFieldPathInfo', 'buildFieldJsonGroups'],
      `const FIELD_SECTION_KEY = 'fieldSettings';
       const SECTION_LABEL_MAP = { fieldSettings: 'フィールド' };
       const FIELD_PROPS_SRC = (${script.match(/\bconst FIELD_PROPS_SRC = (.+);\r?\n/)![1]});
       const FIELD_PROPS_TGT = (${script.match(/\bconst FIELD_PROPS_TGT = (.+);\r?\n/)![1]});
       function isActionableReviewRow(row) { return !!row && row.type !== 'same' && !row._displayOnly; }`
    );
    const { groups } = buildFieldJsonGroups([
      { sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.constructor', right: targetFields.properties.constructor }
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].src).toBeNull();
    expect(groups[0].status).toBe('added');
  });
});
