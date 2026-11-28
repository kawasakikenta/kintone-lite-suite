import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import viewerImport from '../src/tabs/er-viewer/viewer-import.js?raw';
import { buildHTML } from '../src/tabs/er';

// 「編集 → 編集済みHTMLから取り込む」のうち、ファイルの読み取り・値の確かめ・関連線の対応付け（画面に依存しない部分）。
// 読み込んだファイルは文字列として扱い、スクリプトとして実行しない。
function loadImport(): any {
  const context: any = { document: { getElementById: () => null }, console };
  runInNewContext(viewerImport, context);
  return context;
}

const legacyState = JSON.parse(readFileSync(join(__dirname, '../../test-harness/er-edit-state-v1.json'), 'utf8'));

const app = (id: number, name: string, relations: any[] = []) => ({ id, name, ok: true, status: 'complete', allFields: [{ code: 'k', label: 'K', type: 'SINGLE_LINE_TEXT', path: 'k' }], relations });
const lookup = (from: string, toApp: number) => ({ kind: 'LOOKUP', from, fromPath: from, fromLabel: from, toApp, toField: 'k' });
const ref = (control: string, toApp: number) => ({ kind: 'REF', from: 'k', fromPath: 'k', fromLabel: 'K', controlField: control, controlFieldPath: control, toApp, toField: 'k' });
const action = (name: string, toApp: number, index: number) => ({ kind: 'ACTION', from: `__ACTION__${index}`, fromLabel: name, toApp, toField: '' });

const MAIN_MARKER = '<script id="er-main" type="text/plain">';
const escapeStateJson = (state: unknown) => JSON.stringify(state).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** 今の版の編集済みHTMLと同じ形（図の本体の前に、実行しない JSON の編集の状態）にする。harness の withEditState と同じ。 */
function withState(html: string, state: unknown): string {
  return html.replace(MAIN_MARKER, () => `<script id="er-edit-state" type="application/json">${escapeStateJson(state)}</script>${MAIN_MARKER}`);
}

/** 以前の版の編集済みHTMLの形（編集の状態を window の変数へ代入するスクリプト）にする。 */
function withLegacyState(html: string, state: unknown): string {
  return html.replace(MAIN_MARKER, () => `<script id="er-edit-state">window.__ER_EDIT_STATE__=${escapeStateJson(state)};</script>${MAIN_MARKER}`);
}

