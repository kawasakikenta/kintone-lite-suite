import { describe, expect, it } from 'vitest';
import {
  buildDiffBatchEndpointKey,
  prepareDiffBatchPairs,
  runSequentialDiffBatch,
  type DiffBatchPair
} from '../../src/diff/batch-comparison';

function endpoint(appId: string, guestId = '', preview = false, appName = '') {
  return { appId, guestId, preview, appName };
}

function pair(
  rowNumber: number,
  sourceAppId: string,
  targetAppId: string,
  sourceOverrides: Record<string, unknown> = {},
  targetOverrides: Record<string, unknown> = {}
): DiffBatchPair {
  return {
    rowNumber,
    source: { ...endpoint(sourceAppId), ...sourceOverrides },
    target: { ...endpoint(targetAppId), ...targetOverrides }
  } as DiffBatchPair;
}

describe('diff batch comparison pair planning', () => {
  it('trims values, ignores only fully blank rows, and preserves row order', () => {
    const prepared = prepareDiffBatchPairs([
      { source: {}, target: {} },
      { rowNumber: 4, source: endpoint(' 101 ', ' 7 ', true, ' 元 '), target: endpoint(' 201 ', '', false, ' 先 ') },
      { rowNumber: 8, source: endpoint('102'), target: endpoint('202') }
    ]);

    expect(prepared.issues).toEqual([]);
    expect(prepared.pairs.map((item) => item.rowNumber)).toEqual([4, 8]);
    expect(prepared.pairs[0]).toEqual({
      rowNumber: 4,
      source: endpoint('101', '7', true, '元'),
      target: endpoint('201', '', false, '先')
    });
  });

  it('rejects an incomplete row instead of independently compacting both sides', () => {
    const prepared = prepareDiffBatchPairs([
      { source: endpoint('101'), target: {} },
      { source: {}, target: endpoint('202') }
    ]);

    expect(prepared.pairs).toEqual([]);
    expect(prepared.issues.map((issue) => issue.code)).toEqual(['incomplete', 'incomplete']);
    expect(prepared.issues.map((issue) => issue.message)).toEqual([
      'ペア 1: 比較先のアプリIDを入力してください',
      'ペア 2: 比較元のアプリIDを入力してください'
    ]);
  });

  it('validates app and guest IDs as numeric values', () => {
    const prepared = prepareDiffBatchPairs([
      {
        source: endpoint('app-101', 'guest-7'),
        target: endpoint('202', 'G8')
      }
    ]);

    expect(prepared.pairs).toEqual([]);
    expect(prepared.issues.map((issue) => issue.code)).toEqual([
      'invalid-source-app',
      'invalid-source-guest',
      'invalid-target-guest'
    ]);
  });

  it('keeps normal, guest, and preview endpoints distinct', () => {
    const normal = buildDiffBatchEndpointKey(endpoint('101'));
    const guest = buildDiffBatchEndpointKey(endpoint('101', '7'));
    const preview = buildDiffBatchEndpointKey(endpoint('101', '', true));

    expect(new Set([normal, guest, preview]).size).toBe(3);
    expect(buildDiffBatchEndpointKey(endpoint(' 101 ', ' 7 ', true))).toBe(guest.replace('false', 'true'));
    expect(buildDiffBatchEndpointKey(endpoint('00101', '007', true))).toBe(buildDiffBatchEndpointKey(endpoint('101', '7', true)));
  });

  it('rejects self-comparison, exact duplicate pairs, and repeated one-to-one endpoints', () => {
    const prepared = prepareDiffBatchPairs([
      { source: endpoint('101'), target: endpoint('201') },
      { source: endpoint('102'), target: endpoint('202') },
      { source: endpoint('101'), target: endpoint('201') },
      { source: endpoint('101'), target: endpoint('203') },
      { source: endpoint('104'), target: endpoint('202') },
      { source: endpoint('105'), target: endpoint('105') }
    ]);

    expect(prepared.pairs.map((item) => item.rowNumber)).toEqual([1, 2]);
    expect(prepared.issues.map((issue) => issue.code)).toEqual([
      'duplicate-pair',
      'duplicate-source',
      'duplicate-target',
      'same-endpoint'
    ]);
    expect(prepared.issues[0].relatedRowNumber).toBe(1);
    expect(prepared.issues[1].relatedRowNumber).toBe(1);
    expect(prepared.issues[2].relatedRowNumber).toBe(2);
  });

  it('allows the same app ID when the environment differs and keeps reverse direction distinct', () => {
    const prepared = prepareDiffBatchPairs([
      { source: endpoint('101'), target: endpoint('101', '', true) },
      { source: endpoint('201'), target: endpoint('101') },
      { source: endpoint('101', '', true), target: endpoint('201') }
    ]);

    expect(prepared.issues).toEqual([]);
    expect(prepared.pairs).toHaveLength(3);
    expect(prepared.pairs.map((item) => `${item.source.appId}:${item.source.preview}->${item.target.appId}:${item.target.preview}`)).toEqual([
      '101:false->101:true',
      '201:false->101:false',
      '101:true->201:false'
    ]);
  });

  it('reports the configured batch limit without silently accepting overflow', () => {
    const prepared = prepareDiffBatchPairs([
      { source: endpoint('101'), target: endpoint('201') },
      { source: endpoint('102'), target: endpoint('202') },
      { source: endpoint('103'), target: endpoint('203') }
    ], { maxPairs: 2 });

    expect(prepared.pairs).toHaveLength(2);
    expect(prepared.issues).toEqual([expect.objectContaining({ code: 'too-many', rowNumber: 3 })]);
  });
});

