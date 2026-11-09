'use strict';

import { describe, expect, it } from 'vitest';
import { buildSourceDeployRecordMarkdown, buildSourceDeployResultJson, describeSourceDeployResult, stringifySourceDeployResultJson, type SourceRecordInput } from '../../src/deploy/sourceReport.js';
import type { SourceDeployResult } from '../../src/deploy/sourceTypes.js';
import type { DeployRunResult } from '../../src/deploy/types.js';

const deploy: DeployRunResult = {
  mode: 'deploy', batchMode: 'sequential', startedAt: '2026-01-01T00:00:05.000Z', finishedAt: '2026-01-01T00:00:09.000Z',
  apps: [{ appId: '20', guestId: '', name: '営業管理', status: 'success', productionRevisionBefore: '12', previewRevision: '15', productionRevisionAfter: '16', verified: true }],
  backup: { fileName: '本番反映前バックアップ_1アプリ_20260101_000009.json', appCount: 1, generatedAt: '2026-01-01T00:00:06.000Z', environment: 'production', unavailableFiles: [] },
  logs: ['[内部] POST /k/v1/preview/app/deploy.json']
};

const result: SourceDeployResult = {
  goal: 'production',
  apply: {
    logs: ['OK フィールド設定'],
    sections: [
      { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ok' },
      { sectionKey: 'viewSettings', label: '一覧', status: 'skip', message: '変更なし（書き込み不要）' }
    ],
    backup: { generatedAt: '2026-01-01T00:00:03.000Z', scopes: ['fieldSettings', 'viewSettings'], bundle: { secret: 'BUNDLE-BODY' } },
    finalRevision: '15'
  },
  deploy
};

const input: SourceRecordInput = {
  goal: 'production',
  source: { appId: '10', guestId: '', name: '営業テンプレート（開発）', environment: 'production' },
  target: { appId: '20', guestId: '', name: '営業管理' },
  preserveTargetOnly: true,
  lookupMap: { '1': '3' },
  targetPending: { state: 'pending', productionRevision: '12', previewRevision: '14', sectionKeys: ['layoutSettings'], message: '反映先プレビューに以前からの未公開の変更があります。' },
  allowPendingChanges: true,
  sections: [
    { sectionKey: 'fieldSettings', label: 'フィールド設定', selectedCount: 1, totalCount: 3, editedCount: 1, items: [{ kind: '変更', name: '顧客名<b>（name）', details: ['必須: いいえ → はい'] }, { kind: '追加', name: '備考（memo）', details: [] }] },
    { sectionKey: 'viewSettings', label: '一覧', selectedCount: 0, totalCount: 1, editedCount: 0, items: [] }
  ],
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:00:10.000Z',
  result
};

describe('describeSourceDeployResult', () => {
  it('プレビューへの書き込みと本番への反映の結果を 1 文にする', () => {
    expect(describeSourceDeployResult(result)).toEqual({ text: '1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。', tone: 'ok' });
  });

  it('本番へ反映しなかった理由を警告で示す', () => {
    const skipped = describeSourceDeployResult({ goal: 'production', apply: result.apply, deploySkipped: '確認した内容と現在の本番が食い違うため止めました。' });
    expect(skipped.tone).toBe('warn');
    expect(skipped.text).toContain('本番へは反映していません。確認した内容と現在の本番が食い違うため止めました。');
  });
});

describe('buildSourceDeployRecordMarkdown', () => {
  const md = buildSourceDeployRecordMarkdown(input);

  it('反映元・反映先・目標・未公開の変更の了承・バックアップ・取り消し方を示す', () => {
    expect(md.startsWith('# 反映元アプリから本番への反映の記録\n')).toBe(true);
    expect(md).toContain('営業テンプレート（開発）（App 10 / 通常スペース / 本番）');
    expect(md).toContain('- 反映先: 営業管理（App 20 / 通常スペース / プレビュー → 本番）');
    expect(md).toContain('- 目標: 本番まで反映');
    expect(md).toContain('- 参照先変換: 1 → 3');
    expect(md).toContain('本番へ一緒に反映されることを了承して実行');
    expect(md).toContain('バックアップ（反映前のプレビュー）');
    expect(md).toContain('本番反映前バックアップ_1アプリ_20260101_000009.json');
    expect(md).toContain('本番への反映は取り消せません');
    expect(md).toContain('- 結果: 1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。');
  });

  it('項目別の結果と変更の要約を載せ、HTML 風の文字は退避する', () => {
    expect(md).toContain('| フィールド設定 | 1/3 | 1 | 成功 | － |');
    expect(md).toContain('| 一覧 | 0/1 | 0 | 変更なし | 変更なし（書き込み不要） |');
    expect(md).toContain('- **変更** 顧客名\\<b\\>（name）');
    expect(md).toContain('必須: いいえ → はい');
    expect(md).toContain('営業管理（#20）: 成功');
  });

  it('バックアップ本体や内部の通信情報は含めない', () => {
    expect(md).not.toContain('BUNDLE-BODY');
    expect(md).not.toContain('/k/v1/preview/app/deploy.json');
  });

  it('本番へ反映しなかったときは理由と続きの手順を示す', () => {
    const skipped = buildSourceDeployRecordMarkdown({ ...input, result: { goal: 'production', apply: result.apply, deploySkipped: '了承がないため止めました。' } });
    expect(skipped).toContain('- 本番へは反映していません。了承がないため止めました。');
    expect(skipped).toContain('「プレビューの変更を公開」から続けて本番へ反映できます');
  });

  it('プレビューまでのときは本番へ反映していないと書く', () => {
    const preview = buildSourceDeployRecordMarkdown({ ...input, goal: 'preview', result: { goal: 'preview', apply: result.apply } });
    expect(preview).toContain('- 目標: プレビューまで（本番へは反映しない）');
    expect(preview).toContain('目標がプレビューまでのため、本番へは反映していません。');
    expect(preview).toContain('変更を中止');
  });
});

describe('buildSourceDeployResultJson', () => {
  it('バックアップ本体を含めず、選択の件数と書き込み・反映の結果を持つ', () => {
    const json = JSON.parse(stringifySourceDeployResultJson(input));
    expect(json.kind).toBe('kintone-source-deploy-result');
    expect(json.goal).toBe('production');
    expect(json.selection).toEqual([
      { sectionKey: 'fieldSettings', label: 'フィールド設定', selectedCount: 1, totalCount: 3, editedCount: 1 },
      { sectionKey: 'viewSettings', label: '一覧', selectedCount: 0, totalCount: 1, editedCount: 0 }
    ]);
    expect(json.apply.summary).toEqual({ ok: 1, ng: 0, stopped: 0, pending: 0, skip: 1 });
    expect(json.apply.backup).toEqual({ generatedAt: '2026-01-01T00:00:03.000Z', scopes: ['fieldSettings', 'viewSettings'] });
    expect(json.deploy.kind).toBe('kintone-deploy-result');
    expect(json.deploySummary.success).toBe(1);
    expect(JSON.stringify(json)).not.toContain('BUNDLE-BODY');
  });

  it('本番へ反映しなかったときは deploySkipped を持ち、deploy は持たない', () => {
    const json = buildSourceDeployResultJson({ ...input, result: { goal: 'production', apply: result.apply, deploySkipped: '了承がないため止めました。' } });
    expect(json.deploy).toBeUndefined();
    expect(json.deploySkipped).toBe('了承がないため止めました。');
    expect(json.message).toContain('本番へは反映していません');
  });
});
