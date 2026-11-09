'use strict';

import { describe, expect, it } from 'vitest';
import {
  DEPLOY_ATOMIC_LIMIT,
  aggregateChanges,
  appSettingsPath,
  backupDescription,
  changedSectionLabels,
  collectRemovedFields,
  confirmRequirement,
  countInspectStates,
  countOutcomes,
  defaultSelectedKeys,
  deployAppKey,
  deployModeText,
  deployRunLabel,
  describeDeployMessage,
  describeDeployOptions,
  describeDeployStatus,
  describeFailureReasons,
  describeInspectSummary,
  describeRemovedField,
  describeRemovedSettings,
  describeRunProgress,
  describeRunResult,
  describeSerialDuration,
  SERIAL_ESTIMATE_THRESHOLD,
  formatDeployApp,
  formatRevisionPair,
  inspectStateLabel,
  isProblemStatus,
  isSelectableInspection,
  removedSettingCount,
  retryableOutcomes,
  selectionBlockers,
  sortInspectionsForReview,
  summarizeSelection,
  undoGuidance
} from '../../src/deploy/display.js';
import type { DeployAppInspection, DeployAppOutcome, DeployAppStatus, DeployInspectState } from '../../src/deploy/types.js';

function inspection(appId: string, state: DeployInspectState, extra: Partial<DeployAppInspection> = {}): DeployAppInspection {
  return {
    appId, guestId: '', name: `アプリ${appId}`, state, productionRevision: '1', previewRevision: '2', sections: [], removedFields: [], warnings: [],
    inspectedAt: '2026-01-01T00:00:00.000Z', ...extra
  };
}

function section(sectionKey: string, label: string, counts: { added: number; changed: number; removed: number }) {
  return { sectionKey, label, status: 'change' as const, items: [], counts };
}

function outcome(appId: string, status: DeployAppStatus, extra: Partial<DeployAppOutcome> = {}): DeployAppOutcome {
  return { appId, guestId: '', name: `アプリ${appId}`, status, productionRevisionBefore: '1', previewRevision: '2', ...extra };
}

describe('アプリの表示名', () => {
  it('キーはゲストスペースとアプリIDの組', () => {
    expect(deployAppKey({ appId: '12', guestId: '' })).toBe('/12');
    expect(deployAppKey({ appId: '12', guestId: '3' })).toBe('3/12');
  });

  it('名前・ID・ゲストスペースを 1 行にする', () => {
    expect(formatDeployApp({ appId: '12', guestId: '', name: '顧客管理' })).toBe('顧客管理（#12）');
    expect(formatDeployApp({ appId: '12', guestId: '3', name: '顧客管理' })).toBe('顧客管理（#12 / ゲストスペース 3）');
    expect(formatDeployApp({ appId: '12', guestId: '3' })).toBe('App 12（ゲストスペース 3）');
  });
});

describe('操作の表示', () => {
  it('反映と中止で方向・見出し・実行ボタンが変わる', () => {
    expect(deployModeText('deploy').direction).toBe('プレビュー → 本番');
    expect(deployModeText('revert').direction).toBe('プレビューの変更を破棄して本番の設定に戻す');
    expect(deployModeText('revert').changesHeading).toBe('破棄される変更');
    expect(deployRunLabel('deploy', 3)).toBe('確認した 3 アプリを本番へ反映');
    expect(deployRunLabel('revert', 3)).toBe('確認した 3 アプリの変更を中止');
  });

  it('取り消し方とバックアップの説明', () => {
    expect(undoGuidance('deploy')).toContain('本番への反映は取り消せません');
    expect(undoGuidance('deploy')).toContain('削除したフィールドの値は戻りません');
    expect(undoGuidance('deploy')).toContain('「バックアップから戻す」');
    expect(undoGuidance('revert')).toBe('破棄した変更は、結果画面の「バックアップから戻す」で、プレビューに戻せます。');
    expect(backupDescription('deploy', 4)).toBe('反映前の本番設定（4 アプリ分。変更のあるJS/CSSはファイル本体も含む）をJSONで保存してから反映します。');
    expect(backupDescription('revert', 4)).toContain('中止前のプレビューの設定（4 アプリ分）');
  });

  it('詳細設定の現在値を 1 行で示し、既定から外れたときは注意にする', () => {
    expect(describeDeployOptions('sequential', true)).toEqual({ text: '詳細設定: 1アプリずつ反映 / 失敗したら残りを実行しない', warn: false });
    expect(describeDeployOptions('sequential', false)).toEqual({ text: '詳細設定: 1アプリずつ反映 / 失敗しても残りを続ける', warn: true });
    const atomic = describeDeployOptions('atomic', true);
    expect(atomic.text).toContain(`最大 ${DEPLOY_ATOMIC_LIMIT} 件`);
    expect(atomic.warn).toBe(true);
  });
});

