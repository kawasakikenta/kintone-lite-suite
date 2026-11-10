import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { appendLookupMapCandidates, describeLookupCandidate, findLookupMapCandidates, hasLookupCandidates } from '../../src/reflect/lookupCandidates';
import { parseLookupMapText } from '../../src/reflect/liteSetup';
import { previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';
import { copy, createRolloutWorld, lookup, reference, row, text } from './rollout-world';

const fields = (...defs: any[]) => ({ properties: Object.fromEntries(defs.map(def => [def.code, def])) });

describe('参照先変換の候補（純粋関数）', () => {
  it('同じコードのルックアップの参照先が食い違うとき、反映先の現在の参照先を候補にする', () => {
    const result = findLookupMapCandidates({
      sourceFields: fields(lookup('customer', 101), text('memo')), targetFields: fields(lookup('customer', 201), text('memo')),
      fieldLabels: { customer: '顧客' }
    });
    expect(result).toEqual({ candidates: [{ from: '101', to: '201', total: 1, sources: ['ルックアップ「顧客（customer）」'] }], conflicts: [] });
    expect(hasLookupCandidates(result)).toBe(true);
  });

  it('関連レコード一覧・テーブル内のルックアップ・アクションのコピー先も同じ規則で読み取る', () => {
    const result = findLookupMapCandidates({
      sourceFields: fields(reference('rel', 101), { type: 'SUBTABLE', code: 'items', fields: { product: lookup('product', 102) } }),
      targetFields: fields(reference('rel', 201), { type: 'SUBTABLE', code: 'items', fields: { product: lookup('product', 202) } }),
      sourceActions: { actions: { 'コピー': { name: 'コピー', destApp: { app: '103', code: '' } } } },
      targetActions: { actions: { 'コピー': { name: 'コピー', destApp: { app: '203', code: '' } } } }
    });
    expect(result.candidates.map(item => [item.from, item.to, item.sources])).toEqual([
      ['101', '201', ['関連レコード一覧「rel」']], ['102', '202', ['ルックアップ「product」']], ['103', '203', ['アクション「コピー」']]
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it('同じ旧IDに複数の参照先があるときは食い違いとして示し、候補にしない', () => {
    const result = findLookupMapCandidates({
      sourceFields: fields(lookup('a', 101), lookup('b', 101), lookup('c', 101)),
      targetFields: fields(lookup('a', 201), lookup('b', 202), lookup('c', 201))
    });
    expect(result.candidates).toEqual([]);
    expect(result.conflicts).toEqual([{ from: '101', targets: [
      { to: '201', total: 2, sources: ['ルックアップ「a」', 'ルックアップ「c」'] },
      { to: '202', total: 1, sources: ['ルックアップ「b」'] }
    ] }]);
  });

  it('反映先に反映元と同じ参照先のフィールドも混ざるときは、変換すると差分が増えるので食い違いにする', () => {
    const result = findLookupMapCandidates({
      sourceFields: fields(lookup('a', 101), lookup('b', 101)),
      targetFields: fields(lookup('a', 201), lookup('b', 101))
    });
    expect(result.candidates).toEqual([]);
    expect(result.conflicts.map(item => [item.from, item.targets.map(target => target.to)])).toEqual([['101', ['101', '201']]]);
  });

  it('参照先が同じ・片方にしか無いフィールド・反映先に無いフィールドは候補にしない（推測しない）', () => {
    const result = findLookupMapCandidates({
      sourceFields: fields(lookup('same', 101), lookup('onlySource', 102), text('plain'), lookup('added', 104)),
      targetFields: fields(lookup('same', 101), text('onlySource'), lookup('plain', 203), lookup('other', 204))
    });
    expect(result).toEqual({ candidates: [], conflicts: [] });
    expect(hasLookupCandidates(result)).toBe(false);
  });

  it('入力済みの参照先変換の旧IDは、変換先が違っても上書きの候補にしない', () => {
    const input = { sourceFields: fields(lookup('a', 101), lookup('b', 102)), targetFields: fields(lookup('a', 201), lookup('b', 202)) };
    expect(findLookupMapCandidates({ ...input, lookupMap: { '101': '999' } }).candidates.map(item => item.from)).toEqual(['102']);
  });

  it('根拠の名前は 5 件までにして、残りは件数で示す', () => {
    const sourceDefs = Array.from({ length: 8 }, (_, i) => lookup(`f${i}`, 101));
    const targetDefs = Array.from({ length: 8 }, (_, i) => lookup(`f${i}`, 201));
    const [candidate] = findLookupMapCandidates({ sourceFields: fields(...sourceDefs), targetFields: fields(...targetDefs) }).candidates;
    expect(candidate.total).toBe(8);
    expect(candidate.sources).toHaveLength(5);
    expect(describeLookupCandidate(candidate, { from: '開発マスタ', to: '本番マスタ' })).toBe('101（開発マスタ） → 201（本番マスタ）（ルックアップ「f0」、ルックアップ「f1」、ルックアップ「f2」、ルックアップ「f3」、ルックアップ「f4」 ほか 3 件）');
  });

  it('取得できていない側がある・形式が不正なときは何も返さない', () => {
    expect(findLookupMapCandidates({})).toEqual({ candidates: [], conflicts: [] });
    expect(findLookupMapCandidates({ sourceFields: fields(lookup('a', 101)), targetFields: { properties: null } })).toEqual({ candidates: [], conflicts: [] });
    expect(findLookupMapCandidates({ sourceFields: fields({ ...lookup('a', 101), lookup: { relatedApp: { app: 'abc' } } }), targetFields: fields(lookup('a', 201)) })).toEqual({ candidates: [], conflicts: [] });
  });
});

describe('参照先変換の入力欄へ候補を加える', () => {
  const pairs = [{ from: '101', to: '201' }, { from: '102', to: '202' }];
  it('入力済みの行を残して、候補を「旧ID → 新ID」の行で加える', () => {
    const { text: next, added } = appendLookupMapCandidates('103 → 203', pairs);
    expect(added).toBe(2);
    expect(next).toBe('103 → 203\n101 → 201\n102 → 202');
    const parsed = parseLookupMapText(next);
    expect(parsed.ok && parsed.value).toEqual({ '101': '201', '102': '202', '103': '203' });
  });
  it('空の入力欄にはそのまま加える', () => {
    expect(appendLookupMapCandidates('', pairs).text).toBe('101 → 201\n102 → 202');
  });
  it('入力済みの旧IDは上書きせず、加えた件数に数えない', () => {
    expect(appendLookupMapCandidates('101 = 999\n', pairs)).toEqual({ text: '101 = 999\n102 → 202', added: 1 });
    expect(appendLookupMapCandidates('101 -> 201\n102: 202', pairs)).toEqual({ text: '101 -> 201\n102: 202', added: 0 });
  });
  it('JSON 形式の入力欄には JSON のまま加える', () => {
    const { text: next, added } = appendLookupMapCandidates('{"103":"203","101":"999"}', pairs);
    expect(added).toBe(1);
    const parsed = parseLookupMapText(next);
    expect(parsed.ok && parsed.value).toEqual({ '101': '999', '102': '202', '103': '203' });
  });
});

describe('参照先変換が空のまま、参照先が違うルックアップを反映する（実エンジン＋合成 kintone）', () => {
  afterEach(() => vi.unstubAllGlobals());

  // 反映元 #1 は開発用（開発用マスタ #101 を参照）、反映先 #2 は本番用（本番用マスタ #201 を参照）。
  const world = (extra: Record<string, any> = {}) => createRolloutWorld({
    '1': { name: '顧客管理（開発）', production: { fieldSettings: fields(text('name', { label: '顧客名' }), lookup('customer', 101), reference('rel', 101)), layoutSettings: { layout: [row('name', 'customer')] }, actionSettings: { actions: { 'コピー': { name: 'コピー', index: '0', destApp: { app: '101', code: '' }, mappings: [], entities: [], filterCond: '' } } } } },
    '2': { name: '顧客管理', production: { fieldSettings: fields(text('name', { label: '顧客名' }), lookup('customer', 201), reference('rel', 201)), layoutSettings: { layout: [row('name', 'customer')] }, actionSettings: { actions: { 'コピー': { name: 'コピー', index: '0', destApp: { app: '201', code: '' }, mappings: [], entities: [], filterCond: '' } } } } },
    '101': { name: '開発用マスタ', production: {} },
    '201': { name: '本番用マスタ', production: {} },
    ...extra
  });
  const opts = { sourceAppId: '1', targetAppId: '2', scopes: ['fieldSettings', 'actionSettings'] };

  it('現状の確認: 参照先変換が空だと、差分は参照先アプリの食い違いになり、反映すると開発用マスタを指すよう書き込まれる', async () => {
    const kintone = world();
    kintone.install();
    const preview = await previewReflectStandalone(opts, () => {});
    const fieldEntry = preview.entries.find(entry => entry.sectionKey === 'fieldSettings')!;
    expect(fieldEntry.status).toBe('change');
    expect(fieldEntry.changes.map(change => change.path)).toEqual(expect.arrayContaining(['フィールド / customer / lookup / relatedApp / app', 'フィールド / rel / referenceTable / relatedApp / app']));
    const result = await runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline, doBackup: false }, () => {}, () => {});
    expect(result.sections.map(section => section.status)).toEqual(['ok', 'ok']);
    const put = kintone.writes().find(call => call.method === 'PUT' && call.url.endsWith('/form/fields.json'))!;
    expect(put.params.properties.customer.lookup.relatedApp.app).toBe('101');
    expect(kintone.state['2'].preview.fieldSettings.properties.customer.lookup.relatedApp.app).toBe('101');
  });

  it('候補として「101 → 201」を返す（反映先の現在の設定だけが根拠。食い違いは無い）', async () => {
    world().install();
    const preview = await previewReflectStandalone(opts, () => {});
    expect(preview.lookupCandidates?.conflicts).toEqual([]);
    expect(preview.lookupCandidates?.candidates.map(item => [item.from, item.to, item.total])).toEqual([['101', '201', 3]]);
    expect(preview.lookupCandidates?.candidates[0].sources).toEqual(['ルックアップ「customer」', '関連レコード一覧「rel」', 'アクション「コピー」']);
  });

  it('候補を参照先変換に入れて取り直すと、差分がなくなり、候補も出ない', async () => {
    const kintone = world();
    kintone.install();
    const first = await previewReflectStandalone(opts, () => {});
    const { text: mapText } = appendLookupMapCandidates('', first.lookupCandidates!.candidates);
    const parsed = parseLookupMapText(mapText);
    const lookupMap = parsed.ok ? parsed.value : {};
    const second = await previewReflectStandalone({ ...opts, lookupMap }, () => {});
    expect(second.entries.map(entry => entry.status)).toEqual(['same', 'same']);
    expect(second.lookupCandidates).toBeUndefined();
  });

  it('利用者が入れた別の変換は上書きせず、候補にもしない', async () => {
    world({ '999': { name: '別のマスタ', production: {} } }).install();
    const preview = await previewReflectStandalone({ ...opts, lookupMap: { '101': '999' } }, () => {});
    expect(preview.lookupCandidates).toBeUndefined();
    const fieldEntry = preview.entries.find(entry => entry.sectionKey === 'fieldSettings')!;
    expect(fieldEntry.changes.some(change => change.after === '999')).toBe(true);
  });

  it('項目にフィールド設定もアクション設定も含めないときは、候補を求めない', async () => {
    world().install();
    const preview = await previewReflectStandalone({ ...opts, scopes: ['layoutSettings'] }, () => {});
    expect(preview.lookupCandidates).toBeUndefined();
  });

  it('食い違い（同じ旧IDに複数の参照先）は結果に載せ、候補にはしない', async () => {
    const kintone = world();
    kintone.state['2'].preview.fieldSettings.properties.rel.referenceTable.relatedApp.app = '202';
    kintone.install();
    const preview = await previewReflectStandalone({ ...opts, scopes: ['fieldSettings'] }, () => {});
    expect(preview.lookupCandidates?.candidates).toEqual([]);
    expect(preview.lookupCandidates?.conflicts.map(item => [item.from, item.targets.map(target => target.to)])).toEqual([['101', ['201', '202']]]);
  });

  it('設定JSONを反映元にしたときも同じ候補を返す', async () => {
    const kintone = world();
    kintone.install();
    const sourceBundle = { appId: '1', sections: copy(kintone.state['1'].production) };
    const preview = await previewReflectStandalone({ sourceAppId: '1', sourceBundle, targetAppId: '2', scopes: ['fieldSettings'] }, () => {});
    expect(preview.lookupCandidates?.candidates.map(item => [item.from, item.to])).toEqual([['101', '201']]);
  });
});
