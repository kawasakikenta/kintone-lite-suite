import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeKintone, makeApp, type FakeApp, type FakeCall } from '../deploy/fake-kintone';
import { composeReflectSelectionStandalone, previewReflectStandalone, runApplyPreviewStandalone, type ReflectOptions } from '../../src/tabs/reflect-standalone';
import { runSourceToProductionStandalone } from '../../src/tabs/deploy-source-standalone';
import { orderReflectWrites } from '../../src/reflect/sections';
import { createApplyProgressRows } from '../../src/reflect/applyProgress';
import { reflectSectionLabel } from '../../src/reflect/sections';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const ASSIGNEE_VIEW = '（作業者が自分）';
const assigneeView = (index = '0') => ({ type: 'LIST', builtinType: 'ASSIGNEE', name: ASSIGNEE_VIEW, fields: ['name', 'ステータス'], filterCond: '作業者 in (LOGINUSER())', sort: 'レコード番号 desc', index });
const listView = (name: string, index: string, filterCond = '') => ({ type: 'LIST', name, fields: ['name'], filterCond, sort: 'レコード番号 desc', index });
const fields = () => ({
  properties: {
    name: { type: 'SINGLE_LINE_TEXT', code: 'name', label: '件名', required: false },
    レコード番号: { type: 'RECORD_NUMBER', code: 'レコード番号', label: 'レコード番号' },
    // kintone はプロセス管理が無効なアプリにもステータス・作業者のフィールドを返す（enabled: false）
    ステータス: { type: 'STATUS', code: 'ステータス', label: 'ステータス', enabled: true },
    作業者: { type: 'STATUS_ASSIGNEE', code: '作業者', label: '作業者', enabled: true }
  }
});
const state = (name: string, index: string) => ({ name, index, assignee: { type: 'ONE', entities: [] } });
const processOn = (extra: Record<string, any> = {}) => ({ enable: true, states: { 未処理: state('未処理', '0'), 完了: state('完了', '1'), ...extra }, actions: [{ name: '完了にする', from: '未処理', to: '完了', filterCond: '' }] });
const processOff = () => ({ enable: false, states: null, actions: null });
/** 一覧の名前を表示順（index）で並べる */
const viewOrder = (views: Record<string, any>) => Object.values<any>(views).sort((a, b) => Number(a.index) - Number(b.index)).map(view => view.name);

/**
 * 実テナントで確かめた kintone の動き（2026-11-23。プレビューへ書き込み、変更を中止して戻した）を再現する。
 * - プロセス管理が無効なアプリへ「（作業者が自分）」やステータス・作業者を使う一覧を書くと「プロセス管理機能が無効化されています」で拒否される
 * - 有効なアプリで、自動作成された「（作業者が自分）」を含まない一覧を書くと「削除できません」で拒否される
 * - 一覧の条件に存在しないステータス名があると拒否される
 * - 有効にすると「（作業者が自分）」が作られ、無効にすると削除され、ほかの一覧の条件からステータス・作業者が外れる
 * - ステータス・アクションを空にする PUT は、無効にするときでも拒否される（states は 2〜500 件、actions は 1〜1,000 件）。無効にしてもステータスは残る
 */
