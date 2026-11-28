import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { downloadText } from '../../src/utils';
import {
  buildSettingsMarkdownIndex,
  formatSettingsExportContentCounts,
  runSettingsExportStandalone,
  settingsExportContentCounts
} from '../../src/tabs/settings-export-standalone';

const SCOPES = vi.hoisted(() => ['appSettings', 'fieldSettings', 'viewSettings', 'reportSettings', 'processSettings', 'actionSettings',
  'pluginSettings', 'customizeSettings', 'notifications', 'perRecordNotifications', 'reminderNotifications']);
vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => SCOPES }));
const zipFiles = vi.hoisted(() => new Map<string, string>());
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: async () => class {
  file(name: string, content: string) { zipFiles.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip fixture']); }
} }));

beforeEach(() => { vi.clearAllMocks(); zipFiles.clear(); });

function appBundle(overrides: Record<string, any> = {}) {
  return {
    appId: '401', guestId: '', preview: false, fetchedAt: '2026-11-01T00:00:00.000Z', meta: { sectionRevisions: {} },
    sections: {
      appSettings: { name: '案件管理' },
      fieldSettings: { properties: {
        title: { code: 'title', type: 'SINGLE_LINE_TEXT', label: '件名' },
        record_no: { code: 'record_no', type: 'RECORD_NUMBER', label: 'レコード番号' },
        items: { code: 'items', type: 'SUBTABLE', label: '明細', fields: { a: { code: 'a', type: 'NUMBER' }, b: { code: 'b', type: 'NUMBER' } } }
      } },
      viewSettings: { views: { 全件: { name: '全件' }, 自分: { name: '自分' } } },
      reportSettings: { reports: {} },
      processSettings: { enable: true, states: { 未処理: {}, 処理中: {}, 完了: {} }, actions: [] },
      actionSettings: { actions: { 見積を作成: { name: '見積を作成' } } },
      pluginSettings: { plugins: [{ id: 'p1' }] },
      customizeSettings: { desktop: { js: [{ type: 'URL' }, { type: 'FILE' }], css: [] }, mobile: { js: [], css: [{ type: 'URL' }] } },
      notifications: { notifications: [{}, {}] },
      perRecordNotifications: { notifications: [{}] },
      reminderNotifications: { notifications: [] },
      ...overrides
    }
  };
}

describe('設定取得: アプリの設定の中身の件数', () => {
  it('取得できたセクションの件数を、設計書と同じ数え方で数える', () => {
    const counts = settingsExportContentCounts(appBundle(), SCOPES);
    expect(counts).toEqual({
      fields: 3, subtableFields: 2, views: 2, reports: 0, process: { enabled: true, states: 3 },
      appActions: 1, plugins: 1, customizeResources: 3, notifications: 3
    });
    expect(formatSettingsExportContentCounts(counts)).toBe('フィールド 3（テーブル内 2）・一覧 2・グラフ 0・プロセス管理 有効（ステータス 3）・アクション 1・プラグイン 1・JS/CSS 3・通知 3');
  });

  it('取得に失敗した・取得しなかったセクションは数えない（通知は 3 つとも取得できたときだけ合計する）', () => {
    const counts = settingsExportContentCounts(appBundle({
      viewSettings: { _fetchError: '権限がありません' },
      reminderNotifications: { _fetchError: '内部エラー' },
      processSettings: { enable: false, states: null, actions: null }
    }), SCOPES.filter((key) => key !== 'pluginSettings'));
    expect(counts.views).toBeUndefined();
    expect(counts.plugins).toBeUndefined();
    expect(counts.notifications).toBeUndefined();
    expect(counts.process).toEqual({ enabled: false, states: 0 });
    expect(formatSettingsExportContentCounts(counts)).toBe('フィールド 3（テーブル内 2）・グラフ 0・プロセス管理 無効・アクション 1・JS/CSS 3');
    expect(formatSettingsExportContentCounts(settingsExportContentCounts({ sections: { appSettings: { name: 'x' } } }, ['appSettings']))).toBe('');
  });

  it('結果表・INDEX.md・manifest.json・JSON の summary に件数を出す', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(appBundle() as any);
    const result = await runSettingsExportStandalone('zip', { apps: [{ appId: '401' }], scopeRoot: {} }, vi.fn());
    expect(result.summaryHtml).toContain('<tr data-settings-contents="401"><td colspan="6"');
    expect(result.summaryHtml).toContain('内容: フィールド 3（テーブル内 2）・一覧 2');
    const manifest = JSON.parse(zipFiles.get('manifest.json')!);
    expect(manifest.apps[0].counts).toMatchObject({ fields: 3, views: 2, process: { enabled: true, states: 3 } });
    const index = zipFiles.get('INDEX.md')!;
    expect(index).toContain('| アプリID | アプリ名 | ゲスト | ファイル | 内容 | 取得OK |');
    expect(index).toMatch(/\| 401 \| 案件管理 \| 通常 \| [^|]+ \| フィールド 3（テーブル内 2）・一覧 2・グラフ 0・プロセス管理 有効（ステータス 3）・アクション 1・プラグイン 1・JS\/CSS 3・通知 3 \| 11 \| 0 \|/);

    await runSettingsExportStandalone('json', { apps: [{ appId: '401' }], scopeRoot: {} }, vi.fn());
    const payload = JSON.parse(vi.mocked(downloadText).mock.calls[0][1]);
    expect(payload.summary[0].counts).toMatchObject({ fields: 3, notifications: 3 });
  });

  it('件数の無い（古い）manifest の INDEX.md は「-」にする', () => {
    const index = buildSettingsMarkdownIndex({ apps: [{ appId: '1', appName: 'a', file: 'x.json', sections: { ok: 1, ng: 0 } }] });
    expect(index).toContain('| 1 | a | 通常 | x.json | - | 1 | 0 |');
  });
});