describe('差分確認の状態', () => {
  const apps = [inspection('1', 'clean'), inspection('2', 'changes'), inspection('3', 'error'), inspection('4', 'processing'), inspection('5', 'changes')];

  it('状態名・件数・要約', () => {
    expect(inspectStateLabel('changes')).toBe('変更あり');
    expect(inspectStateLabel('clean')).toBe('未公開の変更なし');
    expect(inspectStateLabel('error')).toBe('取得失敗');
    expect(inspectStateLabel('processing')).toBe('反映処理中');
    const counts = countInspectStates(apps);
    expect(counts).toEqual({ changes: 2, clean: 1, error: 1, processing: 1 });
    expect(describeInspectSummary(counts)).toBe('2 アプリに未公開の変更があります（未公開の変更なし 1、取得失敗 1、反映処理中 1）。');
    expect(describeInspectSummary({ changes: 1, clean: 2, error: 0, processing: 0 })).toBe('1 アプリに未公開の変更があります（未公開の変更なし 2）。');
  });

  it('既定の選択は変更あり・取得失敗・反映処理中。未公開の変更なしは選べない', () => {
    expect(defaultSelectedKeys(apps)).toEqual(['/2', '/3', '/4', '/5']);
    expect(isSelectableInspection(apps[0])).toBe(false);
  });

  it('問題のあるアプリを先に並べ、同じ状態では入力順を保つ', () => {
    expect(sortInspectionsForReview(apps).map((app) => app.appId)).toEqual(['3', '4', '2', '5', '1']);
  });

  it('取得失敗・反映処理中を選んだままでは進めない（自動で除外しない）', () => {
    const all = new Set(defaultSelectedKeys(apps));
    const blockers = selectionBlockers(apps, all, 'deploy');
    expect(blockers).toHaveLength(2);
    expect(blockers[0]).toContain('取得失敗のアプリが 1 件選択されています');
    expect(blockers[1]).toContain('反映処理中のアプリが 1 件選択されています');
    expect(selectionBlockers(apps, new Set(['/2', '/5']), 'deploy')).toEqual([]);
    expect(summarizeSelection(apps, all)).toEqual({ runnable: 2, error: 1, processing: 1 });
  });

  it('変更ありが 1 件も選ばれていなければ進めない', () => {
    expect(selectionBlockers(apps, new Set(), 'deploy')).toEqual(['反映するアプリ（変更あり）を選んでください。']);
    expect(selectionBlockers(apps, new Set(), 'revert')).toEqual(['変更を中止するアプリ（変更あり）を選んでください。']);
    expect(selectionBlockers(apps, new Set(['/1']), 'deploy')).toHaveLength(1);
  });
});

describe('変更・削除の集計', () => {
  const a = inspection('1', 'changes', {
    sections: [
      section('fieldSettings', 'フィールド設定', { added: 1, changed: 2, removed: 3 }),
      section('viewSettings', 'ビュー設定', { added: 0, changed: 1, removed: 0 }),
      { sectionKey: 'layoutSettings', label: 'レイアウト設定', status: 'same', items: [], counts: { added: 0, changed: 0, removed: 0 } }
    ],
    removedFields: [{ code: 'old', label: '旧項目', type: 'SINGLE_LINE_TEXT', possibleRename: 'new' }]
  });
  const b = inspection('2', 'changes', { sections: [section('fieldSettings', 'フィールド設定', { added: 0, changed: 0, removed: 2 })] });

  it('項目別と合計を数える（変更のない項目は数えない）', () => {
    const totals = aggregateChanges([a, b]);
    expect(totals.apps).toBe(2);
    expect(totals.added).toBe(1);
    expect(totals.changed).toBe(3);
    expect(totals.removed).toBe(5);
    expect(totals.sections.map((total) => [total.label, total.apps, total.removed])).toEqual([['フィールド設定', 2, 5], ['ビュー設定', 1, 0]]);
    expect(describeRemovedSettings(totals)).toBe('フィールド設定 5 件（合計 5 件）');
    expect(describeRemovedSettings(aggregateChanges([]))).toBe('');
  });

  it('アプリごとの変更のある項目と削除の件数', () => {
    expect(changedSectionLabels(a)).toEqual(['フィールド設定', 'ビュー設定']);
    expect(removedSettingCount(a)).toBe(3);
  });

  it('削除されるフィールドを集め、コードを変えただけの可能性を残す', () => {
    const removed = collectRemovedFields([a, b]);
    expect(removed).toHaveLength(1);
    expect(removed[0].field.possibleRename).toBe('new');
    expect(describeRemovedField({ code: 'old', label: '旧項目', type: 'SINGLE_LINE_TEXT' })).toBe('旧項目（old）');
    expect(describeRemovedField({ code: 'memo', label: 'memo', type: 'SINGLE_LINE_TEXT', table: 'items' })).toBe('memo（テーブル items 内）');
  });

  it('revision の表示', () => {
    expect(formatRevisionPair(a)).toBe('本番 1 → プレビュー 2');
    expect(formatRevisionPair({ productionRevision: '', previewRevision: '' })).toBe('本番 － → プレビュー －');
  });
});