function kintoneProcessRules(call: FakeCall, apps: Record<string, FakeApp>) {
  const app = apps[String(call.params?.app)];
  if (!app) return;
  const process = app.preview.processSettings || {};
  const on = process.enable === true;
  const views = app.preview.viewSettings || (app.preview.viewSettings = { views: {} });
  if (call.url.endsWith('/app/views.json')) {
    const next = Object.values<any>(call.params.views || {});
    const usesProcess = next.some(view => view.builtinType === 'ASSIGNEE' || /ステータス|作業者/.test(`${view.filterCond || ''} ${(view.fields || []).join(' ')}`));
    if (!on && usesProcess) throw Object.assign(new Error('操作に失敗しました。プロセス管理機能が無効化されています。'), { code: 'GAIA_PM01' });
    const auto = Object.values<any>(views.views || {}).find(view => view.builtinType === 'ASSIGNEE');
    if (on && auto && !call.params.views[auto.name]) throw Object.assign(new Error(`一覧の更新に失敗しました。「${auto.name}」は自動作成された一覧のため、削除できません。`), { code: 'GAIA_VI01' });
    for (const view of next) for (const match of String(view.filterCond || '').matchAll(/ステータス in \(([^)]*)\)/g)) {
      for (const name of match[1].split(',').map(item => item.trim().replace(/^"|"$/g, ''))) {
        if (!process.states?.[name]) throw Object.assign(new Error(`フィールド「ステータス」の項目に「${name}」は存在しません。`), { code: 'CB_VA01' });
      }
    }
  }
  if (call.url.endsWith('/app/status.json')) {
    const issues = [
      ...(call.params.actions !== undefined && (!Array.isArray(call.params.actions) || call.params.actions.length < 1) ? ['actions: サイズは 1 から 1,000 でなければなりません。'] : []),
      ...(call.params.states !== undefined && Object.keys(call.params.states || {}).length < 2 ? ['states: サイズは 2 から 500 でなければなりません。'] : [])
    ];
    if (issues.length) throw Object.assign(new Error(['入力内容が正しくありません。', ...issues].join(' ')), { code: 'CB_VA01' });
    if (call.params.enable === true && !on) {
      const rest = Object.values<any>(views.views || {}).filter(view => view.builtinType !== 'ASSIGNEE');
      views.views = Object.fromEntries([[ASSIGNEE_VIEW, assigneeView('0')], ...rest.map((view, index) => [view.name, { ...view, index: String(index + 1) }])]);
    } else if (call.params.enable === false && on) {
      views.views = Object.fromEntries(Object.values<any>(views.views || {}).filter(view => view.builtinType !== 'ASSIGNEE')
        .map(view => [view.name, { ...view, filterCond: /ステータス|作業者/.test(view.filterCond || '') ? '' : view.filterCond }]));
    }
  }
}

/** 反映元 1（開発用）と反映先 2。反映先は本番とプレビューが同じ（未公開の変更なし）。 */
function makeProcessWorld(source: { process: any; views: Record<string, any> }, target: { process: any; views: Record<string, any> }) {
  const apps: Record<string, FakeApp> = {
    '1': makeApp({ name: '開発用', prodRevision: '5', previewRevision: '5', production: { fieldSettings: fields(), viewSettings: { views: source.views }, processSettings: source.process } }),
    '2': makeApp({ name: '本番用', prodRevision: '10', previewRevision: '10', production: { fieldSettings: fields(), viewSettings: { views: target.views }, processSettings: target.process } })
  };
  apps['1'].preview = copy(apps['1'].production);
  apps['2'].preview = copy(apps['2'].production);
  const env = createFakeKintone(apps, { onWrite: kintoneProcessRules });
  vi.stubGlobal('kintone', { api: env.api });
  const reflect: ReflectOptions = { sourceAppId: '1', targetAppId: '2', scopes: ['viewSettings', 'processSettings'] };
  return {
    apps, env, reflect,
    writtenKeys: () => env.writes().map(call => call.url.replace('/k/v1/preview', '')),
    async apply(extra: Partial<ReflectOptions> = {}) {
      const opts = { ...reflect, ...extra };
      const preview = await previewReflectStandalone(opts, () => {});
      const result = await runApplyPreviewStandalone({ ...opts, reviewBaseline: preview.baseline, doBackup: false }, () => {}, () => {});
      return { preview, result };
    }
  };
}

const enabledSource = () => ({ process: processOn(), views: { [ASSIGNEE_VIEW]: assigneeView('0'), 一覧: listView('一覧', '1') } });
const disabledSource = () => ({ process: processOff(), views: { 一覧: listView('一覧', '0') } });

