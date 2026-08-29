import { describe, it, expect } from 'vitest';
import { decodeRow, isSemanticSection } from '../../src/diff/path-decoder';
import { labelOfProp, labelOfValue, labelOfBool, formatEntityText } from '../../src/diff/label-dict';

describe('label-dict', () => {
  it('labelOfProp maps known keys to Japanese', () => {
    expect(labelOfProp('recordEditable')).toBe('レコード編集');
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
    expect(d!.propLabel).toBe('レコード編集');
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
    expect(d!.propLabel).toBe('通知先');
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

  it('resolves the assignee type via processSettings context (type is section-scoped)', () => {
    const d = decodeRow({
      sectionKey: 'processSettings',
      path: 'processSettings.states.処理中.assignee.type',
      type: 'changed',
      left: 'ANY',
      right: 'ALL'
    });
    expect(d!.beforeText).toBe('候補のうち誰か1人が作業する');
    expect(d!.afterText).toBe('候補の全員が作業する');
  });

  it('resolves appSettings enums (icon type / theme / roundingMode) with screen labels', () => {
    const icon = decodeRow({
      sectionKey: 'appSettings', path: 'appSettings.icon.type',
      type: 'changed', left: 'PRESET', right: 'FILE'
    });
    expect(icon!.beforeText).toBe('プリセット');
    expect(icon!.afterText).toBe('アップロードファイル');
    // 親プロパティ（アイコン）が文脈チップとして補われる
    expect(icon!.whereChips.map((c) => c.label)).toContain('アイコン');

    const theme = decodeRow({
      sectionKey: 'appSettings', path: 'appSettings.theme',
      type: 'changed', left: 'WHITE', right: 'RED'
    });
    expect(theme!.beforeText).toBe('ホワイト');
    expect(theme!.afterText).toBe('レッド');

    const rounding = decodeRow({
      sectionKey: 'appSettings', path: 'appSettings.numberPrecision.roundingMode',
      type: 'changed', left: 'HALF_EVEN', right: 'UP'
    });
    expect(rounding!.beforeText).toBe('四捨五入（偶数丸め）');
    expect(rounding!.afterText).toBe('切り上げ');
  });

  it('resolves view device/builtinType and report sort/aggregation enums', () => {
    const device = decodeRow({
      sectionKey: 'viewSettings', path: 'viewSettings.views.カスタム.device',
      type: 'changed', left: 'ANY', right: 'DESKTOP'
    });
    expect(device!.propLabel).toBe('表示するデバイス');
    expect(device!.beforeText).toBe('PC・モバイル両方');
    expect(device!.afterText).toBe('PC版のみ');

    const builtin = decodeRow({
      sectionKey: 'viewSettings', path: 'viewSettings.views.一覧.builtinType',
      type: 'removed', left: 'ASSIGNEE', right: undefined
    });
    expect(builtin!.propLabel).toBe('標準一覧の種類');
    expect(builtin!.beforeText).toBe('作業者ビュー');

    const order = decodeRow({
      sectionKey: 'reportSettings', path: 'reportSettings.reports.売上集計.sorts[0].order',
      type: 'changed', left: 'DESC', right: 'ASC'
    });
    expect(order!.propLabel).toBe('ソートの順序');
    expect(order!.beforeText).toBe('大きい順');
    expect(order!.afterText).toBe('小さい順');

    const aggregation = decodeRow({
      sectionKey: 'reportSettings', path: 'reportSettings.reports.売上集計.aggregations[0].type',
      type: 'changed', left: 'SUM', right: 'AVG'
    });
    expect(aggregation!.beforeText).toBe('合計');
    expect(aggregation!.afterText).toBe('平均');
  });

  it('summarizes periodicReport as one line instead of raw JSON keys', () => {
    const d = decodeRow({
      sectionKey: 'reportSettings',
      path: 'reportSettings.reports.売上集計.periodicReport',
      type: 'added',
      left: undefined,
      right: { active: true, period: { every: 'WEEK', dayOfWeek: 'MONDAY', time: '09:00' } }
    });
    expect(d!.propLabel).toBe('定期レポート');
    expect(d!.afterText).toBe('有効（毎週 月曜日 09:00）');
  });

  it('humanizes reminder daysLater offsets to 日前/日後', () => {
    const d = decodeRow({
      sectionKey: 'reminderNotifications',
      path: 'reminderNotifications.notifications[0].timing.daysLater',
      type: 'changed',
      left: '-1',
      right: '3'
    });
    expect(d!.propLabel).toBe('通知する日');
    expect(d!.beforeText).toBe('1日前');
    expect(d!.afterText).toBe('3日後');
  });

  it('does not treat customizeSettings.scope as a platform chip and localizes the value', () => {
    const d = decodeRow({
      sectionKey: 'customizeSettings',
      path: 'customizeSettings.scope',
      type: 'changed',
      left: 'ALL',
      right: 'ADMIN'
    });
    expect(d!.propLabel).toBe('適用範囲');
    expect(d!.whereChips.map((c) => c.label)).not.toContain('scope');
    expect(d!.beforeText).toBe('全ユーザー');
    expect(d!.afterText).toBe('管理者のみ');
  });

  it('keeps view/chart type resolution for sections without a scoped type dictionary', () => {
    const view = decodeRow({
      sectionKey: 'viewSettings', path: 'viewSettings.views.一覧.type',
      type: 'changed', left: 'LIST', right: 'CALENDAR'
    });
    expect(view!.beforeText).toBe('表形式');
    expect(view!.afterText).toBe('カレンダー形式');
  });
});