describe('最終確認の入力', () => {
  it('1 件なら対象アプリID、複数なら対象のアプリ数', () => {
    expect(confirmRequirement([{ appId: '101' }]).value).toBe('101');
    expect(confirmRequirement([{ appId: '101' }, { appId: '102' }]).value).toBe('2');
    expect(confirmRequirement([{ appId: '101' }, { appId: '102' }]).label).toBe('対象のアプリ数を入力');
  });
});

describe('実行中・実行後の状態', () => {
  it('9 つの状態を記号と文字で示す', () => {
    const statuses: DeployAppStatus[] = ['waiting', 'checking', 'deploying', 'success', 'failed', 'cancelled', 'conflict', 'unknown', 'pending'];
    expect(statuses.map((status) => describeDeployStatus(status).text)).toEqual(['待機中', '確認中…', '反映中…', '成功', '失敗', '取り消し（ほかのアプリの失敗）', '確認後に更新', '完了を確認できない', '未実行']);
    expect(describeDeployStatus('deploying', 'revert').text).toBe('中止を依頼中…');
    expect(describeDeployStatus('failed').icon).toBe('✕');
    expect(isProblemStatus('failed')).toBe(true);
    expect(isProblemStatus('pending')).toBe(false);
  });

  it('件数を数え、進み具合を 1 文にする', () => {
    const apps = [outcome('1', 'success'), outcome('2', 'success', { verified: false }), outcome('3', 'failed'), outcome('4', 'pending'), outcome('5', 'deploying'), outcome('6', 'unknown')];
    const counts = countOutcomes(apps);
    expect(counts).toMatchObject({ total: 6, success: 2, failed: 1, pending: 1, active: 1, unknown: 1, unverified: 1 });
    expect(describeRunProgress(counts)).toBe('5/6 アプリが完了（成功 2・失敗 1・完了を確認できない 1・未実行 1）');
  });

  it('内部の通信情報は理由から外す', () => {
    expect(describeDeployMessage('権限がありません（GAIA_NO01）\n[API] POST /k/v1/preview/app/deploy.json\n')).toBe('権限がありません（GAIA_NO01）');
    expect(describeFailureReasons([outcome('303', 'failed', { message: '権限がありません\n[API] POST /x' })])).toBe('App 303: 権限がありません');
  });

  it('失敗理由は先頭 2 件とその他の件数', () => {
    const apps = ['1', '2', '3', '4'].map((id) => outcome(id, 'failed', { message: `理由${id}` }));
    expect(describeFailureReasons(apps)).toBe('App 1: 理由1、App 2: 理由2、ほか 2 アプリ');
  });

  it('全件成功: 反映と中止で文言が変わる', () => {
    const apps = [outcome('1', 'success', { verified: true }), outcome('2', 'success', { verified: true })];
    expect(describeRunResult({ mode: 'deploy', apps })).toEqual({ text: '2 アプリを本番へ反映しました。', tone: 'ok' });
    expect(describeRunResult({ mode: 'revert', apps })).toEqual({ text: '2 アプリのプレビューの変更を中止しました。', tone: 'ok' });
  });

  it('反映後の確認が一致しなければ注意にする', () => {
    const result = describeRunResult({ mode: 'deploy', apps: [outcome('1', 'success', { verified: false }), outcome('2', 'success', { verified: true })] });
    expect(result.tone).toBe('warn');
    expect(result.text).toContain('1 アプリは反映後の設定の更新番号（revision）が本番とプレビューで一致しませんでした');
  });

  it('部分成功: 成功数・失敗数・理由の順', () => {
    const result = describeRunResult({ mode: 'deploy', apps: [outcome('1', 'success'), outcome('303', 'failed', { message: '権限がありません' }), outcome('3', 'pending'), outcome('4', 'pending')] });
    expect(result.tone).toBe('warn');
    expect(result.text).toBe('4 アプリ中 1 アプリを反映しました。失敗 1 アプリ、未実行 2 アプリ（App 303: 権限がありません）。「失敗・未実行だけ選び直す」から確認し直してください。');
  });

  it('1 件も成功しなければエラー', () => {
    const result = describeRunResult({ mode: 'deploy', apps: [outcome('1', 'failed', { message: 'x' }), outcome('2', 'cancelled')] });
    expect(result.tone).toBe('err');
    expect(result.text.startsWith('2 アプリ中、反映できたアプリはありません。失敗 1 アプリ、取り消し 1 アプリ')).toBe(true);
  });

  it('中止: 成功数・未実行数と、依頼済みの処理が続く場合がある旨', () => {
    const apps = [...Array.from({ length: 3 }, (_, i) => outcome(String(i + 1), 'success')), ...Array.from({ length: 7 }, (_, i) => outcome(String(i + 4), 'pending'))];
    const result = describeRunResult({ mode: 'deploy', apps, cancelled: true });
    expect(result.tone).toBe('warn');
    expect(result.text.startsWith('中止しました（3/10 アプリを反映、残り 7 アプリは未実行）。')).toBe(true);
    expect(result.text).toContain('反映済みの分は本番に残っています。');
    const withUnknown = describeRunResult({ mode: 'deploy', apps: [outcome('1', 'unknown'), outcome('2', 'pending')], cancelled: true });
    expect(withUnknown.text).toContain('完了を確認できない 1 アプリ');
    expect(withUnknown.text).toContain('依頼済みのアプリは kintone 側で処理が続く場合があります。');
  });

  it('blocked: まだ本番へは反映していないことから始めて理由を示す', () => {
    const apps = [outcome('1', 'pending')];
    expect(describeRunResult({ mode: 'deploy', apps, blocked: 'バックアップを保存できませんでした。' }).text)
      .toBe('反映前の確認で止めました。まだ本番へは反映していません。バックアップを保存できませんでした。');
    expect(describeRunResult({ mode: 'revert', apps, blocked: '理由' }).text.startsWith('中止前の確認で止めました。まだプレビューの変更は破棄していません。')).toBe(true);
  });

  it('失敗・未実行だけ選び直す対象は成功以外', () => {
    const apps = [outcome('1', 'success'), outcome('2', 'failed'), outcome('3', 'pending'), outcome('4', 'unknown'), outcome('5', 'conflict'), outcome('6', 'cancelled')];
    expect(retryableOutcomes(apps).map((app) => app.appId)).toEqual(['2', '3', '4', '5', '6']);
  });
});

describe('設定画面の URL', () => {
  it('通常スペースとゲストスペース', () => {
    expect(appSettingsPath({ appId: '12', guestId: '' })).toBe('/k/admin/app/flow?app=12');
    expect(appSettingsPath({ appId: '12', guestId: '3' })).toBe('/k/guest/3/admin/app/flow?app=12');
  });
});

describe('1 アプリずつ反映するときの所要時間の目安', () => {
  it('件数が多いとき（20 件以上）だけ、1 件あたり数秒と全体の目安を示す', () => {
    expect(SERIAL_ESTIMATE_THRESHOLD).toBe(20);
    expect(describeSerialDuration('sequential', 19)).toBe('');
    expect(describeSerialDuration('sequential', 20)).toBe('1 アプリずつ反映すると、1 件あたり数秒、全体で約 1 分かかる見込みです。画面を開いたままお待ちください。');
    expect(describeSerialDuration('sequential', 100)).toContain('全体で約 5 分');
    expect(describeSerialDuration('sequential', 1000)).toContain('全体で約 50 分');
  });

  it('まとめて反映のときは示さない', () => {
    expect(describeSerialDuration('atomic', 300)).toBe('');
  });
});
