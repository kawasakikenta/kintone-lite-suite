import { describe, it, expect } from 'vitest';
import { summarizePlanDeletes, assessApplyRisk } from '../../src/reflect/planInsights';

const noDiff = { total: 0, high: 0, medium: 0, low: 0 };
const thresholds = { diffThreshold: 100, requestThreshold: 80 };

describe('summarizePlanDeletes', () => {
  it('counts delete targets from array bodies per section', () => {
    const result = summarizePlanDeletes([
      { method: 'DELETE', sectionKey: 'fieldSettings', sectionLabel: 'フィールド', body: { app: 1, fields: ['a', 'b', 'c'] } },
      { method: 'DELETE', sectionKey: 'reportSettings', sectionLabel: 'グラフ', body: { app: 1, reports: ['r1'] } },
      { method: 'PUT', sectionKey: 'fieldSettings', sectionLabel: 'フィールド', body: { app: 1, properties: {} } }
    ]);
    expect(result.total).toBe(4);
    expect(result.sections).toEqual([
      { sectionKey: 'fieldSettings', sectionLabel: 'フィールド', count: 3 },
      { sectionKey: 'reportSettings', sectionLabel: 'グラフ', count: 1 }
    ]);
  });

  it('skips excluded sections', () => {
    const result = summarizePlanDeletes([
      { method: 'DELETE', sectionKey: 'fieldSettings', sectionLabel: 'フィールド', body: { app: 1, fields: ['a'] } },
      { method: 'DELETE', sectionKey: 'reportSettings', sectionLabel: 'グラフ', body: { app: 1, reports: ['r1', 'r2'] } }
    ], ['fieldSettings']);
    expect(result.total).toBe(2);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].sectionKey).toBe('reportSettings');
  });

  it('treats a DELETE without an array body as one target', () => {
    const result = summarizePlanDeletes([
      { method: 'DELETE', sectionKey: 'x', sectionLabel: 'X', body: { app: 1 } }
    ]);
    expect(result.total).toBe(1);
  });

  it('is defensive against empty/odd input', () => {
    expect(summarizePlanDeletes([]).total).toBe(0);
    expect(summarizePlanDeletes(null as any).total).toBe(0);
    expect(summarizePlanDeletes([{ method: 'delete', sectionKey: 's', body: null }]).total).toBe(1);
  });
});

describe('assessApplyRisk', () => {
  it('returns no issues and checkbox-only confirmation for a small safe apply', () => {
    const risk = assessApplyRisk({
      sameConnection: false,
      diffSummary: { total: 5, high: 0, medium: 2, low: 3 },
      requestCount: 3,
      deleteCount: 0,
      ...thresholds
    });
    expect(risk.issues).toEqual([]);
    expect(risk.highRisk).toBe(false);
    expect(risk.requireKeyword).toBe(false);
  });

  it('flags same-connection applies as high risk requiring keyword input', () => {
    const risk = assessApplyRisk({
      sameConnection: true,
      diffSummary: noDiff,
      requestCount: 0,
      ...thresholds
    });
    expect(risk.highRisk).toBe(true);
    expect(risk.requireKeyword).toBe(true);
    expect(risk.issues.some((m) => m.includes('同一接続'))).toBe(true);
  });

  it('flags high-severity diffs as high risk', () => {
    const risk = assessApplyRisk({
      sameConnection: false,
      diffSummary: { total: 3, high: 1, medium: 0, low: 2 },
      requestCount: 2,
      ...thresholds
    });
    expect(risk.highRisk).toBe(true);
    expect(risk.requireKeyword).toBe(true);
  });

  it('requires keyword (but not app id) when thresholds are exceeded', () => {
    const risk = assessApplyRisk({
      sameConnection: false,
      diffSummary: { total: 150, high: 0, medium: 0, low: 150 },
      requestCount: 90,
      ...thresholds
    });
    expect(risk.highRisk).toBe(false);
    expect(risk.requireKeyword).toBe(true);
    expect(risk.issues).toHaveLength(2);
  });

  it('reports deletes as an issue requiring keyword confirmation', () => {
    const risk = assessApplyRisk({
      sameConnection: false,
      diffSummary: { total: 4, high: 0, medium: 0, low: 4 },
      requestCount: 4,
      deleteCount: 2,
      ...thresholds
    });
    expect(risk.highRisk).toBe(false);
    expect(risk.requireKeyword).toBe(true);
    expect(risk.issues.some((m) => m.includes('削除'))).toBe(true);
  });
});
