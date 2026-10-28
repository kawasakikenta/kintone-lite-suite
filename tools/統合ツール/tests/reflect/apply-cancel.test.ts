import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CANCEL_PENDING_MESSAGE,
  CANCEL_UNSENT_MESSAGE,
  applySectionsLoop,
  describeCancelledApply,
  executeRequestPlan,
  summarizeSectionExecutionProblem
} from '../../src/reflect/apply';
import { previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';
import { __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';

afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
});

const requests = () => [
  { method: 'PUT', path: '/app/settings.json', body: { app: '1' } },
  { method: 'PUT', path: '/app/form/layout.json', body: { app: '1' } },
  { method: 'PUT', path: '/app/views.json', body: { app: '1' } }
];

describe('reflect/apply request loop on cancel', () => {
  it('stops before the second request, counts the first as success and lists the rest as unsent', async () => {
    beginRun();
    const api = vi.fn(async () => {
      requestCancel();
      return {};
    });
    vi.stubGlobal('kintone', { api });
    const logs: string[] = [];

    const result = await executeRequestPlan('/k/v1/preview', requests(), logs, true);

    expect(api).toHaveBeenCalledTimes(1);
    expect(result.cancelled).toBe(true);
    expect(result.requestCount).toBe(3);
    expect(result.successCount).toBe(1);
    expect(result.unsentCount).toBe(2);
    expect(result.failureCount).toBe(2);
    expect(result.failures.map((failure) => [failure.index, failure.path, failure.message])).toEqual([
      [1, '/app/form/layout.json', CANCEL_UNSENT_MESSAGE],
      [2, '/app/views.json', CANCEL_UNSENT_MESSAGE]
    ]);
    expect(CANCEL_UNSENT_MESSAGE).toBe('利用者の操作で中止しました（未送信）');
    expect(logs.some((line) => line.includes('未送信 2 件') && line.includes('送信済みの 1 件'))).toBe(true);
    const problem = summarizeSectionExecutionProblem({ ...result, deleteSkipCount: 0 });
    expect(problem).toContain('未送信 2/3件');
    expect(problem).not.toContain('APIリクエスト失敗');
  });

  it('does not send anything when the cancel was requested before the first request', async () => {
    beginRun();
    requestCancel();
    const api = vi.fn(async () => ({}));
    vi.stubGlobal('kintone', { api });

    const result = await executeRequestPlan('/k/v1/preview', requests(), [], false);

    expect(api).not.toHaveBeenCalled();
    expect(result).toMatchObject({ cancelled: true, successCount: 0, failureCount: 3, unsentCount: 3 });
  });

  it('does not retry after cancel and keeps the last failure in the record', async () => {
    beginRun();
    const api = vi.fn(async () => {
      requestCancel();
      throw Object.assign(new Error('gateway down'), { status: 503 });
    });
    vi.stubGlobal('kintone', { api });

    const result = await executeRequestPlan('/k/v1/preview', requests().slice(0, 2), [], false);

    expect(api).toHaveBeenCalledTimes(1);
    expect(result.cancelled).toBe(true);
    expect(result.successCount).toBe(0);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0].message).toContain('直前の失敗: gateway down');
    expect(result.failures[1].message).toBe(CANCEL_UNSENT_MESSAGE);
  });

  it('stops the section runner at the first cancel and marks the rest as pending', async () => {
    beginRun();
    const api = vi.fn(async (_url: string, method: string) => {
      if (method === 'GET') return { views: {}, reports: {} };
      requestCancel();
      return {};
    });
    vi.stubGlobal('kintone', { api });
    const logs: string[] = [];
    const sectionResults: any[] = [];

    const result = await applySectionsLoop(
      '/k/v1/preview',
      '1',
      { sections: { viewSettings: { views: { List: { type: 'LIST', fields: [], index: '0' } } }, reportSettings: { reports: {} } } },
      ['viewSettings', 'reportSettings'],
      logs,
      {},
      false,
      { sectionResults }
    );

    expect(result.cancelled).toBe(true);
    expect(result.hadError).toBe(true);
    expect(sectionResults.map((section) => [section.sectionKey, section.status])).toEqual([
      ['viewSettings', 'ok'],
      ['reportSettings', 'pending']
    ]);
    expect(sectionResults[1].message).toBe(CANCEL_PENDING_MESSAGE);
    expect(api.mock.calls.filter(([, method]) => method !== 'GET')).toHaveLength(1);
    expect(logs.some((line) => line.startsWith('NG '))).toBe(false);
    const summary = describeCancelledApply('プレビュー反映', sectionResults);
    expect(summary).toContain('中止しました');
    expect(summary).toContain('反映済み 1 セクション');
    expect(summary).toContain('未実行 1');
    expect(summary).toContain('一部だけ更新されている可能性');
  });
});

