import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { previewReflectStandalone, runApplyPreviewStandalone } from '../../src/tabs/reflect-standalone';

vi.mock('../../src/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api')>();
  return { ...actual, fetchBundle: vi.fn() };
});

type SettingsBundle = {
  appId: string;
  meta: { sectionRevisions: Record<string, string> };
  sections: Record<string, any>;
};

function makeBundle(appId: string, revision: string): SettingsBundle {
  return {
    appId,
    meta: { sectionRevisions: { viewSettings: revision, layoutSettings: revision } },
    sections: {
      viewSettings: { views: { Review: { type: 'LIST', name: `App ${appId}`, index: 0 } } },
      layoutSettings: { layout: [{ type: 'ROW', fields: [{ type: 'SPACER', elementId: `space${appId}` }] }] }
    }
  };
}

const defaultOptions = () => ({
  sourceAppId: '1',
  sourceGuestId: '',
  sourcePreview: false,
  targetAppId: '2',
  targetGuestId: '',
  scopes: ['viewSettings'],
  lookupMap: {} as Record<string, string>
});

let source: SettingsBundle;
let target: SettingsBundle;
let writes: ReturnType<typeof vi.fn>;
let saveBackup: ReturnType<typeof vi.fn>;
let backupBlobs: Blob[];
let events: string[];

beforeEach(() => {
  vi.useFakeTimers();
  source = makeBundle('1', '10');
  target = makeBundle('2', '20');
  backupBlobs = [];
  events = [];
  vi.mocked(fetchBundle).mockReset();
  vi.mocked(fetchBundle).mockImplementation(async (opts) => {
    const original = opts.appId === '1' ? source : target;
    events.push(`fetch:${opts.appId}`);
    const bundle = structuredClone(original);
    bundle.sections = Object.fromEntries(opts.sections
      .filter((key) => Object.hasOwn(bundle.sections, key))
      .map((key) => [key, bundle.sections[key]]));
    return bundle as any;
  });
  writes = vi.fn(async () => {
    events.push('write');
    return { revision: '21' };
  });
  vi.stubGlobal('kintone', { api: writes });
  saveBackup = vi.fn(() => { events.push('backup'); });
  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({ href: '', download: '', click: saveBackup }))
  });
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    backupBlobs.push(blob as Blob);
    return 'blob:reflect-backup';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function apply(opts: any) {
  return runApplyPreviewStandalone(opts, () => {}, () => {});
}

function expectNoSavedBackupOrWrites() {
  expect(saveBackup).not.toHaveBeenCalled();
  expect(backupBlobs).toHaveLength(0);
  expect(writes).not.toHaveBeenCalled();
}

