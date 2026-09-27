import { describe, expect, it } from 'vitest';
import { pickAllSettingsBundles, pickSettingsBundle } from '../../src/settingsBundleImport';

function rawBundle(appId: string, extra: Record<string, any> = {}) {
  return {
    appId,
    sections: { fieldSettings: { properties: {} } },
    ...extra
  };
}

describe('design import metadata preservation', () => {
  it('keeps guest and preview unknown when the source keys are absent', () => {
    const picked = pickSettingsBundle(rawBundle('1'), {
      appId: '1',
      rawSettings: true,
      preserveMetadata: true
    });

    expect(Object.prototype.hasOwnProperty.call(picked, 'guestId')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(picked, 'preview')).toBe(false);
  });

  it('keeps explicitly empty guest and false preview instead of treating them as unknown', () => {
    const picked = pickSettingsBundle(rawBundle('2', { guestId: '', preview: false }), {
      appId: '2',
      rawSettings: true,
      preserveMetadata: true
    });

    expect(picked).toHaveProperty('guestId', '');
    expect(picked).toHaveProperty('preview', false);
  });

  it('preserves the same distinction for all bundles in an apps wrapper', () => {
    const picked = pickAllSettingsBundles({
      apps: [rawBundle('3'), rawBundle('4', { guestId: '', preview: false })]
    }, undefined, true, true);

    expect(Object.prototype.hasOwnProperty.call(picked[0], 'guestId')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(picked[0], 'preview')).toBe(false);
    expect(picked[1]).toHaveProperty('guestId', '');
    expect(picked[1]).toHaveProperty('preview', false);
  });

  it('retains legacy defaults when metadata preservation is not requested', () => {
    const picked = pickSettingsBundle(rawBundle('5'));

    expect(picked).toHaveProperty('guestId', '');
    expect(picked).toHaveProperty('preview', false);
  });
});
