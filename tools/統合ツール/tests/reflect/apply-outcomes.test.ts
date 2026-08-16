import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyDiffRowToSection,
  applyActionsSectionDiff,
  applySectionsLoop,
  applyViewsSectionDiff,
  assertRowApplyPreflight,
  executeRequestPlan,
  formatDeleteSkipDetails,
  inspectRowApplyPreflight,
  resolvePatchPayloadSource,
  sanitizeFetchedBundleForPersistence,
  sanitizeFetchedSectionForPersistence,
  summarizeRowApplyAttempts,
  summarizeSectionExecutionProblem
} from '../../src/reflect/apply';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reflect/apply row-level preflight', () => {
  it('does not silently turn an empty patch editor into an all-differences apply', () => {
    expect(resolvePatchPayloadSource('', null)).toBe('missing');
    expect(resolvePatchPayloadSource('{}', { sections: {} })).toBe('missing');
    expect(resolvePatchPayloadSource('{"sections":{"fieldSettings":[]}}', null)).toBe('editor');
    expect(resolvePatchPayloadSource('', { sections: { fieldSettings: [{}] } })).toBe('imported');
  });

  it('rejects customize virtual rows and PUT-unsupported sections before any write', () => {
    const sections = {
      fieldSettings: [{ path: 'fieldSettings.properties.title.label' }],
      customizeSettings: [{ path: 'customizeSettings.desktop.js[0]._body' }],
      appSettings: [{ path: 'appSettings.name' }]
    };

    const issues = inspectRowApplyPreflight(sections);
    expect(issues.map((issue) => [issue.sectionKey, issue.code])).toEqual([
      ['customizeSettings', 'customize-section-unsupported'],
      ['appSettings', 'unsupported-section']
    ]);
    expect(() => assertRowApplyPreflight(sections)).toThrow(/customizeSettings.*appSettings/);
  });

  it('accepts writable non-customize row sections', () => {
    expect(inspectRowApplyPreflight({
      fieldSettings: [{ path: 'fieldSettings.properties.title.label' }],
      layoutSettings: [{ path: 'layoutSettings.layout[0]' }]
    })).toEqual([]);
  });

  it('ignores empty unsupported sections because they are not execution targets', () => {
    expect(inspectRowApplyPreflight({
      appSettings: [],
      unknownSection: [],
      fieldSettings: [{ path: 'fieldSettings.properties.title.label' }]
    })).toEqual([]);
  });
});

describe('reflect/apply row mutation outcomes', () => {
  it('keeps every applied=false reason so 0/N and partial mutations cannot be reported OK', () => {
    const summary = summarizeRowApplyAttempts([
      {
        row: { _id: 'ok', path: 'fieldSettings.properties.title.label' },
        result: { applied: true, op: 'set' }
      },
      {
        row: { _id: 'missing', path: 'fieldSettings.properties.missing' },
        result: { applied: false, op: 'delete', reason: 'target path not found' }
      },
      {
        row: { _id: 'root', path: 'fieldSettings' },
        result: { applied: false, op: 'skip', reason: 'root delete unsupported' }
      }
    ]);

    expect(summary).toEqual({
      totalCount: 3,
      appliedCount: 1,
      skippedCount: 2,
      skipped: [
        {
          rowId: 'missing',
          path: 'fieldSettings.properties.missing',
          op: 'delete',
          reason: 'target path not found'
        },
        {
          rowId: 'root',
          path: 'fieldSettings',
          op: 'skip',
          reason: 'root delete unsupported'
        }
      ]
    });
  });
});