describe('sequential diff batch runner', () => {
  it('runs in input order and reuses a bundle only for an exact endpoint identity', async () => {
    const pairs = [
      pair(1, '101', '201'),
      pair(2, '201', '301'),
      pair(3, '101', '401', { preview: true }),
      pair(4, '101', '501', { guestId: '7' })
    ];
    const calls: Array<Record<string, unknown>> = [];
    let active = 0;
    let maxActive = 0;

    const results = await runSequentialDiffBatch(pairs, async (current, context) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls.push({
        row: current.rowNumber,
        importedSource: (context.importedSourceBundle as any)?.key || '',
        importedTarget: (context.importedTargetBundle as any)?.key || ''
      });
      await Promise.resolve();
      const sourceBundle = context.importedSourceBundle || { key: buildDiffBatchEndpointKey(current.source) };
      const targetBundle = context.importedTargetBundle || { key: buildDiffBatchEndpointKey(current.target) };
      active -= 1;
      return { sourceBundle, targetBundle };
    });

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled', 'fulfilled', 'fulfilled']);
    expect(results.map((result) => result.pair.rowNumber)).toEqual([1, 2, 3, 4]);
    expect(calls[1].importedSource).toBe(buildDiffBatchEndpointKey(endpoint('201')));
    expect(calls[2].importedSource).toBe('');
    expect(calls[3].importedSource).toBe('');
    expect(maxActive).toBe(1);
  });

  it('continues after failure and keeps a source captured before target failure', async () => {
    const pairs = [pair(1, '101', '201'), pair(2, '101', '202'), pair(3, '103', '203')];
    const importedSources: string[] = [];

    const results = await runSequentialDiffBatch(pairs, async (current, context) => {
      importedSources.push((context.importedSourceBundle as any)?.appId || '');
      if (current.rowNumber === 1) {
        context.onSourceBundle({ appId: '101' });
        throw new Error('target fetch failed');
      }
      return {
        sourceBundle: context.importedSourceBundle || { appId: current.source.appId },
        targetBundle: { appId: current.target.appId }
      };
    });

    expect(results.map((result) => result.status)).toEqual(['rejected', 'fulfilled', 'fulfilled']);
    expect(importedSources).toEqual(['', '101', '']);
  });

  it('does not cache a source when acquisition fails before the source callback', async () => {
    const pairs = [pair(1, '101', '201'), pair(2, '101', '202')];
    const importedSources: boolean[] = [];

    const results = await runSequentialDiffBatch(pairs, async (current, context) => {
      importedSources.push(!!context.importedSourceBundle);
      if (current.rowNumber === 1) throw new Error('source fetch failed');
      return {
        sourceBundle: { appId: current.source.appId },
        targetBundle: { appId: current.target.appId }
      };
    });

    expect(results.map((result) => result.status)).toEqual(['rejected', 'fulfilled']);
    expect(importedSources).toEqual([false, false]);
  });
});
