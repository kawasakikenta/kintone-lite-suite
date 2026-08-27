import { describe, it, expect } from 'vitest';
import { decodeRow, isSemanticSection } from '../../src/diff/path-decoder';
import { labelOfProp, labelOfValue, labelOfBool, formatEntityText } from '../../src/diff/label-dict';

describe('label-dict', () => {
  it('labelOfProp maps known keys to Japanese', () => {
    expect(labelOfProp('recordEditable')).toBe('編集');
    expect(labelOfProp('filterCond')).toBe('絞込条件');
    expect(labelOfProp('paginationStyle')).toBe('ページ送り');
  });
  it('labelOfProp falls back to raw key for unknown', () => {
    expect(labelOfProp('zzzUnknownKey')).toBe('zzzUnknownKey');
  });
  it('labelOfValue resolves accessibility enum', () => {
    expect(labelOfValue('accessibility', 'WRITE')).toBe('閲覧・編集可');
    expect(labelOfValue('accessibility', 'READ_WRITE')).toBe('閲覧・編集可');
    expect(labelOfValue('accessibility', 'NONE')).toBe('不可');
    expect(labelOfValue('accessibility', 'unknownLevel')).toBeNull();
  });
  it('labelOfBool returns permission-style for permission keys', () => {
    expect(labelOfBool(true, 'recordEditable')).toBe('許可');
    expect(labelOfBool(false, 'recordEditable')).toBe('不許可');
    expect(labelOfBool(true, 'enable')).toBe('有効');
    expect(labelOfBool(true, 'unknownKey')).toBe('はい');
  });
  it('formatEntityText includes type icon and display name', () => {
    expect(formatEntityText({ type: 'GROUP', code: 'sales', name: '営業部' })).toContain('営業部');
    expect(formatEntityText({ type: 'GROUP', code: 'sales' })).toContain('sales');
    expect(formatEntityText(null)).toBe('');
  });
  it('localizes kintone entity types and built-in function entities', () => {
    expect(labelOfValue('entity.type', 'FUNCTION')).toBe('⚙ 関数');
    expect(labelOfValue('entity.type', 'MODIFIER')).toBe('✏️ 更新者');
    expect(labelOfValue('entity.type', 'LOGIN_USER')).toBe('👤 ログインユーザー');
    expect(labelOfValue('entity.type', 'ALL')).toBe('🌐 全員');
    expect(formatEntityText({ type: 'FUNCTION', code: 'LOGINUSER()' })).toBe('ログインユーザー');
    expect(formatEntityText({ type: 'FUNCTION', code: 'PRIMARY_ORGANIZATION()' })).toBe('優先する組織');
    expect(formatEntityText({ type: 'GROUP', code: 'sales', name: '営業部' })).toBe('👥 グループ 営業部 (sales)');
  });
});

describe('path-decoder.isSemanticSection', () => {
  it('returns true for non-field sections', () => {
    expect(isSemanticSection('appAcl')).toBe(true);
    expect(isSemanticSection('notifications')).toBe(true);
    expect(isSemanticSection('viewSettings')).toBe(true);
  });
  it('returns false for field/layout sections', () => {
    expect(isSemanticSection('fieldSettings')).toBe(false);
    expect(isSemanticSection('layoutSettings')).toBe(false);
    expect(isSemanticSection('')).toBe(false);
    expect(isSemanticSection(null)).toBe(false);
  });
});

describe('path-decoder.decodeRow', () => {
  it('decodes appAcl boolean change with entity from payload', () => {
    const row = {
      sectionKey: 'appAcl',
      path: 'appAcl.rights[3].recordEditable',
      type: 'changed',
      left: true,
      right: false
    };
    const d = decodeRow(row);
    expect(d).not.toBeNull();
    expect(d!.sectionLabel).toBe('アプリ権限');
    expect(d!.propLabel).toBe('編集');
    expect(d!.beforeText).toBe('許可');
    expect(d!.afterText).toBe('不許可');
  });

  it('uses entityLabel attached by engine for expanded rows', () => {
    const row = {
      sectionKey: 'notifications',
      path: 'notifications.notifications[2]',
      type: 'added',
      left: undefined,
      right: { name: 'リード通知', recipients: [{ entity: { type: 'GROUP', code: 'sales' } }] },
      entityKind: 'notification',
      entityLabel: 'リード通知',
      entityCode: 'リード通知'
    };
    const d = decodeRow(row);
    expect(d).not.toBeNull();
    expect(d!.whereChips[0].label).toBe('リード通知');
    expect(d!.searchableTokens.join(' ')).toContain('通知');
  });

  it('decodes view filterCond change with named view context', () => {
    const row = {
      sectionKey: 'viewSettings',
      path: 'viewSettings.views.売上一覧.filterCond',
      type: 'changed',
      left: 'status = "draft"',
      right: 'status = "open"'
    };
    const d = decodeRow(row);
    expect(d!.sectionLabel).toBe('ビュー設定');
    expect(d!.whereChips.some((c) => c.label === '売上一覧')).toBe(true);
    expect(d!.propLabel).toBe('絞込条件');
    expect(d!.beforeText).toContain('draft');
    expect(d!.afterText).toContain('open');
  });

  it('decodes accessibility change with localized values', () => {
    const row = {
      sectionKey: 'fieldAcl',
      path: 'fieldAcl.rights[0].entities[1].accessibility',
      type: 'changed',
      left: 'READ',
      right: 'WRITE'
    };
    const d = decodeRow(row);
    expect(d!.beforeText).toBe('閲覧のみ');
    expect(d!.afterText).toBe('閲覧・編集可');
    const legacy = decodeRow({ ...row, right: 'READ_WRITE' });
    expect(legacy!.afterText).toBe('閲覧・編集可');
  });

  it('returns null for field/layout rows (kept on legacy renderer)', () => {
    expect(decodeRow({ sectionKey: 'fieldSettings', path: 'fieldSettings.x', type: 'changed' })).toBeNull();
    expect(decodeRow({ sectionKey: 'layoutSettings', path: 'layoutSettings.layout[0]', type: 'changed' })).toBeNull();
  });

  it('decodes recipients (added) as compact entity list', () => {
    const row = {
      sectionKey: 'notifications',
      path: 'notifications.notifications[0].recipients',
      type: 'changed',
      left: [{ entity: { type: 'GROUP', code: 'sales', name: '営業部' } }],
      right: [
        { entity: { type: 'GROUP', code: 'sales', name: '営業部' } },
        { entity: { type: 'USER', code: 'alice', name: 'Alice' } }
      ]
    };
    const d = decodeRow(row);
    expect(d!.propLabel).toBe('宛先');
    expect(d!.beforeText).toContain('営業部');
    expect(d!.afterText).toContain('Alice');
  });

  it('keeps internal keys searchable alongside Japanese labels', () => {
    const row = {
      sectionKey: 'appAcl',
      path: 'appAcl.rights[0].recordViewable',
      type: 'changed',
      left: true,
      right: false
    };
    const d = decodeRow(row);
    // 日本語ラベルが検索インデックスに含まれる
    expect(d!.searchableTokens.join(' ')).toMatch(/閲覧|アプリ権限|許可/);
  });
});
