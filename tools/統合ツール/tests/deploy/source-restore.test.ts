import { describe, expect, it } from 'vitest';
import {
  isDeployBackupFile,
  pickPublishRestoreOptions,
  pickSourceRestoreRequest,
  prepareSourceRestore,
  prepareSourceRestoreFromFile,
  restorableScopes,
  restoreGoalFor,
  restoreSelectionFor,
  restoreSourceLabel
} from '../../src/deploy/sourceRestore';
import type { SourceDeployResult } from '../../src/deploy/sourceTypes';
import type { DeployBackupFile, DeployRunResult } from '../../src/deploy/types';

const bundle = (appId: string, extra: Record<string, any> = {}, guestId = '') => ({
  appId, guestId, preview: false, fetchedAt: '2026-01-01T00:00:00.000Z', meta: { sectionRevisions: {} },
  sections: {
    fieldSettings: { properties: { name: { type: 'SINGLE_LINE_TEXT', code: 'name', label: '取引先' } } },
    layoutSettings: { layout: [] },
    viewSettings: { views: {} },
    reportSettings: { _fetchError: '権限がありません' },
    unknownSection: { x: 1 },
    ...extra
  }
});

const backupFile = (bundles: any[], extra: Partial<DeployBackupFile> = {}): DeployBackupFile => ({
  kind: 'kintone-deploy-backup', version: 1, generatedAt: '2026-01-01T00:00:00.000Z', mode: 'deploy', environment: 'production',
  scopes: ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'unknownSection'], bundles, ...extra
});

describe('restorableScopes', () => {
  it('バックアップにある反映可能な項目を、反映の順で返す（取得失敗・反映できない項目は除く）', () => {
    expect(restorableScopes(bundle('1'))).toEqual(['fieldSettings', 'layoutSettings', 'viewSettings']);
  });
  it('バックアップが書き込んだ項目を記録しているときは、その範囲に絞る', () => {
    expect(restorableScopes(bundle('1'), ['viewSettings', 'fieldSettings'])).toEqual(['fieldSettings', 'viewSettings']);
    expect(restorableScopes(undefined)).toEqual([]);
  });
});

describe('restoreGoalFor / restoreSourceLabel', () => {
  it('反映前の本番を戻すなら本番まで、反映前のプレビューを戻すならプレビューまで', () => {
    expect(restoreGoalFor('production')).toBe('production');
    expect(restoreGoalFor('preview')).toBe('preview');
  });
  it('反映元の表示名は、アプリ名と日時から作る', () => {
    expect(restoreSourceLabel('営業管理', '2026-01-01T00:00:00.000Z')).toMatch(/^反映前のバックアップ（営業管理・.+）$/);
    expect(restoreSourceLabel('営業管理', '')).toBe('反映前のバックアップ（営業管理）');
  });
});