beforeEach(() => {
  vi.stubGlobal('document', { createElement: vi.fn(() => ({ href: '', download: '', click() {} })) });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:backup');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('プロセス管理と一覧の書き込み順（プレビュー反映）', () => {
  it('無効な反映先でプロセス管理を有効にするときは、プロセス管理を一覧より先に書く', async () => {
    const world = makeProcessWorld(enabledSource(), disabledSource());
    const { result } = await world.apply();
    expect(result.sections.map(section => [section.sectionKey, section.status])).toEqual([['processSettings', 'ok'], ['viewSettings', 'ok']]);
    expect(world.writtenKeys()).toEqual(['/app/status.json', '/app/views.json']);
    expect(world.apps['2'].preview.processSettings.enable).toBe(true);
    expect(viewOrder(world.apps['2'].preview.viewSettings.views)).toEqual([ASSIGNEE_VIEW, '一覧']);
  });

  it('反映先だけの設定を保持しない（全置換）ときも、有効にする向きは通る', async () => {
    const world = makeProcessWorld(enabledSource(), { process: processOff(), views: { 旧一覧: listView('旧一覧', '0') } });
    const { result } = await world.apply({ preserveTargetOnly: false });
    expect(result.sections.map(section => section.status)).toEqual(['ok', 'ok']);
    expect(Object.keys(world.apps['2'].preview.viewSettings.views).sort()).toEqual([ASSIGNEE_VIEW, '一覧'].sort());
  });

  it('有効な反映先を無効にするとき、「（作業者が自分）」を残さない一覧（全置換）は、プロセス管理の後に書く', async () => {
    const world = makeProcessWorld(disabledSource(), enabledSource());
    const { result } = await world.apply({ preserveTargetOnly: false });
    expect(result.sections.map(section => [section.sectionKey, section.status])).toEqual([['processSettings', 'ok'], ['viewSettings', 'ok']]);
    expect(world.apps['2'].preview.processSettings.enable).toBe(false);
    // 反映元にステータスが無くても空にはせず、反映先のステータス・アクションを残して無効にする
    expect(Object.keys(world.apps['2'].preview.processSettings.states)).toEqual(['未処理', '完了']);
    expect(world.apps['2'].preview.processSettings.actions).toHaveLength(1);
    expect(Object.keys(world.apps['2'].preview.viewSettings.views)).toEqual(['一覧']);
  });

  it('有効な反映先を無効にするとき、「（作業者が自分）」を保持する一覧は、プロセス管理より先に書く', async () => {
    const world = makeProcessWorld(disabledSource(), { process: processOn(), views: { [ASSIGNEE_VIEW]: assigneeView('0'), 処理中: listView('処理中', '1', 'ステータス in ("未処理")') } });
    const { preview, result } = await world.apply();
    // 保持すると示した一覧も kintone が変えるので、差分の確認で知らせる
    const processEntry = preview.entries.find(entry => entry.sectionKey === 'processSettings')!;
    expect(processEntry.warnings.join(' ')).toContain('「（作業者が自分）」の一覧を削除');
    // 変わるのは有効・無効だけ（ステータス・アクションの削除として示さない）
    expect(processEntry.changes.map(change => [change.kind, change.path])).toEqual([['変更', '有効']]);
    expect(result.sections.map(section => [section.sectionKey, section.status])).toEqual([['viewSettings', 'ok'], ['processSettings', 'ok']]);
    expect(world.writtenKeys()).toEqual(['/app/views.json', '/app/status.json']);
    // 無効にした後は kintone が「（作業者が自分）」を削除し、ステータスの条件を外す
    expect(world.apps['2'].preview.viewSettings.views[ASSIGNEE_VIEW]).toBeUndefined();
    expect(world.apps['2'].preview.viewSettings.views.処理中.filterCond).toBe('');
  });

  it('有効のままステータスを足し、そのステータスを条件に使う一覧を書くときも、プロセス管理を先に書く', async () => {
    const source = { process: processOn({ 確認中: state('確認中', '2') }), views: { [ASSIGNEE_VIEW]: assigneeView('0'), 確認待ち: listView('確認待ち', '1', 'ステータス in ("確認中")') } };
    const world = makeProcessWorld(source, enabledSource());
    const { result } = await world.apply();
    expect(result.sections.map(section => [section.sectionKey, section.status])).toEqual([['processSettings', 'ok'], ['viewSettings', 'ok']]);
    expect(world.apps['2'].preview.viewSettings.views.確認待ち.filterCond).toBe('ステータス in ("確認中")');
  });

  it('プロセス管理を書かないとき・無効のままのときは、これまでどおりの順番', async () => {
    const world = makeProcessWorld({ process: processOff(), views: { 一覧: listView('一覧', '0', 'name = "a"') } }, disabledSource());
    const { result } = await world.apply();
    expect(result.sections.map(section => [section.sectionKey, section.status])).toEqual([['viewSettings', 'ok'], ['processSettings', 'skip']]);
  });
});

