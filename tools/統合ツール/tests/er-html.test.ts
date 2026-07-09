import { describe, expect, it } from 'vitest';
import { buildHTML } from '../src/tabs/er.js';

describe('ER diagram HTML', () => {
  it('embeds the dependency analysis and review UI in the generated viewer', () => {
    const html = buildHTML([
      { id: 1, name: '物件', ok: true, fields: [], totalFieldCount: 0, requiredCount: 0, lookupCount: 1, refCount: 0, relations: [{ toApp: 2, kind: 'LOOKUP', from: 'work_id' }] },
      { id: 2, name: '作業', ok: true, fields: [], totalFieldCount: 0, requiredCount: 0, lookupCount: 1, refCount: 0, relations: [{ toApp: 1, kind: 'LOOKUP', from: 'property_id' }] }
    ], { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'standard', source: {} });

    expect(html).toContain('🩺 構造分析');
    expect(html).toContain('循環グループ');
    expect(html).toContain('const ER_ANALYSIS = {');
    expect(html).toContain('"score":92');
    expect(html).not.toContain('${dependencyAnalysisData}');
  });
});