describe('lite preview reflection on cancel', () => {
  it('stops after the write in flight, leaves the rest pending and still returns the outcome', async () => {
    const targetSections: Record<string, any> = {
      layoutSettings: { layout: [] },
      viewSettings: { views: {} },
      reportSettings: { reports: {} }
    };
    const endpoints: Record<string, string> = {
      '/app/form/layout.json': 'layoutSettings',
      '/app/views.json': 'viewSettings',
      '/app/reports.json': 'reportSettings'
    };
    let revision = 10;
    const api = vi.fn(async (url: string, method: string) => {
      const key = Object.entries(endpoints).find(([endpoint]) => url.endsWith(endpoint))?.[1];
      if (!key) throw new Error(`Unexpected endpoint: ${url}`);
      if (method === 'GET') return { ...JSON.parse(JSON.stringify(targetSections[key])), revision: String(revision) };
      revision += 1;
      // 最初の書き込みが返った直後に利用者が「中止」を押した状況。
      requestCancel();
      return { revision: String(revision) };
    });
    vi.stubGlobal('kintone', { api });
    const opts = {
      sourceAppId: '1',
      sourceBundle: {
        appId: '1',
        sections: {
          layoutSettings: { layout: [{ type: 'ROW', fields: [] }] },
          viewSettings: { views: { List: { type: 'LIST', fields: [], index: 0 } } },
          reportSettings: { reports: { R: { chartType: 'BAR', chartMode: 'NORMAL', name: 'R', index: 0, groups: [], aggregations: [], filterCond: '', sorts: [] } } }
        }
      },
      targetAppId: '2',
      scopes: ['layoutSettings', 'viewSettings', 'reportSettings']
    };
    const preview = await previewReflectStandalone(opts, () => {});
    beginRun();
    const updates: Array<[string, string]> = [];

    const result = await runApplyPreviewStandalone(
      { ...opts, reviewBaseline: preview.baseline, stopOnError: false, onSectionUpdate: (update) => updates.push([update.sectionKey, update.status]) },
      () => {},
      () => {}
    );

    const writes = api.mock.calls.filter(([, method]) => method !== 'GET');
    expect(writes).toHaveLength(1);
    expect(result.cancelled).toBe(true);
    expect(result.sections.map((section) => [section.sectionKey, section.status])).toEqual([
      ['layoutSettings', 'ok'],
      ['viewSettings', 'pending'],
      ['reportSettings', 'pending']
    ]);
    expect(result.sections[1].message).toBe('中止のため未実行');
    expect(result.finalRevision).toBe('11');
    expect(updates).toContainEqual(['reportSettings', 'pending']);
    expect(result.logs.some((line) => line.includes('利用者の操作で中止しました（反映済み 1 件 / 未実行 2 件）'))).toBe(true);
  });
  it('marks a section stopped partway by cancel as 途中で停止 (stopped), not as a failure', async () => {
    const targetSections: Record<string, any> = {
      fieldSettings: { properties: { existing: { type: 'NUMBER', code: 'existing' } } },
      viewSettings: { views: {} }
    };
    const endpoints: Record<string, string> = { '/app/form/fields.json': 'fieldSettings', '/app/views.json': 'viewSettings' };
    let revision = 10;
    const api = vi.fn(async (url: string, method: string) => {
      const key = Object.entries(endpoints).find(([endpoint]) => url.endsWith(endpoint))?.[1];
      if (!key) throw new Error(`Unexpected endpoint: ${url}`);
      if (method === 'GET') return { ...JSON.parse(JSON.stringify(targetSections[key])), revision: String(revision) };
      revision += 1;
      // フィールド追加（1 件目の書き込み）が返った直後に「中止」を押した状況。同じ項目の更新はまだ送っていない。
      requestCancel();
      return { revision: String(revision) };
    });
    vi.stubGlobal('kintone', { api });
    const opts = {
      sourceAppId: '1',
      sourceBundle: {
        appId: '1',
        sections: {
          fieldSettings: { properties: {
            added: { type: 'SINGLE_LINE_TEXT', code: 'added', label: '追加' },
            existing: { type: 'NUMBER', code: 'existing', label: '更新後' }
          } },
          viewSettings: { views: { List: { type: 'LIST', fields: [], index: 0 } } }
        }
      },
      targetAppId: '2',
      scopes: ['fieldSettings', 'viewSettings']
    };
    const preview = await previewReflectStandalone(opts, () => {});
    beginRun();
    const updates: Array<{ sectionKey: string; status: string; stopped?: boolean }> = [];
    const result = await runApplyPreviewStandalone(
      { ...opts, reviewBaseline: preview.baseline, onSectionUpdate: (update) => updates.push(update) },
      () => {},
      () => {}
    );
    expect(result.cancelled).toBe(true);
    expect(result.sections.map((section) => [section.sectionKey, section.status, section.stopped === true])).toEqual([
      ['fieldSettings', 'ng', true],
      ['viewSettings', 'pending', false]
    ]);
    expect(result.sections[0].message).toContain('フィールド追加 まで書き込み済み');
    expect(updates.find((update) => update.sectionKey === 'fieldSettings' && update.status === 'ng')?.stopped).toBe(true);
    expect(result.logs.join('\n')).toMatch(/NG 0 \/ 途中で停止 1/);
  });
});