describe('ER viewer: 編集済みHTMLからの取り込み（読み取りと確かめ）', () => {
  const ctx = loadImport();
  const apps = [app(1, '顧客'), app(2, '案件', [lookup('customer', 1)])];
  const html = buildHTML(apps, { startAppIds: ['2'], layoutName: 'dagre', fieldDensity: 'standard', source: {} });

  it('今の版の編集済みHTMLから、編集の状態と元の図のデータを文字列のまま取り出す', () => {
    const read = ctx.readEditedHtmlText(withState(html, { stateVersion: 2, notes: [{ text: '</script><script>alert(1)</script>', x: 1, y: 2 }] }));
    expect(read.error).toBeUndefined();
    expect(read.state.notes[0].text).toBe('</script><script>alert(1)</script>');
    expect(read.apps.map((a: any) => [a.id, a.name, a.relations.length])).toEqual([[1, '顧客', 0], [2, '案件', 1]]);
  });

  it('以前の版の編集済みHTML（状態を代入するスクリプト。stateVersion なしと 2）も読む', () => {
    const old = `<!DOCTYPE html>\n<html><head></head><body><script id="er-edit-state">window.__ER_EDIT_STATE__=${JSON.stringify(legacyState)};</script><script id="er-main" type="text/plain">\nconst APPS = ${JSON.stringify(apps)};\nconst ER_OPTIONS = {};\n</script></body></html>`;
    const read = ctx.readEditedHtmlText(old);
    expect(read.state.savedAt).toBe(legacyState.savedAt);
    expect(read.apps).toHaveLength(2);
    expect(ctx.sanitizeImportedEditState(read.state).version).toBe(1);
    // 表示範囲を持つ版（stateVersion 2）も、CSP をハッシュにする前は同じ代入の形で保存していた
    const v2 = ctx.readEditedHtmlText(withLegacyState(html, { stateVersion: 2, notes: [{ text: 'メモ', x: 1, y: 2 }], view: { scope: { mode: 'all', roots: [], depth: 1 } } }));
    expect(v2.error).toBeUndefined();
    expect(v2.state.notes[0].text).toBe('メモ');
    expect(v2.apps).toHaveLength(2);
    expect(ctx.sanitizeImportedEditState(v2.state).version).toBe(2);
  });

  it('今の版の編集の状態は JSON として読み、図の本体の後ろや JSON でない中身は使わない', () => {
    const json = ctx.readEditedHtmlText(withState(html, { stateVersion: 2, notes: [{ text: 'a&b<c>', x: 0, y: 0 }] }));
    expect(json.error).toBeUndefined();
    expect(json.state.notes[0].text).toBe('a&b<c>');
    expect(ctx.readEditedHtmlText(html.replace(MAIN_MARKER, `<script id="er-edit-state" type="application/json">{"notes":</script>${MAIN_MARKER}`)).error).toMatch(/壊れている/);
    // 代入のスクリプトを JSON の置き方に入れたものは JSON として読めない（実行もしない）
    expect(ctx.readEditedHtmlText(html.replace(MAIN_MARKER, `<script id="er-edit-state" type="application/json">window.__ER_EDIT_STATE__={};</script>${MAIN_MARKER}`)).error).toMatch(/壊れている/);
    expect(ctx.readEditedHtmlText(withState(html, 'text')).error).toMatch(/ファイルの形が違います/);
    const late = html.replace('</body>', '<script id="er-edit-state" type="application/json">{"notes":[]}</script></body>');
    expect(ctx.readEditedHtmlText(late).error).toMatch(/編集済みHTMLではありません/);
  });

  it('編集済みでない HTML・壊れた内容・スクリプトの形をした内容は読まない', () => {
    expect(ctx.readEditedHtmlText(html).error).toMatch(/編集済みHTMLではありません/);
    expect(ctx.readEditedHtmlText('<html>ほかのページ</html>').error).toMatch(/編集済みHTMLではありません/);
    expect(ctx.readEditedHtmlText(html.replace('<script id="er-main" type="text/plain">', '<script id="er-edit-state">window.__ER_EDIT_STATE__={"a":</script><script id="er-main" type="text/plain">')).error).toMatch(/壊れている/);
    // 代入の前に式があるものは JSON として読まない（実行もしない）
    const hostile = html.replace('<script id="er-main" type="text/plain">', '<script id="er-edit-state">alert(1);window.__ER_EDIT_STATE__={};</script><script id="er-main" type="text/plain">');
    expect(ctx.readEditedHtmlText(hostile).error).toMatch(/ファイルの形が違います/);
    expect(ctx.readEditedHtmlText(withLegacyState(html, [1, 2])).error).toMatch(/ファイルの形が違います/);
    // 図の本体の後ろ（本体の文字列の中）にある同じ並びは使わない
    const late = html.replace('</body>', '<script id="er-edit-state">window.__ER_EDIT_STATE__={"notes":[]};</script></body>');
    expect(ctx.readEditedHtmlText(late).error).toMatch(/編集済みHTMLではありません/);
  });

  it('以前の版の編集の状態を、知っている項目だけの決まった形にする', () => {
    const clean = ctx.sanitizeImportedEditState(legacyState);
    expect(clean.version).toBe(1);
    expect(clean.invalid).toBe(0);
    expect(clean.customApps).toEqual([{ id: -1, name: '外部会計システム', fields: [
      { code: 'manual_1', label: '会計コード', type: 'RECORD_NUMBER', required: true, isPK: true, unique: true, isLookup: false, isRef: false, isCustom: true },
      { code: 'manual_2', label: '金額', type: 'SINGLE_LINE_TEXT', required: true, isPK: false, unique: false, isLookup: false, isRef: false, isCustom: true },
      { code: 'manual_3', label: 'メモ', type: 'SINGLE_LINE_TEXT', required: false, isPK: false, unique: false, isLookup: false, isRef: false, isCustom: true }
    ] }]);
    expect(clean.customFields).toEqual([{ appId: 113, field: expect.objectContaining({ code: 'manual_4', label: '承認ステータス', required: true }) }]);
    expect(clean.customRelations).toEqual([{ fromAppId: 113, toApp: -1, kind: 'ACTION', label: '会計連携' }]);
    expect(clean.appOverrides).toEqual([{ id: 101, name: '顧客マスタ（編集済み）', color: '#f472b6' }]);
    expect(clean.fieldOverrides).toEqual([{ appId: 113, path: '案件名', patch: { label: '案件名（編集）' } }]);
    expect(clean.relationOverrides).toEqual([{ appId: 113, ri: 0, patch: { fromLabel: '顧客参照（編集）', fromDisplay: '顧客参照（編集）', kind: 'LOOKUP' } }]);
    expect(clean.notes).toEqual([{ text: '受注フローの中心', color: '#fef08a', x: -600, y: -650 }]);
    expect(clean.positions).toHaveLength(21);
    expect(clean.positions[0]).toEqual({ node: { kind: 'app', appId: 113 }, pos: { x: 123.5, y: 456.25 } });
    expect(clean.removedNodes).toEqual([{ kind: 'app', appId: 110 }]);
    expect(clean.removedEdges).toEqual([{ appId: 113, ri: 1 }]);
    expect(clean.pinnedNodes).toEqual([{ kind: 'app', appId: 113 }]);
    expect(clean.hiddenFields).toEqual([{ appId: 113, path: '顧客' }]);
    // 以前の版は表示範囲を持たない（全体）
    expect(clean.scope).toBeNull();
    expect(clean.scopePositions).toEqual([]);
  });

  it('今の版の表示範囲と、表示範囲ごとの位置を読む', () => {
    const clean = ctx.sanitizeImportedEditState({ stateVersion: 2, view: {
      scope: { mode: 'around', roots: ['101', '-1', 'x'], depth: 2 },
      scopePositions: { all: { a101: { x: 1, y: 2 } }, 'around:101:1': { a101: { x: 3, y: 4 }, g9: { x: 5, y: 6 } }, 'around:bad:1': { a1: { x: 0, y: 0 } } }
    } });
    expect(clean.version).toBe(2);
    expect(clean.scope).toEqual({ mode: 'around', roots: [101, -1], depth: 2 });
    expect(clean.scopePositions).toEqual([
      { scope: { mode: 'all', roots: [], depth: 1 }, positions: [{ node: { kind: 'app', appId: 101 }, pos: { x: 1, y: 2 } }] },
      { scope: { mode: 'around', roots: [101], depth: 1 }, positions: [{ node: { kind: 'app', appId: 101 }, pos: { x: 3, y: 4 } }, { node: { kind: 'ghost', id: 'g9' }, pos: { x: 5, y: 6 } }] }
    ]);
  });

  it('形の正しくない値・危ない値は使わない（プロトタイプを変えない・色は #rgb だけ・数値は有限）', () => {
    const raw = JSON.parse(`{
      "appOverrides": { "__proto__": { "polluted": true }, "constructor": { "name": "x" }, "101": { "name": "<img src=x onerror=alert(1)>", "color": "red;background:url(https://evil.example/x)" }, "102": { "color": "#abc" } },
      "fieldOverrides": { "__proto__::a": { "label": "x" }, "113::a": { "label": "", "type": "bad type", "isPK": "yes" }, "113::b": { "label": "B", "required": true, "toString": 1 } },
      "relationOverrides": { "e_113_x": { "fromLabel": "a" }, "e_113_2": { "kind": "DROP TABLE" }, "e_113_3": { "kind": "REF", "onclick": "alert(1)" } },
      "customApps": [ { "id": 5, "name": "正のIDは手動のアプリではない" }, { "id": -2, "name": "" }, { "id": -3, "name": "手動", "fields": [ { "code": "", "label": "x" }, { "code": "c", "label": "C", "type": "<b>" } ] } ],
      "customRelations": [ { "fromAppId": 113, "rel": { "toApp": "-3", "kind": "SCRIPT" } } ],
      "notes": [ { "text": "ok", "x": "1e309", "y": 0 }, { "text": "メモ", "color": "javascript:alert(1)", "x": 1, "y": 2 } ],
      "view": { "positions": { "a1": { "x": null, "y": 1 }, "a2": { "x": 1e8, "y": 1 }, "b3": { "x": 1, "y": 1 }, "a4": { "x": 1, "y": 2 } }, "removedNodeIds": "a1", "pinnedNodeIds": [ "a5", "<svg>" ], "hiddenFieldKeys": [ "113::", "::a", "113::c" ] }
    }`);
    const clean = ctx.sanitizeImportedEditState(raw);
    expect(({} as any).polluted).toBeUndefined();
    expect(runInNewContext('({}).polluted', ctx)).toBeUndefined();
    expect('polluted' in clean.appOverrides[0]).toBe(false);
    // 名前は文字として残す（画面では文字として出す）。色は #rgb 以外を捨てる
    expect(clean.appOverrides).toEqual([{ id: 101, name: '<img src=x onerror=alert(1)>' }, { id: 102, color: '#abc' }]);
    expect(clean.fieldOverrides).toEqual([{ appId: 113, path: 'b', patch: { label: 'B', required: true } }]);
    expect(clean.relationOverrides).toEqual([{ appId: 113, ri: 3, patch: { kind: 'REF' } }]);
    expect(clean.customApps).toEqual([{ id: -3, name: '手動', fields: [expect.objectContaining({ code: 'c', label: 'C', type: 'SINGLE_LINE_TEXT' })] }]);
    expect(clean.customRelations).toEqual([]);
    expect(clean.notes).toEqual([{ text: 'メモ', color: '#fef08a', x: 1, y: 2 }]);
    expect(clean.positions).toEqual([{ node: { kind: 'app', appId: 4 }, pos: { x: 1, y: 2 } }]);
    expect(clean.removedNodes).toEqual([]);
    expect(clean.pinnedNodes).toEqual([{ kind: 'app', appId: 5 }]);
    expect(clean.hiddenFields).toEqual([{ appId: 113, path: 'c' }]);
    expect(clean.invalid).toBeGreaterThanOrEqual(10);
    // 何も入っていない・形の違う値でも止まらない
    expect(ctx.sanitizeImportedEditState(null)).toMatchObject({ version: 1, customApps: [], positions: [] });
    expect(ctx.sanitizeImportedEditState({ view: [], customApps: {}, notes: 'x' })).toMatchObject({ customApps: [], notes: [], positions: [] });
  });

  it('図に要素を足す編集（手動のアプリ・項目・関連線・メモ）は上限までだけ読み、超えた件数を数える（大量の要素で画面を固めない）', () => {
    // 手動のアプリ 2 万件の細工したファイルは、取り込みで 8 分以上画面が固まり、4GB を超えるメモリを使った（上限を設ける前）
    const n = 20000;
    const raw = {
      stateVersion: 2,
      customApps: Array.from({ length: n }, (_, i) => ({ id: -(i + 1), name: `m${i}`, fields: [{ code: 'f', label: 'F', type: 'SINGLE_LINE_TEXT' }] })),
      customFields: Array.from({ length: n }, (_, i) => ({ appId: 1, field: { code: `f${i}`, label: 'F', type: 'SINGLE_LINE_TEXT' } })),
      customRelations: Array.from({ length: n }, (_, i) => ({ fromAppId: 1, rel: { toApp: 2, kind: 'LOOKUP', fromLabel: `r${i}` } })),
      notes: Array.from({ length: n }, (_, i) => ({ text: `note ${i}`, x: i, y: i })),
      // 図にあるアプリへの位置・削除・固定は、要素を足さないので今までどおり読む
      view: { positions: Object.fromEntries(Array.from({ length: n }, (_, i) => [`a${i + 1}`, { x: i, y: i }])) }
    };
    const clean = ctx.sanitizeImportedEditState(raw);
    const limits = runInNewContext('ER_IMPORT_ELEMENT_LIMITS', ctx);
    expect(limits).toEqual({ customApps: 1000, customFields: 5000, customRelations: 5000, notes: 2000 });
    expect(clean.customApps).toHaveLength(1000);
    expect(clean.customApps[999].name).toBe('m999');
    expect(clean.customFields).toHaveLength(5000);
    expect(clean.customRelations).toHaveLength(5000);
    expect(clean.notes).toHaveLength(2000);
    expect(clean.positions).toHaveLength(n);
    expect(clean.overLimit).toBe((n - 1000) + (n - 5000) * 2 + (n - 2000));
    expect(clean.invalid).toBe(0);
    // ふつうの件数は今までどおり全部読み、数えない
    expect(ctx.sanitizeImportedEditState({ customApps: [{ id: -1, name: 'a', fields: [] }], notes: [{ text: 'x', x: 0, y: 0 }] }).overLimit).toBe(0);
  });

  it('関連線は、関連の種類・項目・参照先で今の図と対応させる（並びが変わっても、同じ印は出てくる順で）', () => {
    const oldApps = [app(113, '案件', [lookup('customer', 101), ref('quotes', 102), action('受注へ', 104, 0), action('受注へ', 104, 1)])];
    const curApps = [app(113, '案件', [action('受注へ', 104, 0), ref('quotes', 102), action('受注へ', 104, 1), lookup('customer', 101), lookup('added', 105)])];
    const oldIndex = ctx.relationSignatureIndex(oldApps);
    const curIndex = ctx.relationSignatureIndex(curApps);
    expect([0, 1, 2, 3].map((ri) => ctx.mapImportedRelationIndex(oldIndex, curIndex, 113, ri))).toEqual([3, 1, 0, 2]);
    // 元の図に無い順番（手動で追加した線）・今の図に無いアプリ・対応の無い関連は -1
    expect(ctx.mapImportedRelationIndex(oldIndex, curIndex, 113, 4)).toBe(-1);
    expect(ctx.mapImportedRelationIndex(oldIndex, curIndex, 999, 0)).toBe(-1);
    const removed = ctx.relationSignatureIndex([app(113, '案件', [ref('quotes', 102)])]);
    expect(ctx.mapImportedRelationIndex(oldIndex, removed, 113, 0)).toBe(-1);
    // 手動で追加したアプリ（負の ID）は元の図のデータに入れない
    expect(ctx.relationSignatureIndex([{ id: -1, relations: [lookup('x', 1)] }]).size).toBe(0);
  });
});
