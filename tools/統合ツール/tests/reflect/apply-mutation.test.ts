import { describe, it, expect } from 'vitest';
import {
  getByTokens,
  setByTokens,
  deleteByTokens,
  itemKeySignature,
  findArrayIndexByKey,
  resolveArrayKeyValue,
  applyArrayRowByKey,
  applyDiffRowToSection,
  compareTokensForDelete,
  sortRowsForPatch,
  extractFieldCodeFromRowPath,
  filterWritableFieldProps,
  convertLookupAppIds,
  extractReferencedAppIds
} from '../../src/reflect/apply';
import { tokenizePath } from '../../src/utils';

// reflectRowDesiredValue は state.reflectNodeModes 未設定なら 'src' 扱いで row.left を返す。
// 本テストでは left=desired, left:undefined=削除 という前提で行を組む。

describe('reflect/apply mutation primitives', () => {
  describe('getByTokens', () => {
    it('walks object and array tokens', () => {
      const root = { a: { b: [{ c: 1 }, { c: 2 }] } };
      expect(getByTokens(root, ['a', 'b', 1, 'c'])).toBe(2);
    });

    it('returns undefined for out-of-range array index', () => {
      expect(getByTokens({ a: [1] }, ['a', 5])).toBeUndefined();
    });

    it('returns undefined for missing key (does not fall through prototype)', () => {
      expect(getByTokens({}, ['toString'])).toBeUndefined();
    });

    it('returns undefined for an absent string key on an array', () => {
      expect(getByTokens({ a: [1, 2] }, ['a', 'missing'])).toBeUndefined();
    });
  });

  describe('setByTokens', () => {
    it('sets a deep value, creating intermediate objects', () => {
      const root: any = {};
      setByTokens(root, ['a', 'b', 'c'], 42);
      expect(root.a.b.c).toBe(42);
    });

    it('creates intermediate arrays when the next token is numeric', () => {
      const root: any = {};
      setByTokens(root, ['list', 0, 'name'], 'x');
      expect(Array.isArray(root.list)).toBe(true);
      expect(root.list[0]).toEqual({ name: 'x' });
    });

    it('deep-clones the value so later mutation does not leak in', () => {
      const root: any = {};
      const value = { nested: { n: 1 } };
      setByTokens(root, ['k'], value);
      value.nested.n = 999;
      expect(root.k.nested.n).toBe(1);
    });

    it('returns a clone of value when tokens are empty', () => {
      const value = { a: 1 };
      const out = setByTokens(null, [], value);
      expect(out).toEqual(value);
      expect(out).not.toBe(value);
    });
  });

  describe('deleteByTokens', () => {
    it('deletes an object key', () => {
      const root: any = { a: { b: 1, c: 2 } };
      const res = deleteByTokens(root, ['a', 'b']);
      expect(res.deleted).toBe(true);
      expect(root.a).toEqual({ c: 2 });
    });

    it('splices an array element (shifting later items)', () => {
      const root: any = { list: ['x', 'y', 'z'] };
      const res = deleteByTokens(root, ['list', 1]);
      expect(res.deleted).toBe(true);
      expect(root.list).toEqual(['x', 'z']);
    });

    it('reports deleted:false for a missing path without throwing', () => {
      const root: any = { a: {} };
      expect(deleteByTokens(root, ['a', 'missing']).deleted).toBe(false);
      expect(deleteByTokens(root, ['nope', 'x']).deleted).toBe(false);
    });

    it('reports deleted:false for an out-of-range index', () => {
      expect(deleteByTokens({ list: ['x'] }, ['list', 9]).deleted).toBe(false);
    });
  });
});

