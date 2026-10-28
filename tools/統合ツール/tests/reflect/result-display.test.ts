import { describe, expect, it } from 'vitest';
import { describeReflectFailure } from '../../src/reflect/applyOutcome';
import { applyProgressUpdate, describeApplyProgressStatus, describeRemovedChange, summarizeApplyProgress, type ApplyProgressRow } from '../../src/reflect/applyProgress';
import { describeApplySectionStatus, normalizeApplySections } from '../../src/reflect/liteSetup';
import { buildReflectReportMarkdown } from '../../src/reflect/planReport';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';

describe('describeReflectFailure（失敗メッセージの表示）', () => {
  it('内部の通信情報（[API] の行）を落とし、利用者向けの文だけを示す', () => {
    const message = '指定したアプリが見つかりません（GAIA_AP01）\n[API] PUT /k/v1/preview/app/views.json app=202 payload={"app":"202"}';
    expect(describeReflectFailure(message)).toBe('指定したアプリが見つかりません（GAIA_AP01）');
  });

  it('複数行の説明（書き込み済みの案内など）は残し、通信情報の行だけを除く', () => {
    const message = '一覧の書き込みに失敗しました。\n[API] PUT /k/v1/preview/app/views.json app=202\n（この項目では フィールド追加 まで書き込み済みです。）';
    expect(describeReflectFailure(message)).toBe('一覧の書き込みに失敗しました。\n（この項目では フィールド追加 まで書き込み済みです。）');
  });

  it('「revision 競合」は、かみ砕いた説明を先に置く', () => {
    const shown = describeReflectFailure('一覧は取得後に別の更新が入ったため中止しました（revision 競合）。最新の設定を取得し直してから再実行してください。\n[API] PUT /x');
    expect(shown).toBe('一覧は取得後に別の更新が入ったため中止しました（ほかの更新と重なったため。revision 競合）。最新の設定を取得し直してから再実行してください。');
    expect(shown).not.toContain('[API]');
  });

  it('空・未定義は空文字', () => {
    expect(describeReflectFailure(undefined)).toBe('');
    expect(describeReflectFailure('')).toBe('');
  });
});

describe('describeRemovedChange（要約から拾えない削除の表示）', () => {
  it('説明が無ければ設定値を短く切って示し、あればそれを使う', () => {
    const raw = { path: 'アクセス権 / 3件目', before: JSON.stringify({ entity: 'x'.repeat(300) }) };
    const shown = describeRemovedChange('アプリのアクセス権', raw);
    expect(shown.startsWith('アプリのアクセス権 / アクセス権 / 3件目：{"entity":"xxx')).toBe(true);
    expect(shown.endsWith('…')).toBe(true);
    expect(describeRemovedChange('レイアウト設定', { path: '配置 / 2件目', before: '{}', summary: 'グループ「連絡先（g）」' })).toBe('レイアウト設定 / 配置：グループ「連絡先（g）」');
  });
});

describe('中止で途中停止した項目の表示', () => {
  it('結果一覧：途中で停止は失敗と区別し、未実行は未実行のまま', () => {
    expect(describeApplySectionStatus('ng', true)).toEqual({ icon: '■', text: '途中で停止', tone: 'ng' });
    expect(describeApplySectionStatus('ng')).toEqual({ icon: '✕', text: '失敗', tone: 'ng' });
    expect(describeApplySectionStatus('ng', false).text).toBe('失敗');
    expect(describeApplySectionStatus('pending', true).text).toBe('未実行');
    expect(describeApplySectionStatus('ok', true).text).toBe('成功');
  });

  it('保存済みの結果の stopped を引き継ぐ（ng 以外では付けない）', () => {
    expect(normalizeApplySections([
      { sectionKey: 'a', label: 'A', status: 'ng', stopped: true, message: '中止しました' },
      { sectionKey: 'b', label: 'B', status: 'ng' },
      { sectionKey: 'c', label: 'C', status: 'pending', stopped: true }
    ])).toEqual([
      { sectionKey: 'a', label: 'A', status: 'ng', message: '中止しました', stopped: true },
      { sectionKey: 'b', label: 'B', status: 'ng' },
      { sectionKey: 'c', label: 'C', status: 'pending' }
    ]);
  });

  it('進捗：途中で停止の文字と、失敗とは別の件数', () => {
    expect(describeApplyProgressStatus('ng', true)).toEqual({ icon: '■', text: '途中で停止', tone: 'ng' });
    expect(describeApplyProgressStatus('ng').text).toBe('失敗');
    let rows: ApplyProgressRow[] = [
      { sectionKey: 'a', label: 'A', status: 'waiting' }, { sectionKey: 'b', label: 'B', status: 'waiting' }, { sectionKey: 'c', label: 'C', status: 'waiting' }
    ];
    rows = applyProgressUpdate(rows, { sectionKey: 'a', status: 'ng', message: '中止', stopped: true });
    rows = applyProgressUpdate(rows, { sectionKey: 'b', status: 'pending' });
    expect(rows[0]).toEqual({ sectionKey: 'a', label: 'A', status: 'ng', message: '中止', stopped: true });
    const summary = summarizeApplyProgress(rows);
    expect(summary).toContain('途中で停止 1');
    expect(summary).not.toContain('失敗');
    // 失敗の通知に stopped は付かない。
    expect(applyProgressUpdate(rows, { sectionKey: 'c', status: 'ng' })[2]).toEqual({ sectionKey: 'c', label: 'C', status: 'ng' });
  });

  it('Markdown の反映記録：途中で停止と失敗を書き分け、[API] の行を出さない', () => {
    const entry = buildReflectSectionPlan('viewSettings', { views: { A: { type: 'LIST', name: 'A', index: '0', fields: [] } } }, { views: {} });
    const markdown = buildReflectReportMarkdown({
      generatedAt: '2026-10-27T00:00:00.000Z', source: { appId: '1', name: '元', guestId: '' }, target: { appId: '2', name: '先', guestId: '' }, sourceEnvironment: 'production', preserveTargetOnly: true,
      entries: [entry],
      outcome: { executedAt: '2026-10-27T00:01:00.000Z', sections: [{ sectionKey: 'viewSettings', label: 'ビュー設定', status: 'ng', stopped: true, message: '中止しました\n[API] PUT /k/v1/preview/app/views.json app=2' }] }
    });
    expect(markdown).toContain('| ビュー設定 | 途中で停止 |');
    expect(markdown).toContain('- 結果: 途中で停止');
    expect(markdown).toContain('- 詳細: 中止しました');
    expect(markdown).not.toContain('[API]');
    expect(markdown).not.toContain('失敗');
  });
});
