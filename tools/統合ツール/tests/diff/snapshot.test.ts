import { describe, expect, it } from 'vitest';
import {
  buildDiffSnapshotPayload,
  createDiffSnapshotImportState,
  diffSnapshotAppToBundle
} from '../../src/diff/snapshot';

describe('diff/snapshot', () => {
  it('stores only evidence metadata from bundles, without raw settings bodies', () => {
    const payload = buildDiffSnapshotPayload({
      savedAt: '2026-08-16T01:00:00.000Z',
      comparedAt: '2026-08-16T00:30:00.000Z',
      rows: [{ sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.code.label' }],
      sourceBundle: {
        appId: 10,
        guestId: '7',
        preview: true,
        sections: {
          appSettings: { name: '比較元アプリ' },
          fieldSettings: { rawSecretSettingBody: 'DO_NOT_EXPORT' }
        }
      },
      targetBundle: {
        appId: '20',
        preview: false,
        meta: { appName: '比較先アプリ' },
        sections: { fieldSettings: { anotherRawBody: 'ALSO_DO_NOT_EXPORT' } }
      },
      scopes: ['fieldSettings', 'fieldSettings', 'viewSettings'],
      ignoreKeys: 'revision, updatedAt',
      normalization: { viewOrder: true, permissionOrder: false, invalid: 'yes' },
      partialIssues: [{
        sectionKey: 'customizeSettings',
        side: 'source',
        message: '本文未検証',
        files: [{ fileName: 'desktop.js', fileKey: 'abc', reason: 'サイズ上限', rawBody: 'SECRET' }]
      }],
      truncation: { truncated: true, diffLimit: 1000, droppedDiff: 3, rawRows: ['SECRET'] }
    });

    expect(payload.source).toEqual({ appId: 10, guestId: '7', preview: true, appName: '比較元アプリ' });
    expect(payload.target).toEqual({ appId: '20', guestId: '', preview: false, appName: '比較先アプリ' });
    expect(payload.scopes).toEqual(['fieldSettings', 'viewSettings']);
    expect(payload.normalization).toEqual({ viewOrder: true, permissionOrder: false });
    expect(payload.comparedAt).toBe('2026-08-16T00:30:00.000Z');
    const json = JSON.stringify(payload);
    expect(json).not.toContain('DO_NOT_EXPORT');
    expect(json).not.toContain('ALSO_DO_NOT_EXPORT');
    expect(json).not.toContain('rawBody');
    expect(json).not.toContain('rawRows');
  });

  it('clears prior comparison state and keeps a zero-row snapshot exportable', () => {
    const imported = createDiffSnapshotImportState({
      tool: 'kintone-unified-suite',
      type: 'diff-snapshot',
      version: 2,
      savedAt: '2026-08-16T01:00:00.000Z',
      comparedAt: '2026-08-16T00:30:00.000Z',
      rows: [],
      fetchIssues: [],
      partialIssues: [],
      truncation: null,
      source: { appId: '10', guestId: '', preview: false, appName: '比較元' },
      target: { appId: '20', guestId: '8', preview: true, appName: '比較先' },
      scopes: ['fieldSettings'],
      ignoreKeys: 'revision',
      normalization: { fieldOrder: true },
      filters: { section: '', type: '', severity: '' }
    });

    expect(imported.statePatch.lastDiffRows).toEqual([]);
    expect(imported.statePatch.lastDiffAt).toBe('2026-08-16T00:30:00.000Z');
    expect(imported.statePatch.lastSourceBundle).toBeNull();
    expect(imported.statePatch.lastTargetBundle).toBeNull();
    expect(imported.statePatch.importedSourceBundle).toBeNull();
    expect(imported.statePatch.importedTargetBundle).toBeNull();
    expect(imported.statePatch.lastDiffSignature).toBe('');
    expect(imported.statePatch.lastPartialIssues).toEqual([]);
    expect(imported.statePatch.lastDiffTruncation).toBeNull();
    expect(imported.statePatch.diffExportMode).toBe('all');
    expect(imported.statePatch.lastDiffSnapshotContext.scopes).toEqual(['fieldSettings']);
    expect(diffSnapshotAppToBundle(imported.statePatch.lastDiffSnapshotContext.source)).toEqual({
      appId: '10', guestId: '', preview: false, meta: { appName: '比較元' }
    });
  });

  it('imports legacy snapshots without inheriting absent metadata', () => {
    const imported = createDiffSnapshotImportState({
      savedAt: '2025-01-02T03:04:05.000Z',
      rows: [{ sectionKey: 'viewSettings', type: 'changed' }],
      fetchIssues: [{ sectionKey: 'fieldSettings', sourceError: 'HTTP 403' }]
    }, '2026-08-16T02:00:00.000Z');

    expect(imported.snapshot.comparedAt).toBe('2025-01-02T03:04:05.000Z');
    expect(imported.snapshot.source).toBeNull();
    expect(imported.snapshot.target).toBeNull();
    expect(imported.snapshot.scopes).toEqual(['viewSettings']);
    expect(imported.snapshot.ignoreKeys).toBe('');
    expect(imported.snapshot.normalization).toEqual({});
    expect(imported.statePatch.lastPartialIssues).toEqual([]);
    expect(imported.statePatch.lastDiffTruncation).toBeNull();
  });

  it('keeps the scope unknown for a legacy zero-row snapshot', () => {
    const imported = createDiffSnapshotImportState({
      savedAt: '2025-01-02T03:04:05.000Z',
      rows: [],
      fetchIssues: []
    });
    expect(imported.snapshot.scopes).toEqual([]);
    expect(imported.statePatch.lastDiffSnapshotContext.scopes).toEqual([]);
  });
});