describe('reflect/apply array key matching', () => {
  it('itemKeySignature distinguishes type from string form', () => {
    expect(itemKeySignature(1)).not.toBe(itemKeySignature('1'));
    expect(itemKeySignature('1')).toBe('string:1');
  });

  it('findArrayIndexByKey matches by signature first, then string fallback', () => {
    const arr = [{ code: 'A' }, { code: 'B' }, { code: 100 }];
    expect(findArrayIndexByKey(arr, 'code', 'B')).toBe(1);
    // numeric stored value, string query -> string fallback still matches
    expect(findArrayIndexByKey(arr, 'code', '100')).toBe(2);
    expect(findArrayIndexByKey(arr, 'code', 'missing')).toBe(-1);
  });

  it('findArrayIndexByKey returns -1 for non-array or empty key', () => {
    expect(findArrayIndexByKey(null as any, 'code', 'A')).toBe(-1);
    expect(findArrayIndexByKey([{ code: 'A' }], '', 'A')).toBe(-1);
  });

  it('resolveArrayKeyValue reads explicit arrayKey/arrayKeyValue', () => {
    const row: any = { arrayKey: 'code', arrayKeyValue: 'X' };
    expect(resolveArrayKeyValue(row, { code: 'Y' })).toEqual({ key: 'code', value: 'X' });
  });

  it('resolveArrayKeyValue falls back to desired object when no explicit value', () => {
    const row: any = { arrayKey: 'code' };
    expect(resolveArrayKeyValue(row, { code: 'Z' })).toEqual({ key: 'code', value: 'Z' });
  });

  it('resolveArrayKeyValue infers a key from candidate fields when arrayKey is absent', () => {
    const row: any = { left: { entity: { code: 'user1' }, name: 'n' } };
    // ARRAY_KEY_FALLBACK_CANDIDATES prioritises 'name' over 'entity' object
    const out = resolveArrayKeyValue(row, undefined);
    expect(out.key).toBe('name');
    expect(out.value).toBe('n');
  });

  it('applyArrayRowByKey replaces a matched array item in place by key', () => {
    const section: any = { views: [{ code: 'v1', x: 1 }, { code: 'v2', x: 2 }] };
    const tokens = tokenizePath('views[0]');
    const row: any = { _id: 'r1', arrayKey: 'code', left: { code: 'v2', x: 99 } };
    const res = applyArrayRowByKey(section, row, tokens, { code: 'v2', x: 99 });
    expect(res?.applied).toBe(true);
    // matched index 1 is removed and reinserted (no duplicate, stays one v2)
    expect(section.views.filter((v: any) => v.code === 'v2')).toHaveLength(1);
    expect(section.views.find((v: any) => v.code === 'v2').x).toBe(99);
  });

  it('applyArrayRowByKey deletes by key when desired is undefined', () => {
    const section: any = { items: [{ id: 'a' }, { id: 'b' }] };
    const tokens = tokenizePath('items[0]');
    const row: any = { _id: 'r1', arrayKey: 'id', arrayKeyValue: 'a' };
    const res = applyArrayRowByKey(section, row, tokens, undefined);
    expect(res?.op).toBe('delete');
    expect(res?.applied).toBe(true);
    expect(section.items).toEqual([{ id: 'b' }]);
  });

  it('applyArrayRowByKey reports not-found delete without mutating', () => {
    const section: any = { items: [{ id: 'a' }] };
    const tokens = tokenizePath('items[0]');
    const row: any = { _id: 'r1', arrayKey: 'id', arrayKeyValue: 'zzz' };
    const res = applyArrayRowByKey(section, row, tokens, undefined);
    expect(res?.applied).toBe(false);
    expect(section.items).toEqual([{ id: 'a' }]);
  });
});

describe('reflect/apply applyDiffRowToSection', () => {
  it('sets a scalar at a relative path', () => {
    const section: any = { properties: {} };
    const row: any = { _id: 'r1', path: 'fieldSettings.properties.name', left: 'hello' };
    const res = applyDiffRowToSection(section, row, 'fieldSettings');
    expect(res.applied).toBe(true);
    expect(section.properties.name).toBe('hello');
  });

  it('returns path-mismatch skip when row belongs to another section', () => {
    const section: any = {};
    const row: any = { _id: 'r1', path: 'viewSettings.views', left: 'x' };
    const res = applyDiffRowToSection(section, row, 'fieldSettings');
    expect(res.applied).toBe(false);
    expect(res.op).toBe('skip');
  });

  it('replaces the whole section when the row path equals the section key', () => {
    const row: any = { _id: 'r1', path: 'fieldSettings', left: { properties: { a: 1 } } };
    const res = applyDiffRowToSection({ old: true }, row, 'fieldSettings');
    expect(res.op).toBe('set');
    expect(res.section).toEqual({ properties: { a: 1 } });
  });

  it('deletes a key when desired value is undefined', () => {
    const section: any = { properties: { drop: { type: 'TEXT' } } };
    const row: any = { _id: 'r1', path: 'fieldSettings.properties.drop' }; // no left -> undefined desired
    const res = applyDiffRowToSection(section, row, 'fieldSettings');
    expect(res.op).toBe('delete');
    expect(res.applied).toBe(true);
    expect(section.properties.drop).toBeUndefined();
  });
});

describe('reflect/apply delete ordering', () => {
  it('compareTokensForDelete orders deeper/later array indices first', () => {
    // deleting higher indices before lower keeps earlier indices valid
    expect(compareTokensForDelete(['a', 5], ['a', 2])).toBeLessThan(0);
    expect(compareTokensForDelete(['a', 2], ['a', 5])).toBeGreaterThan(0);
  });

  it('compareTokensForDelete sorts numeric tokens before string siblings', () => {
    expect(compareTokensForDelete([1], ['x'])).toBeLessThan(0);
    expect(compareTokensForDelete(['x'], [1])).toBeGreaterThan(0);
  });

  it('sortRowsForPatch puts deletes first and orders array deletes high-index-first', () => {
    const rows: any[] = [
      { _id: 's1', path: 'viewSettings.views.a', left: 'set' },
      { _id: 'd1', path: 'viewSettings.list[1]' },        // delete idx 1
      { _id: 'd2', path: 'viewSettings.list[4]' }         // delete idx 4
    ];
    const sorted = sortRowsForPatch(rows, 'viewSettings');
    // deletes precede the set
    expect(sorted[0]._id).toBe('d2'); // idx 4 first
    expect(sorted[1]._id).toBe('d1'); // then idx 1
    expect(sorted[2]._id).toBe('s1'); // set last
  });
});

