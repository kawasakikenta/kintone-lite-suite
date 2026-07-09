import { describe, expect, it } from 'vitest';
import { analyzeErDependencies } from '../src/tabs/er-analysis.js';

describe('analyzeErDependencies', () => {
  it('detects cycles, isolated apps, hubs and unresolved targets', () => {
    const result = analyzeErDependencies([
      { id: 1, name: '物件', ok: true, relations: [
        { toApp: 2, kind: 'LOOKUP', from: 'building_id' },
        { toApp: 2, kind: 'LOOKUP', from: 'building_id' },
        { toApp: 99, kind: 'ACTION', from: '未取得アプリへ登録' }
      ] },
      { id: 2, name: '作業', ok: true, relations: [
        { toApp: 1, kind: 'REF', from: 'property_id' },
        { toApp: 3, kind: 'LOOKUP', from: 'vendor_id' }
      ] },
      { id: 3, name: '業者', ok: true, relations: [] },
      { id: 4, name: '孤立', ok: true, relations: [] }
    ]);

    expect(result.edgeCount).toBe(4);
    expect(result.cycles).toEqual([{ appIds: ['1', '2'], appNames: ['作業', '物件'] }]);
    expect(result.isolatedAppIds).toEqual(['4']);
    expect(result.unresolvedTargets).toHaveLength(1);
    expect(result.unresolvedTargets[0]).toMatchObject({ fromAppId: '1', toAppId: '99', kind: 'ACTION' });
    expect(result.hubs[0]).toMatchObject({ appId: '2', incoming: 1, outgoing: 2, total: 3 });
    expect(result.score).toBeLessThan(100);
  });

  it('treats a self reference as a cycle and returns a perfect score for a clean graph', () => {
    const self = analyzeErDependencies([
      { id: '10', name: '組織', ok: true, relations: [{ toApp: 10, kind: 'LOOKUP', from: 'parent_id' }] }
    ]);
    expect(self.cycles).toHaveLength(1);
    expect(self.cycles[0].appIds).toEqual(['10']);

    const clean = analyzeErDependencies([
      { id: 1, name: 'A', ok: true, relations: [{ toApp: 2, kind: 'LOOKUP', from: 'b' }] },
      { id: 2, name: 'B', ok: true, relations: [] }
    ]);
    expect(clean.score).toBe(100);
    expect(clean.grade).toBe('A');
    expect(clean.cycles).toEqual([]);
    expect(clean.isolatedAppIds).toEqual([]);
  });

  it('penalizes failed app retrievals without throwing on malformed relations', () => {
    const result = analyzeErDependencies([
      { id: 1, name: '取得失敗', ok: false, relations: [null, {}, { toApp: '', kind: 'LOOKUP' }] }
    ]);
    expect(result.failedAppIds).toEqual(['1']);
    expect(result.edgeCount).toBe(0);
    expect(result.score).toBe(65);
    expect(result.grade).toBe('C');
  });
});
