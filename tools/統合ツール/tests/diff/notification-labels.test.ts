import { describe, expect, it } from 'vitest';
import { computeDiffRows, expandEntityRowsForDisplay } from '../../src/diff/engine';
import { enrichDiffRows } from '../../src/diff/enrich';

// kintone の /k/v1/app/notifications/*.json の応答の形。
// 一般通知は entity・includeSubs・recordAdded など、レコード条件通知は filterCond・title・targets、
// リマインダー通知は timing・filterCond・title・targets を持つ（name・recipients は無い）。
const notifications = {
  notifications: [
    { entity: { type: 'USER', code: 'sato' }, includeSubs: false, recordAdded: true, recordEdited: false, commentAdded: true, statusChanged: false, fileImported: false },
    { entity: { type: 'GROUP', code: 'sales' }, includeSubs: true, recordAdded: true, recordEdited: true, commentAdded: false, statusChanged: false, fileImported: false }
  ],
  notifyToCommenter: true,
  revision: '3'
};
const perRecordNotifications = {
  notifications: [
    { filterCond: 'amount > 100', title: '高額案件', targets: [{ entity: { type: 'USER', code: 'boss' }, includeSubs: false }] },
    { filterCond: 'amount > 1', title: '', targets: [{ entity: { type: 'GROUP', code: 'managers' }, includeSubs: false }, { entity: { type: 'USER', code: 'suzuki' }, includeSubs: false }] }
  ],
  revision: '3'
};
const reminderNotifications = {
  notifications: [
    { timing: { code: 'due', daysLater: -1, time: '09:00' }, filterCond: '', title: '', targets: [{ entity: { type: 'FIELD_ENTITY', code: 'owner' }, includeSubs: false }] }
  ],
  timezone: 'Asia/Tokyo',
  revision: '3'
};
const SECTIONS = ['notifications', 'perRecordNotifications', 'reminderNotifications'];

describe('通知のセクション全体の追加・削除の参考行', () => {
  const source = { appId: '1', sections: {} };
  const target = { appId: '2', sections: { notifications, perRecordNotifications, reminderNotifications } };
  const children = (sectionKey: string) => {
    const comparison = computeDiffRows(source, target, SECTIONS, '');
    return expandEntityRowsForDisplay(enrichDiffRows(comparison.rows, source, target))
      .filter((row: any) => row._displayOnly && row.sectionKey === sectionKey);
  };

  it('一般通知は宛先で示す', () => {
    expect(children('notifications').map((row: any) => row.entityLabel)).toEqual(['sato (USER)', 'sales (GROUP)']);
    expect(children('notifications')[0].reasonSummary).toBe('通知追加：sato (USER)');
  });

  it('レコード条件通知・リマインダー通知はタイトルで示し、無題なら通知先で示す', () => {
    expect(children('perRecordNotifications').map((row: any) => row.entityLabel)).toEqual(['高額案件', '通知先: managers (GROUP) 他1件']);
    expect(children('reminderNotifications').map((row: any) => row.entityLabel)).toEqual(['通知先: owner (FIELD_ENTITY)']);
  });
});

describe('通知の差分行の見出し', () => {
  const source = { appId: '1', sections: { notifications, perRecordNotifications, reminderNotifications } };

  function changedRows(mutate: (sections: any) => void) {
    const target = JSON.parse(JSON.stringify(source));
    mutate(target.sections);
    const comparison = computeDiffRows(source, target, SECTIONS, '');
    return enrichDiffRows(comparison.rows, source, target).filter((row: any) => row.type !== 'same');
  }

  it('無題のレコード条件通知の追加は、通知先で示す', () => {
    const rows = changedRows((sections) => {
      sections.perRecordNotifications.notifications.push({ filterCond: 'amount > 5', title: '', targets: [{ entity: { type: 'ORGANIZATION', code: 'hq' }, includeSubs: true }] });
    });
    const added = rows.find((row: any) => row.type === 'added' && row.sectionKey === 'perRecordNotifications');
    expect(added?.entityLabel).toBe('通知先: hq (ORGANIZATION)');
    expect(added?.reasonSummary).toBe('レコード条件通知追加：通知先: hq (ORGANIZATION)');
  });

  it('リマインダーの通知タイミングの項目を、設定画面の言葉で示す', () => {
    const rows = changedRows((sections) => {
      const timing = sections.reminderNotifications.notifications[0].timing;
      timing.code = 'due2';
      timing.daysLater = -2;
      timing.time = '10:00';
    });
    const labelOf = (leaf: string) => rows.find((row: any) => row.path.endsWith(`.timing.${leaf}`))?.entityPropLabel;
    expect(labelOf('code')).toBe('通知タイミングの基準フィールド');
    expect(labelOf('daysLater')).toBe('基準日からの日数');
    expect(labelOf('time')).toBe('通知する時刻');
  });

  it('通知先のエンティティのコードを、通知タイミングの基準フィールドと取り違えない', () => {
    const rows = changedRows((sections) => {
      sections.reminderNotifications.notifications[0].targets[0].entity.code = 'manager';
    });
    const row = rows.find((item: any) => item.path.endsWith('.targets[0].entity.code'));
    expect(row).toBeTruthy();
    expect(row?.entityPropLabel).not.toBe('通知タイミングの基準フィールド');
  });

  it('一般通知の通知条件の変更は、宛先と条件の名前で示す', () => {
    const rows = changedRows((sections) => { sections.notifications.notifications[0].recordEdited = true; });
    expect(rows.map((row: any) => row.reasonSummary)).toEqual(['通知「sato (USER)」 / レコードの編集 変更']);
  });
});
