import { describe, expect, it } from 'vitest';
import {
  computeDiffRows,
  encodeExactIgnorePathRule,
  formatIgnoreRuleForDisplay,
  formatIgnoreRulesTextForDisplay
} from '../../src/diff/engine';

const bundle = (section: string, value: any) => ({ sections: { [section]: value } });
const specialNames = [
  '営業.revision',
  '営業.modifier',
  '営業.revision[0]',
  '営業[revision]',
  '営業]一覧.revision',
  '営業["revision"]',
  '営業"一覧.revision',
  '営業\\一覧.revision'
];
const view = (name: string, filterCond: string, revision = '1') => ({
  revision,
  views: { [name]: { name, type: 'LIST', fields: ['amount'], filterCond, index: '0', revision } }
});

// These names are legal setting identifiers, while revision within their body is metadata.
describe('diff/engine: structural ignore context', () => {
  it.each(['営業一覧', ...specialNames])('detects the condition change under view %s and ignores actual metadata', (name) => {
    const result = computeDiffRows(
      bundle('viewSettings', view(name, 'amount > 100', '1')),
      bundle('viewSettings', view(name, 'amount > 200', '2')),
      ['viewSettings'], ''
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      type: 'changed', path: `viewSettings.views.${name}.filterCond`,
      left: 'amount > 100', right: 'amount > 200'
    });
    expect(result.truncation.actualDiffIncomplete).toBe(false);
  });

  it.each(specialNames)('keeps removal of a view %s separate from an actual revision property', (name) => {
    const result = computeDiffRows(
      bundle('viewSettings', view(name, 'amount > 100', '1')),
      bundle('viewSettings', { revision: '2', views: {} }),
      ['viewSettings'], ''
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ type: 'removed', path: `viewSettings.views.${name}` });
  });

  it('distinguishes a dotted identifier from the real metadata property with the same display path', () => {
    const source = { views: {
      営業: { name: '営業', type: 'LIST', revision: '1' },
      '営業.revision': { name: '営業.revision', type: 'LIST', filterCond: 'amount > 100' }
    } };
    const target = { views: { 営業: { name: '営業', type: 'LIST', revision: '2' } } };
    const result = computeDiffRows(bundle('viewSettings', source), bundle('viewSettings', target), ['viewSettings'], '');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ type: 'removed', path: 'viewSettings.views.営業.revision' });
  });

  it.each([false, true])('preserves special option identifiers in a subtable=%s', (subtable) => {
    const field = (index: string) => ({
      type: 'DROP_DOWN', code: 'status', label: '状態',
      options: { 'v1["x"].revision': { label: 'v1["x"].revision', index } }
    });
    const properties = (index: string) => subtable
      ? { lineItems: { type: 'SUBTABLE', code: 'lineItems', fields: { status: field(index) } } }
      : { status: field(index) };
    const result = computeDiffRows(
      bundle('fieldSettings', { properties: properties('0') }),
      bundle('fieldSettings', { properties: properties('1') }),
      ['fieldSettings'], ''
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ type: 'changed', left: '0', right: '1' });
    expect(result.rows[0].path).toBe(`fieldSettings.properties.${subtable ? 'lineItems.fields.' : ''}status.options.v1["x"].revision.index`);
  });

  it('preserves array comparison under a name that contains an apparent array index', () => {
    const name = '営業.revision[0]';
    const source = view(name, '');
    const target = view(name, '');
    target.views[name].fields = ['owner', 'amount'];
    const result = computeDiffRows(bundle('viewSettings', source), bundle('viewSettings', target), ['viewSettings'], '');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ type: 'added', path: `viewSettings.views.${name}.fields[0]`, right: 'owner' });
  });

  it.each(specialNames)('still applies explicit literal path exclusions to view %s', (name) => {
    const result = computeDiffRows(
      bundle('viewSettings', view(name, 'amount > 100')),
      bundle('viewSettings', view(name, 'amount > 200')),
      ['viewSettings'], encodeExactIgnorePathRule(`viewSettings.views.${name}.filterCond`)
    );
    expect(result.rows).toHaveLength(0);
  });

  it.each(['営業]一覧', '営業].一覧', '営業["一覧"]', '営業"一覧'])('keeps environment-ID normalization for %s', (name) => {
    const source = { views: { [name]: { name, id: '1', type: 'LIST' } } };
    const target = { views: { [name]: { name, id: '2', type: 'LIST' } } };
    const result = computeDiffRows(
      bundle('viewSettings', source), bundle('viewSettings', target), ['viewSettings'], '',
      { normalizationPresetState: { appReferences: true } }
    );
    expect(result.rows).toHaveLength(0);
  });

  it('keeps a specially named option when order normalization removes only its index property', () => {
    const source = { properties: { status: { type: 'DROP_DOWN', code: 'status', options: {
      'v1["x"].index': { label: 'v1["x"].index', index: '0' }
    } } } };
    const target = { properties: { status: { type: 'DROP_DOWN', code: 'status', options: {} } } };
    const result = computeDiffRows(
      bundle('fieldSettings', source), bundle('fieldSettings', target), ['fieldSettings'], '',
      { normalizationPresetState: { fieldOrder: true } }
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ type: 'removed', left: { label: 'v1["x"].index' } });
  });
});

