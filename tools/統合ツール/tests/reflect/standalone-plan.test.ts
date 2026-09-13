import { describe, expect, it } from 'vitest';
import { buildReflectSectionPlan as plan, reflectSelectionBlockers, listReflectFieldCodes } from '../../src/reflect/standalonePlan';

const field = (code: string, label = code) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false });
const view = (name: string, fields: string[] = [], index = '0') => ({ name, type: 'LIST', fields, index, filterCond: '', sort: '' });
const customization = (scope = 'ALL', js: any[] = []) => ({ scope, desktop: { js, css: [] }, mobile: { js: [], css: [] } });
const file = (key: string) => ({ type: 'FILE', file: { fileKey: key, name: 'app.js', size: '200' } });

describe('preview reflection plans match actual write effects', () => {
  it('skips fields which already match, and preserves target-only fields', () => {
    const result = plan('fieldSettings', { properties: { name: field('name') } }, { properties: { name: field('name'), local: field('local') } });
    expect(result.status).toBe('same'); expect(result.operations).toEqual([]);
    expect(result.changes.map(item => item.kind)).toEqual(['保持']);
    expect(result.fieldStats).toEqual({ add: 0, update: 0, tgtOnly: 1 });
  });
  it('shows the actual before and after values of changed settings', () => {
    const result = plan('fieldSettings', { properties: { name: field('name', '新しい名前') } }, { properties: { name: field('name', '旧名') } });
    expect(result.changes).toContainEqual({ kind: '変更', path: 'フィールド / name / 表示名', before: '旧名', after: '新しい名前' });
    expect(result.operations[0].method).toBe('PUT');
  });
  it('splits subtable additions from updates and preserves target-only child fields', () => {
    const source = { properties: { table: { type: 'SUBTABLE', code: 'table', label: '明細', fields: { added: field('added'), name: field('name', '新名') } } } };
    const target = { properties: { table: { type: 'SUBTABLE', code: 'table', label: '明細', fields: { name: field('name'), local: field('local') } } } };
    const frozen = structuredClone({ source, target });
    const result = plan('fieldSettings', source, target);
    expect(result.operations.map(item => item.method)).toEqual(['POST', 'PUT']);
    expect(Object.keys(result.operations[0].body.properties.table.fields)).toEqual(['added']);
    expect(Object.keys(result.operations[1].body.properties.table.fields)).toEqual(['name']);
    expect(result.changes.some(item => item.kind === '保持' && item.path.includes('local'))).toBe(true);
    expect({ source, target }).toEqual(frozen);
  });
  it('converts nested lookup IDs and removes the app code that would override the new ID', () => {
    const source = { properties: { table: { type: 'SUBTABLE', fields: { lookup: { ...field('lookup'), lookup: { relatedApp: { app: '10', code: 'OLD' } } } } } } };
    const result = plan('fieldSettings', source, { properties: {} }, { lookupMap: { '10': '20' } });
    expect(result.operations[0].body.properties.table.fields.lookup.lookup.relatedApp).toEqual({ app: '20' });
  });
  it('blocks field type conflicts before any section can be written', () => {
    const result = plan('fieldSettings', { properties: { code: field('code') } }, { properties: { code: { type: 'NUMBER', code: 'code' } } });
    expect(result.status).toBe('error'); expect(result.blockers.join()).toContain('種類が異なります');
  });
  it('treats prototype-looking field codes as ordinary own keys', () => {
    const source = JSON.parse('{"properties":{"__proto__":{"type":"SINGLE_LINE_TEXT","code":"__proto__","label":"名前"}}}');
    const result = plan('fieldSettings', source, { properties: {} });
    expect(result.status).toBe('change'); expect(Object.keys(result.operations[0].body.properties)).toEqual(['__proto__']);
    expect(result.changes[0].path).toContain('__proto__'); expect(({} as any).label).toBeUndefined();
  });
  it.each(['viewSettings', 'reportSettings', 'actionSettings'])('preserves target-only named entries by default: %s', key => {
    const property = { viewSettings: 'views', reportSettings: 'reports', actionSettings: 'actions' }[key]!;
    const source = { [property]: { source: { ...view('source'), id: '101' } } };
    const target = { [property]: { local: { ...view('local'), id: '202' } } };
    const result = plan(key, source, target);
    expect(Object.keys(result.operations[0].body[property])).toEqual(['local', 'source']);
    expect(result.operations[0].body[property].source).not.toHaveProperty('id');
    expect(result.operations[0].body[property].source.index).toBe('0'); expect(result.operations[0].body[property].local.index).toBe('1');
    expect(result.removalCount).toBe(0);
    const replace = plan(key, source, target, { preserveTargetOnly: false });
    expect(Object.keys(replace.operations[0].body[property])).toEqual(['source']);
    expect(replace.changes.some(item => item.kind === '削除' && item.path.includes('local'))).toBe(true);
  });
  it('ignores read-only view IDs and string-vs-number indices', () => {
    expect(plan('viewSettings', { views: { list: { ...view('list'), id: '1', index: 0 } } }, { views: { list: { ...view('list'), id: '2' } } }).status).toBe('same');
  });
  it('keeps named settings without writing when the source is empty and preservation is on', () => {
    expect(plan('viewSettings', { views: {} }, { views: { local: view('local') } }).operations).toEqual([]);
  });
  it('adds only missing plugins using POST and ids, without removing target plugins', () => {
    const result = plan('pluginSettings', { plugins: [{ id: 'new' }, { id: 'common' }] }, { plugins: [{ id: 'local' }, { id: 'common' }] });
    expect(result.operations).toEqual([{ method: 'POST', endpoint: '/app/plugins.json', body: { ids: ['new'] }, label: 'プラグイン追加' }]);
    expect(result.removalCount).toBe(0);
  });
  it('skips already installed plugins even if version/name metadata differs', () => {
    expect(plan('pluginSettings', { plugins: [{ id: 'common', name: 'new' }] }, { plugins: [{ id: 'common', name: 'old' }] }).status).toBe('same');
  });
  it('preserves customization scope and strips read-only FILE properties', () => {
    const result = plan('customizeSettings', customization('ADMIN', [file('existing')]), customization('ALL', [file('existing')]));
    expect(result.operations[0].body.scope).toBe('ADMIN');
    expect(result.operations[0].body.desktop.js).toEqual([{ type: 'FILE', file: { fileKey: 'existing' } }]);
    expect(result.blockers).toEqual([]);
  });
  it('blocks foreign uploaded file keys but accepts a key already in target preview', () => {
    expect(plan('customizeSettings', customization('ALL', [file('foreign')]), customization()).status).toBe('error');
    expect(plan('customizeSettings', customization('ALL', [file('same')]), customization('ALL', [file('same')])).status).toBe('same');
  });
  it.each([
    ['customizeSettings', { scope: 'ALL', desktop: { js: [{ type: 'URL' }] } }],
    ['fieldSettings', {}], ['fieldSettings', { properties: { table: { type: 'SUBTABLE' } } }],
    ['layoutSettings', {}], ['viewSettings', {}], ['reportSettings', {}], ['actionSettings', {}],
    ['appAcl', {}], ['fieldAcl', {}], ['recordPermissions', {}], ['notifications', {}], ['perRecordNotifications', {}], ['reminderNotifications', {}],
    ['categories', {}], ['processSettings', {}], ['pluginSettings', {}]
  ])('blocks malformed or incomplete %s instead of emptying target settings', (key, data) => {
    expect(plan(String(key), data, data).status).toBe('error');
  });
  it('copies the category enabled flag and general notification comment flag', () => {
    expect(plan('categories', { enabled: true, categories: {} }, { enabled: false, categories: {} }).operations[0].body).toEqual({ enabled: true, categories: {} });
    expect(plan('notifications', { notifyToCommenter: true, notifications: [] }, { notifyToCommenter: false, notifications: [] }).operations[0].body).toEqual({ notifyToCommenter: true, notifications: [] });
  });
  it('includes timezone when reminder notification settings change', () => {
    expect(plan('reminderNotifications', { timezone: 'Asia/Tokyo', notifications: [] }, { timezone: 'UTC', notifications: [] }).operations[0].body.timezone).toBe('Asia/Tokyo');
  });
  it('preserves existing layout fields, including children in groups and tables', () => {
    const row = (code: string) => ({ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code }] });
    const source = { layout: [row('source'), { type: 'GROUP', code: 'group', layout: [] }, { type: 'SUBTABLE', code: 'table', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'a' }] }] };
    const target = { layout: [row('local'), { type: 'GROUP', code: 'group', layout: [row('inside')] }, { type: 'SUBTABLE', code: 'table', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'a' }, { type: 'SINGLE_LINE_TEXT', code: 'b' }] }] };
    const result = plan('layoutSettings', source, target);
    expect(result.requiredFields).toEqual(['source', 'group', 'inside', 'table', 'a', 'b', 'local']);
    expect(result.operations[0].body.layout[1].layout).toEqual([row('inside')]);
    expect(result.changes.filter(item => item.kind === '保持')).toHaveLength(3);
  });
  it('detects missing view/layout fields for the effective selection, including deselecting field additions', () => {
    const fields = plan('fieldSettings', { properties: { added: field('added') } }, { properties: {} });
    const views = plan('viewSettings', { views: { new: view('new', ['added']) } }, { views: {} });
    expect(reflectSelectionBlockers([fields, views], ['viewSettings'], ['added'], [])).toHaveLength(1);
    expect(reflectSelectionBlockers([fields, views], ['fieldSettings', 'viewSettings'], ['added'], [])).toEqual([]);
    expect(listReflectFieldCodes({ sections: { fieldSettings: { properties: { table: { type: 'SUBTABLE', fields: { nested: {} } } } } } })).toEqual(['table', 'nested']);
  });
  it('does not derive removal warnings from changed API revisions alone', () => {
    expect(plan('appAcl', { rights: [], revision: '2' }, { rights: [], revision: '1' }).status).toBe('same');
  });
});