describe('prepareSourceRestore', () => {
  it('複数アプリのバックアップから、戻すアプリの設定を選ぶ', () => {
    const content = backupFile([bundle('1'), bundle('2', { fieldSettings: { properties: {} } }, '')]);
    const prepared = prepareSourceRestore({ content, appId: '2', guestId: '', generatedAt: content.generatedAt, environment: 'production' });
    expect(prepared.ok).toBe(true);
    const plan = prepared.plan!;
    expect(plan.bundles.map(item => item.appId)).toEqual(['1', '2']);
    expect(plan.bundleIndex).toBe(1);
    expect(plan.bundle.appId).toBe('2');
    expect(plan.targetAppId).toBe('2');
    expect(plan.goal).toBe('production');
    expect(plan.scopes).toEqual(['fieldSettings', 'layoutSettings', 'viewSettings']);
  });

  it('ゲストスペースのアプリは、ゲストスペースIDまで合うバンドルを選ぶ', () => {
    const content = backupFile([bundle('1', {}, '5'), bundle('1', {}, '')]);
    expect(prepareSourceRestore({ content, appId: '1', guestId: '5', generatedAt: '', environment: 'production' }).plan?.bundleIndex).toBe(0);
    expect(prepareSourceRestore({ content, appId: '1', guestId: '', generatedAt: '', environment: 'production' }).plan?.bundleIndex).toBe(1);
  });

  it('反映前のプレビューへの書き込み前のバックアップ（bundle・scopes）を戻せる。目標はプレビューまで', () => {
    const content = { generatedAt: '2026-01-01T00:00:00.000Z', scopes: ['viewSettings'], bundle: bundle('7') };
    const prepared = prepareSourceRestore({ content, appId: '7', guestId: '', generatedAt: content.generatedAt, environment: 'preview' });
    expect(prepared.ok).toBe(true);
    expect(prepared.plan?.scopes).toEqual(['viewSettings']);
    expect(prepared.plan?.goal).toBe('preview');
  });

  it('戻せないときは理由を返す（アプリが無い・戻せる内容が無い・読み込めない）', () => {
    const content = backupFile([bundle('1')]);
    expect(prepareSourceRestore({ content, appId: '9', guestId: '', generatedAt: '', environment: 'production' })).toEqual({ ok: false, message: 'バックアップに App 9 の設定がありません。' });
    const empty = backupFile([bundle('1', { fieldSettings: { _fetchError: 'x' }, layoutSettings: { _fetchError: 'x' }, viewSettings: { _fetchError: 'x' } })]);
    expect(prepareSourceRestore({ content: empty, appId: '1', guestId: '', generatedAt: '', environment: 'production' })).toEqual({ ok: false, message: 'バックアップに戻せる内容が見つかりません。' });
    const broken = prepareSourceRestore({ content: { nothing: true }, appId: '1', guestId: '', generatedAt: '', environment: 'production' });
    expect(broken.ok).toBe(false);
    expect(broken.message).toMatch(/^バックアップを読み込めません。/);
  });

  it('メモリ上の JSON を書き換えない（複製して使う）', () => {
    const content = backupFile([bundle('1')]);
    const snapshot = JSON.stringify(content);
    const plan = prepareSourceRestore({ content, appId: '1', guestId: '', generatedAt: '', environment: 'production' }).plan!;
    plan.bundle.sections.fieldSettings.properties.name.label = '変更';
    expect(JSON.stringify(content)).toBe(snapshot);
  });
});

describe('prepareSourceRestoreFromFile（設定JSONから取得で読み込んだバックアップファイル）', () => {
  it('本番反映のバックアップなら、最初のアプリを反映先にし、環境から目標を決める', () => {
    const production = prepareSourceRestoreFromFile(backupFile([bundle('1'), bundle('2')]));
    expect(production.plan).toMatchObject({ targetAppId: '1', targetGuestId: '', goal: 'production', bundleIndex: 0, environment: 'production' });
    const preview = prepareSourceRestoreFromFile(backupFile([bundle('3', {}, '9')], { mode: 'revert', environment: 'preview' }));
    expect(preview.plan).toMatchObject({ targetAppId: '3', targetGuestId: '9', goal: 'preview', environment: 'preview' });
  });
  it('本番反映のバックアップでなければ戻す設定にしない', () => {
    expect(isDeployBackupFile({ bundles: [] })).toBe(false);
    expect(isDeployBackupFile(backupFile([]))).toBe(true);
    expect(prepareSourceRestoreFromFile({ apps: [bundle('1')] })).toEqual({ ok: false, message: '本番反映のバックアップファイルではありません。' });
  });
  it('バックアップ内のアプリを選び直すと、反映先と項目をそのアプリに合わせる', () => {
    const plan = prepareSourceRestoreFromFile(backupFile([bundle('1'), bundle('2', { layoutSettings: { _fetchError: 'x' } }, '4')])).plan!;
    expect(restoreSelectionFor(plan, 1)).toMatchObject({ targetAppId: '2', targetGuestId: '4', scopes: ['fieldSettings', 'viewSettings'] });
    expect(restoreSelectionFor(plan, 5)).toBeNull();
  });
});

