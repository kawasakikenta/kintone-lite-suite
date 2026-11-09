'use strict';

import { describe, expect, it } from 'vitest';
import { buildDeployPlanMarkdown, buildDeployRecordMarkdown, buildDeployResultJson, stringifyDeployResultJson } from '../../src/deploy/report.js';
import type { DeployAppInspection, DeployAppOutcome, DeployRunResult } from '../../src/deploy/types.js';

function inspection(appId: string, extra: Partial<DeployAppInspection> = {}): DeployAppInspection {
  return {
    appId, guestId: '', name: `アプリ${appId}`, state: 'changes', productionRevision: '10', previewRevision: '12', sections: [], removedFields: [], warnings: [],
    inspectedAt: '2026-01-01T00:00:00.000Z', ...extra
  };
}

const fieldSection = {
  sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'change' as const, counts: { added: 1, changed: 1, removed: 1 },
  items: [
    { kind: '追加' as const, name: '備考<b>（memo）', details: ['種類: 文字列（1行）'] },
    { kind: '削除' as const, name: '旧項目（old_code）', details: ['フィールドを削除します'] },
    { kind: '変更' as const, name: '顧客名（customer）', details: ['必須: いいえ → はい'] }
  ]
};

const apps: DeployAppInspection[] = [
  inspection('101', {
    name: '営業管理',
    sections: [fieldSection, { sectionKey: 'layoutSettings', label: 'レイアウト設定', status: 'same', items: [], counts: { added: 0, changed: 0, removed: 0 } }],
    removedFields: [{ code: 'old_code', label: '旧項目', type: 'SINGLE_LINE_TEXT', possibleRename: 'new_code' }],
    warnings: ['プレビューに以前からの未公開の変更があります。'],
    productionBundle: { appId: '101', secret: 'BUNDLE-BODY' } as any
  }),
  inspection('103', { name: '在庫', state: 'clean', productionRevision: '8', previewRevision: '8' }),
  inspection('104', { name: '', state: 'error', error: '取得できませんでした（GAIA_NO01）', productionRevision: '', previewRevision: '' })
];

describe('buildDeployPlanMarkdown', () => {
  const md = buildDeployPlanMarkdown({ generatedAt: '2026-01-01T00:00:00.000Z', mode: 'deploy', batchMode: 'sequential', stopOnError: true, apps, selectedKeys: ['/101'] });

  it('方向・対象数・反映の方法・バックアップ・取り消し方を示す', () => {
    expect(md.startsWith('# 本番反映の計画\n')).toBe(true);
    expect(md).toContain('- 方向: プレビュー → 本番');
    expect(md).toContain('- 対象: 1 アプリ（確認した 3 アプリのうち）');
    expect(md).toContain('- 反映の方法: 1アプリずつ反映（失敗したら残りを実行しない）');
    expect(md).toContain('反映前の本番設定（1 アプリ分');
    expect(md).toContain('本番への反映は取り消せません。');
    expect(md).toContain('まだ本番へは反映していません。');
  });

  it('概要の表に状態・実行の対象・revision を並べる', () => {
    expect(md).toContain('| 営業管理（#101） | 変更あり | 対象 | フィールド設定 | 1 | 10 → 12 |');
    expect(md).toContain('| 在庫（#103） | 未公開の変更なし | 対象外（反映不要） | － | 0 | 8 → 8 |');
    expect(md).toContain('| App 104 | 取得失敗 | 対象外 | － | 0 | － → － |');
  });

  it('削除されるフィールドと、コードを変えただけの可能性を示す', () => {
    expect(md).toContain('## 削除されるフィールド');
    expect(md).toContain('本番へ反映すると、これらのフィールドのレコードの値も削除され、元に戻せません。');
    expect(md).toContain('フィールドコードを変えただけなら値は残る可能性があります');
    expect(md).toContain('new\\_code');
  });

  it('変更の要約を削除・変更・追加の順に書き、記号を退避し、設定本体は含めない', () => {
    const lines = md.split('\n');
    const del = lines.findIndex((line) => line.includes('**削除**'));
    const chg = lines.findIndex((line) => line.includes('**変更**'));
    const add = lines.findIndex((line) => line.includes('**追加**'));
    expect(del).toBeGreaterThan(-1);
    expect(del).toBeLessThan(chg);
    expect(chg).toBeLessThan(add);
    expect(md).toContain('備考\\<b\\>（memo）');
    expect(md).not.toContain('BUNDLE-BODY');
    expect(md).toContain('- 注意: プレビューに以前からの未公開の変更があります。');
  });

  it('対象外のアプリを理由つきで並べる', () => {
    expect(md).toContain('## 対象外のアプリ');
    expect(md).toContain('- App 104: 取得失敗（取得できませんでした（GAIA\\_NO01））');
  });

  it('変更を中止の計画は見出しと方向、削除フィールドの警告が変わる', () => {
    const revert = buildDeployPlanMarkdown({ generatedAt: '2026-01-01T00:00:00.000Z', mode: 'revert', batchMode: 'atomic', stopOnError: true, apps, selectedKeys: ['/101'] });
    expect(revert.startsWith('# 変更の中止の計画\n')).toBe(true);
    expect(revert).toContain('- 方向: プレビューの変更を破棄して本番の設定に戻す');
    expect(revert).toContain('## アプリ別の破棄される変更');
    expect(revert).not.toContain('## 削除されるフィールド');
    expect(revert).toContain('中止前のプレビューの設定');
    expect(revert).toContain('まとめて反映（すべて成功したときだけ本番へ反映）');
    expect(revert).toContain('破棄した変更は、バックアップJSONをプレビュー反映で読み込むと戻せます。');
  });

  it('変更の要約が多いときは項目ごとに 50 件で切る', () => {
    const many = inspection('9', { sections: [{ ...fieldSection, items: Array.from({ length: 80 }, (_, i) => ({ kind: '追加' as const, name: `項目${i}`, details: [] })) }] });
    const text = buildDeployPlanMarkdown({ generatedAt: '2026-01-01T00:00:00.000Z', mode: 'deploy', batchMode: 'sequential', stopOnError: true, apps: [many], selectedKeys: ['/9'] });
    expect(text).toContain('- ほか 30 件');
    expect(text).toContain('項目49');
    expect(text).not.toContain('項目50');
  });
});

