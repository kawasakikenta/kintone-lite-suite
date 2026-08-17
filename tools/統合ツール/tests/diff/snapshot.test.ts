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

  it('redacts identical plugin settings and customize bodies without mutating source rows', () => {
    const rows = [{
      sectionKey: 'pluginSettings', type: 'same', path: 'pluginSettings',
      left: { plugins: [{ config: { token: 'PLUGIN_SAME_SECRET' } }] },
      right: { plugins: [{ config: { token: 'PLUGIN_SAME_SECRET' } }] }
    }, {
      sectionKey: 'customizeSettings', type: 'same', path: 'customizeSettings.desktop.js[0].file._body',
      left: 'CUSTOM_SAME_SECRET', right: 'CUSTOM_SAME_SECRET'
    }];

    const payload = buildDiffSnapshotPayload({ rows, scopes: ['pluginSettings', 'customizeSettings'] });
    const json = JSON.stringify(payload);

    expect(json).not.toContain('PLUGIN_SAME_SECRET');
    expect(json).not.toContain('CUSTOM_SAME_SECRET');
    expect(json).toContain('同一の機密値は安全のため省略しました');
    expect(payload.rows.every((row) => row.sensitiveValueRedacted === true)).toBe(true);
    expect(JSON.stringify(rows)).toContain('PLUGIN_SAME_SECRET');
    expect(JSON.stringify(rows)).toContain('CUSTOM_SAME_SECRET');
  });

  it('round-trips partial, unscanned, and complete truncation section semantics', () => {
    const payload = buildDiffSnapshotPayload({
      savedAt: '2026-08-16T01:00:00.000Z',
      rows: [],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        droppedDiff: 1,
        sections: [
          {
            sectionKey: 'fieldSettings',
            section: 'フィールド設定',
            droppedDiff: 0,
            droppedSame: 0,
            scanned: true,
            partiallyScanned: true,
            scanStatus: 'partial',
            omittedDiffCount: null
          },
          {
            sectionKey: 'viewSettings',
            section: 'ビュー',
            droppedDiff: 0,
            droppedSame: 0,
            scanned: false,
            partiallyScanned: false,
            scanStatus: 'unscanned',
            omittedDiffCount: null
          },
          {
            sectionKey: 'reportSettings',
            section: 'グラフ',
            droppedDiff: 1,
            droppedSame: 0,
            scanned: true,
            partiallyScanned: false,
            scanStatus: 'complete',
            omittedDiffCount: 1
          }
        ]
      }
    });
    const imported = createDiffSnapshotImportState(JSON.parse(JSON.stringify(payload)));

    expect(imported.snapshot.truncation.sections[0]).toEqual({
      sectionKey: 'fieldSettings',
      section: 'フィールド設定',
      droppedDiff: 0,
      droppedSame: 0,
      scanned: true,
      partiallyScanned: true,
      scanStatus: 'partial',
      omittedDiffCount: null
    });
    expect(imported.snapshot.truncation.sections[1]).toEqual({
      sectionKey: 'viewSettings',
      section: 'ビュー',
      droppedDiff: 0,
      droppedSame: 0,
      scanned: false,
      partiallyScanned: false,
      scanStatus: 'unscanned',
      omittedDiffCount: null
    });
    expect(imported.snapshot.truncation.sections[2]).toEqual({
      sectionKey: 'reportSettings',
      section: 'グラフ',
      droppedDiff: 1,
      droppedSame: 0,
      scanned: true,
      partiallyScanned: false,
      scanStatus: 'complete',
      omittedDiffCount: 1
    });
    expect(imported.statePatch.lastDiffTruncation.sections[0].omittedDiffCount).toBeNull();
  });

  it('imports a legacy truncation section as a complete scan with a known omitted count', () => {
    const imported = createDiffSnapshotImportState({
      savedAt: '2025-01-02T03:04:05.000Z',
      rows: [],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        sections: [{ sectionKey: 'reportSettings', section: 'グラフ', droppedDiff: 2 }]
      }
    });

    expect(imported.snapshot.truncation.sections[0]).toMatchObject({
      scanned: true,
      partiallyScanned: false,
      scanStatus: 'complete',
      omittedDiffCount: 2
    });
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