describe('reflect/apply request and compatibility outcomes', () => {
  it('returns all API failures when stopOnError is false and continues later requests', async () => {
    const api = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('bad request'), { status: 400 }))
      .mockResolvedValueOnce({});
    vi.stubGlobal('kintone', { api });
    const logs: string[] = [];

    const result = await executeRequestPlan('/k/v1/preview', [
      { method: 'PUT', path: '/app/settings.json', body: { app: '1' } },
      { method: 'PUT', path: '/app/layout.json', body: { app: '1' } }
    ], logs, false);

    expect(result.requestCount).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.failures[0]).toMatchObject({
      index: 0,
      method: 'PUT',
      path: '/app/settings.json'
    });
    expect(api).toHaveBeenCalledTimes(2);
    expect(summarizeSectionExecutionProblem({ ...result, deleteSkipCount: 0 }))
      .toContain('APIリクエスト失敗 1/2件');
  });

  it('propagates compatibility deletion skips from views and actions', async () => {
    const viewLogs: string[] = [];
    const actionLogs: string[] = [];

    const views = await applyViewsSectionDiff(
      '/k/v1/preview',
      '1',
      { removed: { name: 'removed' } },
      {},
      viewLogs,
      false
    );
    const actions = await applyActionsSectionDiff(
      '/k/v1/preview',
      '1',
      { removed: { name: 'removed' } },
      {},
      actionLogs,
      false
    );

    expect(views.deleteSkipCount).toBe(1);
    expect(actions.deleteSkipCount).toBe(1);
    expect(summarizeSectionExecutionProblem(views)).toContain('削除未反映 1件');
    expect(formatDeleteSkipDetails([
      { sectionKey: 'viewSettings', sectionLabel: 'ビュー設定', count: 1 },
      { sectionKey: 'actionSettings', sectionLabel: 'アクション設定', count: 2 }
    ])).toBe('ビュー設定: 1件 / アクション設定: 2件');
  });

  it('marks the shared section runner incomplete when a view deletion is skipped', async () => {
    vi.stubGlobal('kintone', {
      api: vi.fn().mockResolvedValue({ views: { removed: { name: 'removed' } } })
    });
    const logs: string[] = [];
    const sectionResults: any[] = [];

    const result = await applySectionsLoop(
      '/k/v1/preview',
      '1',
      { sections: { viewSettings: { views: {} } } },
      ['viewSettings'],
      logs,
      {},
      false,
      { sectionResults }
    );

    expect(result.hadError).toBe(true);
    expect(result.deleteSkips).toEqual([
      { sectionKey: 'viewSettings', sectionLabel: 'ビュー設定', count: 1 }
    ]);
    expect(sectionResults).toEqual([
      expect.objectContaining({ sectionKey: 'viewSettings', status: 'ng' })
    ]);
    expect(logs.some((line) => line.startsWith('NG ビュー設定:') && line.includes('削除未反映 1件')))
      .toBe(true);
  });

  it('reports a type-mismatched array path as unapplied instead of a successful no-op', () => {
    const section = { properties: {} };
    const result = applyDiffRowToSection(section, {
      _id: 'type-mismatch',
      path: 'fieldSettings.properties[0].label',
      left: 'new label',
      right: 'old label'
    }, 'fieldSettings');

    expect(result).toMatchObject({
      applied: false,
      op: 'set',
      reason: 'target path type mismatch'
    });
    expect(result.section).toEqual(section);
  });
});

describe('reflect/apply backup persistence sanitization', () => {
  it('removes only known fetch caches without mutating the source bundle', () => {
    const bundle = {
      sections: {
        customizeSettings: {
          _partial: { kind: 'customizeBody' },
          desktop: {
            js: [{
              type: 'FILE',
              file: { fileKey: 'file-1', name: 'main.js', _body: 'virtual-body' },
              _bodyText: 'secret source',
              _bodyHash: 'deadbeef',
              _bodyUnavailable: 'oversize'
            }],
            css: []
          },
          mobile: { js: [], css: [] }
        },
        pluginSettings: {
          plugins: [{ id: 'plugin-1', _config: { token: 'secret-token' } }]
        },
        fieldSettings: {
          properties: {
            _config: { code: '_config', label: 'keep me' }
          }
        }
      }
    };

    const sanitized = sanitizeFetchedBundleForPersistence(bundle);

    expect(sanitized.sections.customizeSettings).not.toHaveProperty('_partial');
    expect(sanitized.sections.customizeSettings.desktop.js[0]).toEqual({
      type: 'FILE',
      file: { fileKey: 'file-1', name: 'main.js' }
    });
    expect(sanitized.sections.pluginSettings.plugins[0]).toEqual({ id: 'plugin-1' });
    expect(sanitized.sections.fieldSettings.properties._config.label).toBe('keep me');
    expect(bundle.sections.customizeSettings.desktop.js[0]._bodyText).toBe('secret source');
    expect(bundle.sections.pluginSettings.plugins[0]._config.token).toBe('secret-token');
  });

  it('normalizes enriched and raw sections to the same verification value', () => {
    const raw = {
      desktop: { js: [{ type: 'FILE', file: { fileKey: 'file-1', name: 'main.js' } }], css: [] },
      mobile: { js: [], css: [] }
    };
    const enriched = structuredClone(raw) as any;
    enriched.desktop.js[0]._bodyText = 'console.log(1);';
    enriched.desktop.js[0]._bodyHash = '12345678';

    expect(sanitizeFetchedSectionForPersistence('customizeSettings', enriched))
      .toEqual(sanitizeFetchedSectionForPersistence('customizeSettings', raw));
  });
});