describe('プロセス管理と一覧の書き込み順（本番反映の「反映元アプリから本番へ」）', () => {
  it('無効な反映先へ、有効なアプリの一覧とプロセス管理を書き込み、続けて本番へ反映できる', async () => {
    const world = makeProcessWorld(enabledSource(), disabledSource());
    const preview = await previewReflectStandalone(world.reflect, () => {});
    const composed = composeReflectSelectionStandalone(preview, {});
    expect(composed.blockers).toEqual([]);
    const result = await runSourceToProductionStandalone({
      reflect: world.reflect, reviewBaseline: preview.baseline, composed: Object.fromEntries(composed.sections.map(section => [section.sectionKey, section.after])),
      goal: 'production', targetPending: preview.targetPending, poll: { initialMs: 1, maxMs: 2, timeoutMs: 5000 }, setStatus: () => {}
    });
    expect(result.apply.sections.map(section => [section.sectionKey, section.status])).toEqual([['processSettings', 'ok'], ['viewSettings', 'ok']]);
    expect(result.deploy?.apps.map(app => app.status)).toEqual(['success']);
    expect(world.apps['2'].production.processSettings.enable).toBe(true);
    expect(viewOrder(world.apps['2'].production.viewSettings.views)).toEqual([ASSIGNEE_VIEW, '一覧']);
  });

  it('有効な反映先を無効にし、「（作業者が自分）」を選ばずに一覧を書き込んでも通る', async () => {
    const world = makeProcessWorld(disabledSource(), enabledSource());
    const opts = { ...world.reflect, preserveTargetOnly: false };
    const preview = await previewReflectStandalone(opts, () => {});
    const composed = composeReflectSelectionStandalone(preview, {});
    expect(composed.blockers).toEqual([]);
    const result = await runSourceToProductionStandalone({
      reflect: opts, reviewBaseline: preview.baseline, composed: Object.fromEntries(composed.sections.map(section => [section.sectionKey, section.after])),
      goal: 'preview', targetPending: preview.targetPending, poll: { initialMs: 1, maxMs: 2, timeoutMs: 5000 }, setStatus: () => {}
    });
    expect(result.apply.sections.map(section => [section.sectionKey, section.status])).toEqual([['processSettings', 'ok'], ['viewSettings', 'ok']]);
    expect(Object.keys(world.apps['2'].preview.viewSettings.views)).toEqual(['一覧']);
  });
});

describe('orderReflectWrites / 進捗の並び', () => {
  const plan = (sectionKey: string, body?: any, extra: Record<string, any> = {}) => ({ sectionKey, operations: body ? [{ body }] : [], ...extra });

  it('有効にする向きは、フィールド・レイアウト・一般設定の直後にプロセス管理を置く', () => {
    const plans = [plan('reportSettings', {}), plan('processSettings', { enable: true }, { values: { before: { enable: false } } }), plan('viewSettings', {}), plan('fieldSettings', {}), plan('appSettings', {}), plan('customizeSettings', {})];
    expect(orderReflectWrites(plans, []).map(item => item.sectionKey)).toEqual(['fieldSettings', 'appSettings', 'processSettings', 'viewSettings', 'reportSettings', 'customizeSettings']);
  });

  it('無効にする向きは、ステータス・作業者を使う項目だけをプロセス管理より先に置く', () => {
    const plans = [
      plan('viewSettings', { views: {} }), plan('reportSettings', {}, { requiredFields: ['ステータス'] }),
      plan('processSettings', { enable: false }, { values: { before: { enable: true } } }), plan('recordPermissions', {}, { requiredFields: ['作業者', 'name'] }), plan('fieldSettings', {})
    ];
    expect(orderReflectWrites(plans, ['ステータス', '作業者']).map(item => item.sectionKey)).toEqual(['fieldSettings', 'reportSettings', 'recordPermissions', 'processSettings', 'viewSettings']);
    // 「（作業者が自分）」を含む一覧も、プロセス管理より先
    const withAssignee = [plan('viewSettings', { views: { a: { builtinType: 'ASSIGNEE' } } }), plan('processSettings', { enable: false }, { values: { before: { enable: true } } })];
    expect(orderReflectWrites(withAssignee, []).map(item => item.sectionKey)).toEqual(['viewSettings', 'processSettings']);
  });

  it('プロセス管理を書かない・無効のまま・書き込み不要のときは既定の順', () => {
    const keys = (plans: any[]) => orderReflectWrites(plans, []).map(item => item.sectionKey);
    expect(keys([plan('processSettings'), plan('viewSettings', {})])).toEqual(['viewSettings', 'processSettings']);
    expect(keys([plan('processSettings', { enable: false }, { values: { before: { enable: false } } }), plan('viewSettings', {})])).toEqual(['viewSettings', 'processSettings']);
    expect(keys([plan('viewSettings', {}), plan('fieldSettings', {})])).toEqual(['fieldSettings', 'viewSettings']);
  });

  it('進捗の一覧は、渡した書き込み順で並べる（渡さなければ既定の順）', () => {
    expect(createApplyProgressRows(['viewSettings', 'processSettings'], reflectSectionLabel, ['processSettings', 'viewSettings']).map(row => row.sectionKey)).toEqual(['processSettings', 'viewSettings']);
    expect(createApplyProgressRows(['processSettings', 'viewSettings'], reflectSectionLabel).map(row => row.sectionKey)).toEqual(['viewSettings', 'processSettings']);
  });
});