const notification = (title: string, filterCond: string) => ({
  title, filterCond,
  targets: [{ entity: { type: 'USER', code: 'user1' }, includeSubs: false }]
});
const originalNotifications = () => [notification('今月', 'amount > 100'), notification('承認待ち', 'amount > 1000')];

describe.each(['perRecordNotifications', 'reminderNotifications'])('diff/engine: ignored notification identity in %s', (section) => {
  const compare = (target: any[], ignore = 'title') => computeDiffRows(
    bundle(section, { notifications: originalNotifications() }),
    bundle(section, { notifications: target }), [section], ignore
  );

  it.each(['title', '*.title'])('keeps only the condition change when using ignore rule %s', (ignore) => {
    const target = [notification('今月のお知らせ', 'amount > 100'), notification('承認待ち', 'amount > 2000')];
    const result = compare(target, ignore);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      type: 'changed', path: `${section}.notifications[1].filterCond`,
      left: 'amount > 1000', right: 'amount > 2000'
    });
    expect(result.matchingNotices.items).toHaveLength(0);
  });

  it('treats an ignored title-only change as equal', () => {
    expect(compare([notification('今月のお知らせ', 'amount > 100'), notification('承認待ち', 'amount > 1000')]).rows).toHaveLength(0);
  });

  it('still detects a simultaneous title and condition change in the same notification', () => {
    const result = compare([notification('今月のお知らせ', 'amount > 500'), notification('承認待ち', 'amount > 1000')]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ type: 'changed', path: `${section}.notifications[0].filterCond`, left: 'amount > 100', right: 'amount > 500' });
  });

  it('keeps pure order changes after an ignored title change', () => {
    const result = compare([notification('承認待ち', 'amount > 1000'), notification('今月のお知らせ', 'amount > 100')]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.type === 'changed' && row.moved)).toBe(true);
    expect(result.rows.map((row) => [row.movedFrom, row.movedTo])).toEqual([[0, 1], [1, 0]]);
  });

  it('detects both order and condition changes without false additions or removals', () => {
    const result = compare([notification('承認待ち', 'amount > 2000'), notification('今月のお知らせ', 'amount > 100')]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.filter((row) => row.moved)).toHaveLength(1);
    expect(result.rows.find((row) => !row.moved)).toMatchObject({ type: 'changed', path: `${section}.notifications[0].filterCond` });
    expect(result.rows.every((row) => row.type === 'changed')).toBe(true);
  });

  it('keeps actual notification additions and deletions', () => {
    const removed = compare([notification('承認待ち', 'amount > 1000')]);
    expect(removed.rows).toHaveLength(1);
    expect(removed.rows[0]).toMatchObject({ type: 'removed', left: notification('今月', 'amount > 100') });
    const added = compare([...originalNotifications(), notification('追加', 'amount > 3000')]);
    expect(added.rows).toHaveLength(1);
    expect(added.rows[0]).toMatchObject({ type: 'added', right: notification('追加', 'amount > 3000') });
  });

  it('retains title changes when the title is not ignored', () => {
    const result = compare([notification('今月のお知らせ', 'amount > 100'), notification('承認待ち', 'amount > 2000')], '');
    expect(result.rows.map((row) => row.type)).toEqual(['removed', 'changed', 'added']);
  });
});

describe('diff/engine: ignore rule display text', () => {
  it('turns the percent-encoded path: rule added from a result row back into readable text', () => {
    const rule = encodeExactIgnorePathRule('viewSettings.views.営業.一覧.filterCond');
    expect(rule).toContain('%');
    expect(formatIgnoreRuleForDisplay(rule)).toBe('path:viewSettings.views.営業.一覧.filterCond');
  });

  it('keeps ordinary rules and separators of the typed text unchanged', () => {
    const rule = encodeExactIgnorePathRule('fieldSettings.properties.メモ.label');
    expect(formatIgnoreRuleForDisplay('revision')).toBe('revision');
    expect(formatIgnoreRuleForDisplay('fieldSettings.*.label')).toBe('fieldSettings.*.label');
    expect(formatIgnoreRulesTextForDisplay(`revision, ${rule}\n*.description`))
      .toBe('revision, path:fieldSettings.properties.メモ.label\n*.description');
    expect(formatIgnoreRulesTextForDisplay('')).toBe('');
    expect(formatIgnoreRulesTextForDisplay('path:%E0%A4%A')).toBe('path:%E0%A4%A');
  });
});
