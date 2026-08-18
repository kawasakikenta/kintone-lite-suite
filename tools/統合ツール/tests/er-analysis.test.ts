import { describe, expect, it } from 'vitest';
import { analyzeErDependencies, ER_HIGH_CONNECTION_THRESHOLD } from '../src/tabs/er-analysis.js';

describe('analyzeErDependencies', () => {
  it('returns factual counts for cycles, self references, connectivity and retrieval state', () => {
    const result = analyzeErDependencies([
      { id: 1, name: 'Properties', status: 'complete', relations: [
        { toApp: 2, kind: 'LOOKUP', from: 'building_id' },
        { toApp: 2, kind: 'LOOKUP', from: 'building_id' },
        { toApp: 99, kind: 'ACTION', from: 'register_elsewhere' }
      ] },
      { id: 2, name: 'Work', status: 'complete', relations: [
        { toApp: 1, kind: 'REF', from: 'property_id' },
        { toApp: 3, kind: 'LOOKUP', from: 'vendor_id' }
      ] },
      { id: 3, name: 'Vendors', status: 'partial', relations: [
        { toApp: 3, kind: 'LOOKUP', from: 'parent_vendor_id' }
      ] },
      { id: 4, name: 'Standalone', status: 'failed', relations: [] }
    ]);

    expect(result.edgeCount).toBe(5);
    expect(result.counts).toEqual({
      apps: 4,
      relations: 5,
      resolvedRelations: 4,
      unresolvedRelations: 1,
      cycleCandidates: 1,
      selfReferences: 1,
      appsWithNoRelations: 1,
      highConnectionApps: 3,
      retrievalComplete: 2,
      retrievalPartial: 1,
      retrievalFailed: 1
    });
    expect(result.cycles).toEqual([{ appIds: ['1', '2'], appNames: ['Properties', 'Work'] }]);
    expect(result.selfReferences).toEqual([
      { appId: '3', appName: 'Vendors', kind: 'LOOKUP', field: 'parent_vendor_id' }
    ]);
    expect(result.isolatedAppIds).toEqual(['4']);
    expect(result.unresolvedTargets).toEqual([
      expect.objectContaining({
        fromAppId: '1',
        toAppId: '99',
        kind: 'ACTION',
        reason: 'outside-diagram'
      })
    ]);
    expect(result.highConnectionThreshold).toBe(ER_HIGH_CONNECTION_THRESHOLD);
    expect(result.hubs.map((hub) => hub.appId).sort()).toEqual(['1', '2', '3']);
    expect(result.completeAppIds).toEqual(['1', '2']);
    expect(result.partialAppIds).toEqual(['3']);
    expect(result.failedAppIds).toEqual(['4']);
  });

  it('keeps self references separate from multi-app cycle candidates', () => {
    const self = analyzeErDependencies([
      { id: '10', name: 'Organization', ok: true, relations: [
        { toApp: 10, kind: 'LOOKUP', from: 'parent_id' }
      ] }
    ]);

    expect(self.cycles).toEqual([]);
    expect(self.selfReferences).toHaveLength(1);
    expect(self.appStats[0]).toMatchObject({
      appId: '10',
      incoming: 1,
      outgoing: 1,
      total: 2,
      isolated: false,
      inCycle: false,
      hasSelfReference: true,
      retrievalStatus: 'complete'
    });
  });

  it('records missing targets and partial or failed retrievals without throwing on malformed input', () => {
    const result = analyzeErDependencies([
      {
        id: 1,
        name: 'Masked lookup',
        issues: [{ area: 'lookup', message: 'target hidden' }],
        relations: [null, {}, { toApp: '', kind: 'LOOKUP', from: 'customer_id' }]
      },
      { id: 2, name: 'Failed app', ok: false, relations: 'invalid' },
      null,
      { id: '', relations: [] }
    ]);

    expect(result.appCount).toBe(2);
    expect(result.edgeCount).toBe(1);
    expect(result.unresolvedTargets).toEqual([
      expect.objectContaining({
        fromAppId: '1',
        toAppId: '',
        kind: 'LOOKUP',
        field: 'customer_id',
        reason: 'missing-target'
      })
    ]);
    expect(result.partialAppIds).toEqual(['1']);
    expect(result.failedAppIds).toEqual(['2']);
    expect(result.counts).toMatchObject({
      resolvedRelations: 0,
      unresolvedRelations: 1,
      retrievalComplete: 0,
      retrievalPartial: 1,
      retrievalFailed: 1
    });
  });
});
