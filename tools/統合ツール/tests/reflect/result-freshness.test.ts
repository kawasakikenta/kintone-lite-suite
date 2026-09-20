import { describe, expect, it } from 'vitest';
import { reflectResultMatchesOptions } from '../../src/tabs/reflect-standalone';

const report = {
  source: { appId: '1', guestId: '', environment: 'production' },
  target: { appId: '2', guestId: '3', environment: 'preview' },
  preserveTargetOnly: true,
  scopes: ['viewSettings', 'fieldSettings'],
  lookupMap: { '10': '20' }
};

const options = {
  sourceAppId: '1', sourceGuestId: '', sourcePreview: false,
  sourceBundle: null,
  targetAppId: '2', targetGuestId: '3',
  preserveTargetOnly: true,
  scopes: ['fieldSettings', 'viewSettings'],
  lookupMap: { '10': '20' }
};

describe('preview reflection result freshness', () => {
  it('accepts a result only when all execution inputs still match', () => {
    expect(reflectResultMatchesOptions(report, options)).toBe(true);
    expect(reflectResultMatchesOptions(report, { ...options, targetAppId: '4' })).toBe(false);
    expect(reflectResultMatchesOptions(report, { ...options, lookupMap: { '10': '30' } })).toBe(false);
    expect(reflectResultMatchesOptions(report, { ...options, scopes: ['viewSettings'] })).toBe(false);
  });

  it('treats an imported JSON source as its own environment and omits its guest ID', () => {
    const jsonReport = { ...report, source: { appId: '9', guestId: '', environment: 'json' } };
    expect(reflectResultMatchesOptions(jsonReport, {
      ...options,
      sourceAppId: '9',
      sourceGuestId: '99',
      sourceBundle: { appId: '9' }
    })).toBe(true);
    expect(reflectResultMatchesOptions(jsonReport, {
      ...options,
      sourceAppId: '9',
      sourceBundle: { appId: '8' }
    })).toBe(false);
  });
});