function outcome(appId: string, status: DeployAppOutcome['status'], extra: Partial<DeployAppOutcome> = {}): DeployAppOutcome {
  return { appId, guestId: '', name: `アプリ${appId}`, status, productionRevisionBefore: '10', previewRevision: '12', ...extra };
}

const result: DeployRunResult = {
  mode: 'deploy', batchMode: 'sequential', startedAt: '2026-01-01T00:00:00.000Z', finishedAt: '2026-01-01T00:01:00.000Z',
  apps: [
    outcome('101', 'success', { name: '営業管理', productionRevisionAfter: '13', verified: true }),
    outcome('102', 'failed', { message: '権限がありません（GAIA_NO01）\n[API] POST /k/v1/preview/app/deploy.json' }),
    outcome('103', 'pending', { message: '前のアプリの失敗のため実行していません。' })
  ],
  backup: { fileName: '本番反映前バックアップ_3アプリ_20260101_000000.json', appCount: 3, generatedAt: '2026-01-01T00:00:00.000Z', environment: 'production', unavailableFiles: [{ appId: '101', name: 'app.js', reason: '取得できませんでした' }] },
  logs: ['[API] POST /k/v1/preview/app/deploy.json 403']
};

describe('buildDeployRecordMarkdown', () => {
  const md = buildDeployRecordMarkdown({ result, inspections: [apps[0], inspection('102'), inspection('103')], stopOnError: true });

  it('結果・件数・バックアップ・取り消し方を示す', () => {
    expect(md.startsWith('# 本番反映の記録\n')).toBe(true);
    expect(md).toContain('- 結果: 3 アプリ中 1 アプリを反映しました。失敗 1 アプリ、未実行 1 アプリ（App 102: 権限がありません（GAIA\\_NO01））。');
    expect(md).toContain('- 件数: 成功 1・失敗 1・取り消し 0・確認後に更新 0・完了を確認できない 0・未実行 1（対象 3 アプリ）');
    expect(md).toContain('- バックアップ: `本番反映前バックアップ_3アプリ_20260101_000000.json`（3 アプリ分・反映前の本番設定）');
    expect(md).toContain('本体を保存できなかったファイル: App 101 / app.js（取得できませんでした）');
    expect(md).toContain('本番への反映は取り消せません。');
  });

  it('アプリ別の結果の表に理由と revision を並べ、通信情報は含めない', () => {
    expect(md).toContain('| 営業管理（#101） | 成功 | － | 10 → 13 | 12 | 一致 |');
    expect(md).toContain('| アプリ102（#102） | 失敗 | 権限がありません（GAIA\\_NO01） | 10 → － | 12 | － |');
    expect(md).not.toContain('[API]');
  });

  it('値の削除を依頼したフィールドを記録する', () => {
    expect(md).toContain('## 削除を依頼したフィールド');
    expect(md).toContain('営業管理（#101）: 旧項目（old\\_code）');
  });

  it('中止・blocked・バックアップなしを書き分ける', () => {
    const cancelled = buildDeployRecordMarkdown({ result: { ...result, cancelled: true }, inspections: [], stopOnError: true });
    expect(cancelled).toContain('利用者の操作で中止しました。依頼済みのアプリは kintone 側で処理が続く場合があります。');
    const blocked = buildDeployRecordMarkdown({ result: { ...result, backup: undefined, blocked: 'バックアップを保存できませんでした。', apps: [outcome('101', 'pending')] }, inspections: [], stopOnError: true });
    expect(blocked).toContain('- 反映前の確認で止めました: バックアップを保存できませんでした。');
    expect(blocked).toContain('- バックアップ: 保存していません');
    expect(blocked).toContain('反映前の確認で止めました。まだ本番へは反映していません。');
  });

  it('変更を中止の記録', () => {
    const text = buildDeployRecordMarkdown({ result: { ...result, mode: 'revert', backup: { ...result.backup!, environment: 'preview' } }, inspections: [], stopOnError: true });
    expect(text.startsWith('# 変更の中止の記録\n')).toBe(true);
    expect(text).toContain('中止前のプレビューの設定');
    expect(text).not.toContain('## 削除を依頼したフィールド');
  });
});

describe('buildDeployResultJson', () => {
  it('結果・集計・バックアップ情報・全件・ログを含み、設定本体は含めない', () => {
    const json = buildDeployResultJson(result);
    expect(json.kind).toBe('kintone-deploy-result');
    expect(json.version).toBe(1);
    expect(json.summary).toMatchObject({ total: 3, success: 1, failed: 1, pending: 1 });
    expect(json.apps).toHaveLength(3);
    expect(json.apps[1].message).toContain('[API]');
    expect(json.logs).toEqual(result.logs);
    expect(json.backup?.fileName).toBe('本番反映前バックアップ_3アプリ_20260101_000000.json');
    expect(json.cancelled).toBe(false);
    const text = stringifyDeployResultJson(result);
    expect(JSON.parse(text).message).toContain('3 アプリ中 1 アプリを反映しました。');
  });
});
