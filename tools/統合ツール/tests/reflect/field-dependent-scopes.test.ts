import { describe, expect, it } from 'vitest';
import { buildReflectSectionPlan, reflectInspectionScopes } from '../../src/reflect/standalonePlan';
import { assertReflectBaselineMatches, captureReflectBaseline } from '../../src/reflect/standalonePreflight';
import { shouldWarnMissingFieldSettings } from '../../src/reflect/liteSetup';

const opts: any = { sourceAppId: '1', sourceGuestId: '', sourcePreview: false, targetAppId: '2', targetGuestId: '', preserveTargetOnly: true };
const fields = { revision: '5', properties: { owner: { type: 'USER_SELECT', code: 'owner', label: '担当' } } };
const sections: Record<string, (name: string) => any> = {
  processSettings: name => ({ revision: '5', enable: true, actions: [], states: { A: { name, index: '0', assignee: { type: 'ONE', entities: [{ entity: { type: 'FIELD_ENTITY', code: 'owner' }, includeSubs: false }] } } } }),
  fieldAcl: name => ({ revision: '5', rights: [{ code: 'owner', entities: [{ entity: { type: 'USER', code: name }, accessibility: 'READ' }] }] }),
  reminderNotifications: name => ({ revision: '5', timezone: 'Asia/Tokyo', notifications: [{ timing: { code: 'owner', daysLater: '1', hoursLater: '0' }, filterCond: '', title: name, targets: [] }] })
};

/** previewReflectStandalone と同じ順序で、取得範囲の決定から基準の照合までを行う。 */
function review(key: string) {
  const inspected = reflectInspectionScopes([key]);
  const bundle = (name: string) => ({ sections: { [key]: sections[key](name), ...(inspected.includes('fieldSettings') ? { fieldSettings: fields } : {}) } });
  const source = bundle('元'), target = bundle('先');
  const entry = buildReflectSectionPlan(key, source.sections[key], target.sections[key], opts);
  const baseline = captureReflectBaseline({ ...opts, scopes: inspected }, source, target);
  assertReflectBaselineMatches(baseline, { ...opts, scopes: [key], targetDependencies: entry.requiredFields?.length ? ['fieldSettings'] : [] }, source, target);
  return entry;
}

describe('フィールドを参照する項目をフィールド設定なしで選ぶ', () => {
  it.each(Object.keys(sections))('%s はフィールド設定も取得し、差分確認を止めない', key => {
    expect(reflectInspectionScopes([key])).toEqual([key, 'fieldSettings']);
    expect(shouldWarnMissingFieldSettings([key])).toBe(true);
    const entry = review(key);
    expect(entry.requiredFields).toEqual(['owner']);
    expect(entry.status).toBe('change');
  });
  it('フィールドを参照しない項目では余分に取得しない', () => {
    expect(reflectInspectionScopes(['customizeSettings'])).toEqual(['customizeSettings']);
  });
});