describe('pickSourceRestoreRequest（「反映元アプリから本番へ」の結果）', () => {
  const production = backupFile([bundle('20')]);
  const base = (extra: Partial<SourceDeployResult>): SourceDeployResult => ({
    goal: 'production',
    apply: { logs: [], sections: [], finalRevision: '15', backup: { generatedAt: '2026-02-01T00:00:00.000Z', scopes: ['fieldSettings'], bundle: bundle('20') } },
    ...extra
  });
  const deploy = (status: any): DeployRunResult => ({
    mode: 'deploy', batchMode: 'sequential', startedAt: '', finishedAt: '', logs: [],
    apps: [{ appId: '20', guestId: '', name: '営業管理', status, productionRevisionBefore: '1', previewRevision: '2' }],
    backup: { fileName: 'b.json', appCount: 1, generatedAt: production.generatedAt, environment: 'production', unavailableFiles: [], content: production }
  });
  const target = { appId: '20', guestId: '' };

  it('本番へ反映した（成功・完了を確認できない）ときは、反映前の本番のバックアップ', () => {
    for (const status of ['success', 'unknown']) {
      const request = pickSourceRestoreRequest(base({ deploy: deploy(status) }), target);
      expect(request).toMatchObject({ appId: '20', guestId: '', environment: 'production', generatedAt: production.generatedAt });
      expect(request?.content).toBe(production);
    }
  });
  it('本番へ反映しなかった・失敗したときは、反映先プレビューへの書き込み前のバックアップ（目標はプレビューまで）', () => {
    for (const result of [base({ deploy: deploy('failed') }), base({ deploySkipped: '了承なし' }), base({ goal: 'preview' })]) {
      const request = pickSourceRestoreRequest(result, target);
      expect(request).toMatchObject({ environment: 'preview', generatedAt: '2026-02-01T00:00:00.000Z' });
      expect(request?.content).toBe(result.apply.backup);
    }
  });
  it('バックアップが無ければ null', () => {
    expect(pickSourceRestoreRequest({ goal: 'preview', apply: { logs: [], sections: [], finalRevision: '' } }, target)).toBeNull();
  });
});

describe('pickPublishRestoreOptions（「プレビューの変更を公開」の結果）', () => {
  const content = backupFile([bundle('1'), bundle('2'), bundle('3')]);
  const result = (statuses: any[], extra: Partial<DeployRunResult> = {}): DeployRunResult => ({
    mode: 'deploy', batchMode: 'sequential', startedAt: '', finishedAt: '', logs: [],
    apps: statuses.map((status, index) => ({ appId: String(index + 1), guestId: '', name: `アプリ${index + 1}`, status, productionRevisionBefore: '1', previewRevision: '2' })),
    backup: { fileName: 'b.json', appCount: 3, generatedAt: content.generatedAt, environment: 'production', unavailableFiles: [], content },
    ...extra
  });

  it('反映した（成功・完了を確認できない）アプリだけを、バックアップに設定があれば選べる', () => {
    const options = pickPublishRestoreOptions(result(['success', 'failed', 'unknown']));
    expect(options.map(option => [option.appId, option.name, option.request.environment])).toEqual([['1', 'アプリ1', 'production'], ['3', 'アプリ3', 'production']]);
    expect(options[0].request.content).toBe(content);
    expect(pickPublishRestoreOptions(result(['failed', 'cancelled', 'pending']))).toEqual([]);
  });
  it('バックアップ本体が無い・バックアップに無いアプリは選べない', () => {
    expect(pickPublishRestoreOptions(result(['success'], { backup: { fileName: 'b.json', appCount: 1, generatedAt: '', environment: 'production', unavailableFiles: [] } }))).toEqual([]);
    expect(pickPublishRestoreOptions(result(['success', 'success', 'success', 'success'])).map(option => option.appId)).toEqual(['1', '2', '3']);
  });
  it('変更の中止の結果のバックアップ（中止前のプレビュー）は、プレビューまでの対象', () => {
    const revert = backupFile([bundle('1')], { mode: 'revert', environment: 'preview' });
    const options = pickPublishRestoreOptions(result(['success'], { mode: 'revert', backup: { fileName: 'b.json', appCount: 1, generatedAt: revert.generatedAt, environment: 'preview', unavailableFiles: [], content: revert } }));
    expect(options[0].request.environment).toBe('preview');
    expect(prepareSourceRestore(options[0].request).plan?.goal).toBe('preview');
  });
});