describe('standalone reflection review and backup preflight', () => {
  it('requires a reviewed baseline before fetching or writing anything', async () => {
    await expect(apply({ ...defaultOptions(), doBackup: true }))
      .rejects.toThrow('反映前に差分を取得して確認してください');
    expect(fetchBundle).not.toHaveBeenCalled();
    expectNoSavedBackupOrWrites();
  });

  it.each([
    ['source', 'content', '比較元'],
    ['source', 'revision', '比較元'],
    ['target', 'content', '比較先プレビュー'],
    ['target', 'revision', '比較先プレビュー']
  ])('rejects an external %s %s change before backup or writes', async (side, change, label) => {
    const opts = defaultOptions();
    const reviewed = await previewReflectStandalone(opts, () => {});
    const bundle = side === 'source' ? source : target;
    if (change === 'content') bundle.sections.viewSettings.views.Review.name = '別の利用者による編集';
    else bundle.meta.sectionRevisions.viewSettings = '99';

    await expect(apply({ ...opts, doBackup: true, reviewBaseline: reviewed.baseline }))
      .rejects.toThrow(`差分確認後に${label}`);
    expectNoSavedBackupOrWrites();
  });

  it.each([
    { sourceAppId: '3' },
    { sourceGuestId: '8' },
    { sourcePreview: true },
    { targetAppId: '3' },
    { targetGuestId: '8' },
    { lookupMap: { '100': '200' } }
  ])('rejects connection or lookup changes after review: %j', async (changed) => {
    const opts = defaultOptions();
    const reviewed = await previewReflectStandalone(opts, () => {});

    await expect(apply({ ...opts, ...changed, doBackup: true, reviewBaseline: reviewed.baseline }))
      .rejects.toThrow('確認済みの差分と反映条件が一致しません');
    expectNoSavedBackupOrWrites();
  });

  it('rejects newly selected scopes even when the first reviewed scope could be written', async () => {
    const opts = defaultOptions();
    const reviewed = await previewReflectStandalone(opts, () => {});

    await expect(apply({
      ...opts,
      scopes: ['viewSettings', 'layoutSettings'],
      doBackup: true,
      reviewBaseline: reviewed.baseline
    })).rejects.toThrow('完全に確認できないため反映を中止');
    expectNoSavedBackupOrWrites();
  });

  it.each(['missing', 'fetch-error', 'partial'])('does not save a %s backup or begin writing', async (failure) => {
    const opts = defaultOptions();
    const reviewed = await previewReflectStandalone(opts, () => {});
    if (failure === 'missing') delete target.sections.viewSettings;
    if (failure === 'fetch-error') target.sections.viewSettings = { _fetchError: '権限がありません' };
    if (failure === 'partial') target.sections.viewSettings._partial = { message: '一部未取得' };

    await expect(apply({ ...opts, doBackup: true, reviewBaseline: reviewed.baseline }))
      .rejects.toThrow('バックアップを完全に取得できなかったため反映を中止');
    expectNoSavedBackupOrWrites();
  });

  it('saves the complete rechecked target before writing without fetching it a third time', async () => {
    const opts = defaultOptions();
    const reviewed = await previewReflectStandalone(opts, () => {});
    const result = await apply({ ...opts, doBackup: true, reviewBaseline: reviewed.baseline });

    expect(events).toEqual(['fetch:1', 'fetch:2', 'fetch:1', 'fetch:2', 'backup', 'write']);
    expect(vi.mocked(fetchBundle).mock.calls.filter(([request]) => request.appId === '2')).toHaveLength(2);
    expect(saveBackup).toHaveBeenCalledOnce();
    const backup = JSON.parse(await backupBlobs[0].text());
    expect(backup.scopes).toEqual(['viewSettings']);
    expect(backup.bundle.appId).toBe('2');
    expect(backup.bundle.meta.sectionRevisions.viewSettings).toBe('20');
    expect(backup.bundle.sections).toEqual({ viewSettings: target.sections.viewSettings });
    expect(writes).toHaveBeenCalledWith('/k/v1/preview/app/views.json', 'PUT', {
      app: '2', views: source.sections.viewSettings.views, revision: '20'
    });
    expect(result.sections).toEqual([{ sectionKey: 'viewSettings', label: 'ビュー設定', status: 'ok' }]);
    expect(result.logs).toContain('バックアップ取得完了（保存を開始しました）');
    await vi.advanceTimersByTimeAsync(5000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reflect-backup');
  });

  it.each([
    ['source', ''], ['source', '-1'], ['target', ''], ['target', 'invalid']
  ])('requires a valid %s API revision (%j)', async (side, revision) => {
    const bundle = side === 'source' ? source : target;
    bundle.meta.sectionRevisions.viewSettings = revision;
    const opts = defaultOptions();
    const reviewed = await previewReflectStandalone(opts, () => {});

    await expect(apply({ ...opts, doBackup: true, reviewBaseline: reviewed.baseline }))
      .rejects.toThrow('revisionを確認できないため反映を中止');
    expectNoSavedBackupOrWrites();
  });

  it.each(['source', 'target'])('rejects a %s snapshot captured across different app revisions', async (side) => {
    const bundle = side === 'source' ? source : target;
    bundle.meta.sectionRevisions.layoutSettings = '99';
    const opts = { ...defaultOptions(), scopes: ['viewSettings', 'layoutSettings'] };
    const reviewed = await previewReflectStandalone(opts, () => {});

    await expect(apply({ ...opts, doBackup: true, reviewBaseline: reviewed.baseline }))
      .rejects.toThrow('取得中に設定が更新された可能性');
    expectNoSavedBackupOrWrites();
  });

  it('allows a reviewed source JSON without revisions and only fetches the target', async () => {
    const opts = {
      ...defaultOptions(),
      sourceBundle: { appId: '1', sections: structuredClone(source.sections) }
    };
    const reviewed = await previewReflectStandalone(opts, () => {});
    const result = await apply({ ...opts, reviewBaseline: reviewed.baseline });

    expect(vi.mocked(fetchBundle).mock.calls.map(([request]) => request.appId)).toEqual(['2', '2']);
    expect(writes).toHaveBeenCalledWith('/k/v1/preview/app/views.json', 'PUT', {
      app: '2', views: opts.sourceBundle.sections.viewSettings.views, revision: '20'
    });
    expect(result.sections[0].status).toBe('ok');
  });

  it('keeps reviewed JSON content fixed when the caller changes the original object', async () => {
    const opts = {
      ...defaultOptions(),
      sourceBundle: { appId: '1', sections: structuredClone(source.sections) }
    };
    const reviewed = await previewReflectStandalone(opts, () => {});
    opts.sourceBundle.sections.viewSettings.views.Review.name = '確認後のJSON編集';

    await expect(apply({ ...opts, doBackup: true, reviewBaseline: reviewed.baseline }))
      .rejects.toThrow('差分確認後に比較元');
    expectNoSavedBackupOrWrites();
  });

  it('allows excluding a failed JSON scope while preserving review of the remaining scope', async () => {
    const opts = {
      ...defaultOptions(),
      scopes: ['viewSettings', 'layoutSettings'],
      sourceBundle: {
        appId: '1',
        sections: {
          viewSettings: structuredClone(source.sections.viewSettings),
          layoutSettings: { _fetchError: 'JSON作成時に取得できませんでした' }
        }
      }
    };
    const reviewed = await previewReflectStandalone(opts, () => {});
    expect(reviewed.errorSections).toBe(1);
    expect(reviewed.entries.find((entry) => entry.sectionKey === 'layoutSettings')?.status).toBe('src-missing');
    await expect(apply({ ...opts, doBackup: true, reviewBaseline: reviewed.baseline }))
      .rejects.toThrow('比較元のレイアウト設定を完全に確認できないため反映を中止');
    expectNoSavedBackupOrWrites();

    const result = await apply({ ...opts, scopes: ['viewSettings'], doBackup: true, reviewBaseline: reviewed.baseline });
    expect(result.sections.map((entry) => [entry.sectionKey, entry.status])).toEqual([['viewSettings', 'ok']]);
    expect(writes).toHaveBeenCalledOnce();
    const backup = JSON.parse(await backupBlobs[0].text());
    expect(Object.keys(backup.bundle.sections)).toEqual(['viewSettings']);
  });
});