describe('reflect/apply field helpers', () => {
  it('extractFieldCodeFromRowPath returns the field code under properties', () => {
    expect(extractFieldCodeFromRowPath({ path: 'fieldSettings.properties.金額.label' } as any)).toBe('金額');
  });

  it('extractFieldCodeFromRowPath returns null for non-field paths', () => {
    expect(extractFieldCodeFromRowPath({ path: 'viewSettings.views' } as any)).toBeNull();
    expect(extractFieldCodeFromRowPath({ path: 'fieldSettings.properties' } as any)).toBeNull();
  });

  it('filterWritableFieldProps strips system field types when skipSystem is true', () => {
    const props = {
      title: { type: 'SINGLE_LINE_TEXT' },
      $id: { type: 'RECORD_NUMBER' },
      status: { type: 'STATUS' },
      created: { type: 'CREATED_TIME' }
    };
    const out = filterWritableFieldProps(props, true);
    expect(Object.keys(out)).toEqual(['title']);
  });

  it('filterWritableFieldProps keeps everything (cloned) when skipSystem is false', () => {
    const props = { status: { type: 'STATUS' }, title: { type: 'SINGLE_LINE_TEXT' } };
    const out = filterWritableFieldProps(props, false);
    expect(Object.keys(out).sort()).toEqual(['status', 'title']);
    expect(out).not.toBe(props);
  });
});

describe('reflect/apply lookup app remapping', () => {
  it('convertLookupAppIds rewrites relatedApp.app via the map and flags change', () => {
    const field = { type: 'NUMBER', lookup: { relatedApp: { app: '10' } } };
    const res = convertLookupAppIds(field, { '10': '20' });
    expect(res.changed).toBe(true);
    expect(res.def.lookup.relatedApp.app).toBe('20');
  });

  it('convertLookupAppIds leaves unmapped or same-target ids untouched', () => {
    const field = { type: 'NUMBER', lookup: { relatedApp: { app: '10' } } };
    expect(convertLookupAppIds(field, { '10': '10' }).changed).toBe(false);
    expect(convertLookupAppIds(field, { '99': '5' }).changed).toBe(false);
  });

  it('convertLookupAppIds recurses into SUBTABLE fields', () => {
    const field = {
      type: 'SUBTABLE',
      fields: { inner: { type: 'NUMBER', lookup: { relatedApp: { app: '3' } } } }
    };
    const res = convertLookupAppIds(field, { '3': '7' });
    expect(res.changed).toBe(true);
    expect(res.def.fields.inner.lookup.relatedApp.app).toBe('7');
  });

  it('convertLookupAppIds does not mutate the input field', () => {
    const field = { type: 'NUMBER', lookup: { relatedApp: { app: '10' } } };
    convertLookupAppIds(field, { '10': '20' });
    expect(field.lookup.relatedApp.app).toBe('10');
  });
});

describe('reflect/apply extractReferencedAppIds', () => {
  it('collects lookup, related-record and action references with converted ids', () => {
    const bundle = {
      sections: {
        fieldSettings: {
          properties: {
            lk: { lookup: { relatedApp: { app: '10' } } },
            rt: { referenceTable: { relatedApp: { app: '11' } } },
            tbl: { type: 'SUBTABLE', fields: { inner: { lookup: { relatedApp: { app: '12' } } } } }
          }
        },
        actionSettings: { actions: { 'コピー': { destApp: { app: '99' } } } }
      }
    };
    const refs = extractReferencedAppIds(bundle, [], { '10': '20' });
    const byApp = Object.fromEntries(refs.map((r: any) => [r.refAppId, r]));
    expect(byApp['10'].convertedAppId).toBe('20');
    expect(byApp['11'].convertedAppId).toBeNull();
    expect(byApp['12'].fieldCode).toBe('tbl > inner');
    expect(byApp['99'].section).toBe('アクション設定');
  });

  it('respects scope filtering (fields only)', () => {
    const bundle = {
      sections: {
        fieldSettings: { properties: { lk: { lookup: { relatedApp: { app: '10' } } } } },
        actionSettings: { actions: { a: { destApp: { app: '99' } } } }
      }
    };
    const refs = extractReferencedAppIds(bundle, ['fieldSettings'], {});
    expect(refs.map((r: any) => r.refAppId)).toEqual(['10']);
  });
});
