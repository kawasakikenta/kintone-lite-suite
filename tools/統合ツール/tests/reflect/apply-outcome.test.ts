'use strict';

import { describe, it, expect } from 'vitest';
import {
  buildReflectErrorHint,
  pushReflectErrorLog,
  collectRetrySectionKeys,
  summarizeApplyOutcome,
  previewWriteState,
  applySectionStatusText,
  type ApplySectionOutcome
} from '../../src/reflect/applyOutcome.js';
import { describeApplySectionStatus, normalizeApplySections } from '../../src/reflect/liteSetup.js';
import { applyProgressUpdate, describeApplyProgressStatus, summarizeApplyProgress } from '../../src/reflect/applyProgress.js';
import { apiErrorWithContext } from '../../src/utils.js';

describe('buildReflectErrorHint', () => {
  it('権限エラーには管理権限の確認を促す', () => {
    expect(buildReflectErrorHint('権限がありません (CB_NO02)')).toContain('アプリ管理権限');
    expect(buildReflectErrorHint('403 Forbidden')).toContain('アプリ管理権限');
  });

  it('アプリ不存在エラーにはアプリID・ゲストIDの確認を促す', () => {
    expect(buildReflectErrorHint('指定したアプリ（id: 123）が見つかりません。(GAIA_AP01)')).toContain('ゲストスペースID');
  });

  it('ルックアップ関連エラーにはマッピングでの変換を促す', () => {
    expect(buildReflectErrorHint('ルックアップの参照先アプリが不正です')).toContain('「参照先変換」');
  });

  it('フィールド不存在エラーには先にフィールド設定の反映を促す', () => {
    expect(buildReflectErrorHint('指定したフィールド（code: 顧客名）が見つかりません')).toContain('フィールド設定');
  });

  it('通信エラーには再実行を促す', () => {
    expect(buildReflectErrorHint('Failed to fetch')).toContain('再実行');
  });

  it('ヒントは「反映元／反映先」の用語で案内する（「比較先」を使わない）', () => {
    for (const message of ['権限がありません (CB_NO02)', '指定したアプリが見つかりません', 'ルックアップの参照先', '指定したフィールドが見つかりません', 'プロセス管理の更新に失敗 (GAIA_RE01)']) {
      const hint = buildReflectErrorHint(message);
      expect(hint, message).toContain('反映先');
      expect(hint, message).not.toMatch(/比較[元先]/);
    }
  });

  it('未知のエラーは空文字（ヒントなし）', () => {
    expect(buildReflectErrorHint('something unexpected happened')).toBe('');
    expect(buildReflectErrorHint('')).toBe('');
  });

  // 以前は、ルックアップの参照先アプリの入力エラー（「参照するアプリが見つかりません」）に「反映先アプリID・ゲストスペースIDが正しいか」を案内していた。
  // また、送った内容（[API] の行の payload にある "lookup"）でもルックアップのヒントが決まっていた。
  it('ルックアップの設定の入力エラーには参照先の変換を案内し、送った内容（[API] の行）ではヒントを決めない', () => {
    const lookupError = apiErrorWithContext(
      { code: 'CB_VA01', id: 'x', message: '入力内容が正しくありません。', errors: { 'properties[customer_code].lookup.relatedApp.app': { messages: ['参照するアプリが見つかりません。'] } } },
      { method: 'POST', path: '/app/form/fields.json', payload: { app: '202', properties: {} } }
    );
    expect(buildReflectErrorHint(lookupError.message)).toContain('「参照先変換」');
    const notFound = apiErrorWithContext({ code: 'GAIA_AP01', id: 'y', message: '指定したアプリ（id: 202）が見つかりません。' }, { method: 'POST', path: '/app/form/fields.json', payload: { app: '202', properties: { c: { lookup: { relatedApp: { app: '301' } } } } } });
    expect(notFound.message).toContain('lookup');
    expect(buildReflectErrorHint(notFound.message)).toContain('ゲストスペースID');
    const viewError = apiErrorWithContext({ code: 'GAIA_IL26', id: 'z', message: '指定したフィールドが存在しません。' }, { method: 'PUT', path: '/app/views.json', payload: { app: '202', views: { a: { fields: ['lookup_code'] } } } });
    expect(buildReflectErrorHint(viewError.message)).toContain('フィールド設定');
  });
});

describe('pushReflectErrorLog', () => {
  it('エラー行に続けて対処ヒントを併記する', () => {
    const logs: string[] = [];
    pushReflectErrorLog(logs, 'NG ビュー設定: 権限がありません', '権限がありません');
    expect(logs[0]).toBe('NG ビュー設定: 権限がありません');
    expect(logs[1]).toContain('ヒント:');
    expect(logs[1]).toContain('アプリ管理権限');
  });

  it('直前に同じヒントを出していたら重複させない', () => {
    const logs: string[] = [];
    pushReflectErrorLog(logs, 'NG A: 権限がありません', '権限がありません');
    pushReflectErrorLog(logs, 'NG B: 権限がありません', '権限がありません');
    expect(logs.filter((l) => l.includes('ヒント:')).length).toBe(1);
  });

  it('ヒントが無いエラーはエラー行のみ', () => {
    const logs: string[] = [];
    pushReflectErrorLog(logs, 'NG C: unexpected', 'unexpected');
    expect(logs).toEqual(['NG C: unexpected']);
  });
});

describe('collectRetrySectionKeys', () => {
  const sections: ApplySectionOutcome[] = [
    { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ok' },
    { sectionKey: 'viewSettings', label: 'ビュー設定', status: 'ng', message: '権限がありません' },
    { sectionKey: 'appAcl', label: 'アプリ権限', status: 'skip', message: '比較元未取得' },
    { sectionKey: 'notifications', label: '通知設定', status: 'pending', message: '中断のため未実行' }
  ];

  it('失敗と未実行のセクションを実行順で返す', () => {
    expect(collectRetrySectionKeys(sections)).toEqual(['viewSettings', 'notifications']);
  });

  it('全成功なら空配列', () => {
    expect(collectRetrySectionKeys([
      { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ok' }
    ])).toEqual([]);
    expect(collectRetrySectionKeys([])).toEqual([]);
  });
});

describe('summarizeApplyOutcome', () => {
  it('ステータス別に件数を集計する', () => {
    const sections: ApplySectionOutcome[] = [
      { sectionKey: 'a', label: 'A', status: 'ok' },
      { sectionKey: 'b', label: 'B', status: 'ok' },
      { sectionKey: 'c', label: 'C', status: 'ng' },
      { sectionKey: 'd', label: 'D', status: 'pending' },
      { sectionKey: 'e', label: 'E', status: 'skip' }
    ];
    expect(summarizeApplyOutcome(sections)).toEqual({ ok: 2, ng: 1, stopped: 0, unconfirmed: 0, pending: 1, skip: 1 });
  });

  it('中止で途中停止した項目は失敗に数えず、再実行の対象には含める', () => {
    const sections: ApplySectionOutcome[] = [
      { sectionKey: 'a', label: 'A', status: 'ok' },
      { sectionKey: 'b', label: 'B', status: 'ng', stopped: true },
      { sectionKey: 'c', label: 'C', status: 'pending' }
    ];
    expect(summarizeApplyOutcome(sections)).toEqual({ ok: 1, ng: 0, stopped: 1, unconfirmed: 0, pending: 1, skip: 0 });
    expect(collectRetrySectionKeys(sections)).toEqual(['b', 'c']);
  });

  it('空配列はすべて 0', () => {
    expect(summarizeApplyOutcome([])).toEqual({ ok: 0, ng: 0, stopped: 0, unconfirmed: 0, pending: 0, skip: 0 });
  });
});

describe('previewWriteState: 反映先プレビューへの書き込みの状況', () => {
  const section = (status: ApplySectionOutcome['status'], extra: Partial<ApplySectionOutcome> = {}): ApplySectionOutcome => ({ sectionKey: status, label: status, status, ...extra });

  it('1 件も書き込めていなければ none（すべて失敗・未実行・変更なし）', () => {
    expect(previewWriteState([section('ng'), section('pending'), section('pending')])).toBe('none');
    expect(previewWriteState([section('skip'), section('skip')])).toBe('none');
    expect(previewWriteState([])).toBe('none');
  });

  it('一部だけ成功し、失敗・未実行が残っていれば partial', () => {
    expect(previewWriteState([section('ok'), section('ng'), section('pending')])).toBe('partial');
    expect(previewWriteState([section('ok'), section('pending')])).toBe('partial');
  });

  it('失敗した項目でも、その中で書き込み済みの操作がある・途中で停止したときは書き込みがあるものと数える', () => {
    expect(previewWriteState([section('ng', { partiallyWritten: true }), section('pending')])).toBe('partial');
    expect(previewWriteState([section('ng', { stopped: true }), section('pending')])).toBe('partial');
  });

  it('失敗・未実行が残らず、成功があれば all', () => {
    expect(previewWriteState([section('ok'), section('skip'), section('ok')])).toBe('all');
  });
});

describe('反映されたか分からない項目（書き込みの応答が届かなかった）', () => {
  const sections: ApplySectionOutcome[] = [
    { sectionKey: 'a', label: 'A', status: 'ok' },
    { sectionKey: 'b', label: 'B', status: 'ng', unconfirmed: true, message: '反映されたか分かりません' },
    { sectionKey: 'c', label: 'C', status: 'pending' }
  ];

  it('失敗に数えず、別に数える。再実行の対象には含める（再実行の前に差分を取り直すため安全）', () => {
    expect(summarizeApplyOutcome(sections)).toEqual({ ok: 1, ng: 0, stopped: 0, unconfirmed: 1, pending: 1, skip: 0 });
    expect(collectRetrySectionKeys(sections)).toEqual(['b', 'c']);
  });

  it('成功・失敗と言わず「反映されたか不明」と示す（注意の色）', () => {
    expect(applySectionStatusText(sections[1])).toBe('反映されたか不明');
    expect(applySectionStatusText({ status: 'ng', stopped: true, unconfirmed: true })).toBe('途中で停止');
    expect(applySectionStatusText({ status: 'ng' })).toBe('失敗');
    expect(applySectionStatusText(undefined)).toBe('未実行');
    expect(describeApplySectionStatus('ng', false, true)).toEqual({ icon: '?', text: '反映されたか不明', tone: 'pending' });
    expect(describeApplyProgressStatus('ng', false, true)).toEqual({ icon: '?', text: '反映されたか不明', tone: 'pending' });
    expect(describeApplySectionStatus('ng')).toEqual({ icon: '✕', text: '失敗', tone: 'ng' });
  });

  it('反映先プレビューは、ほかに書き込めた項目が無ければ「変わったか分からない」、あれば一部書き込み', () => {
    expect(previewWriteState([sections[1], sections[2]])).toBe('unknown');
    expect(previewWriteState(sections)).toBe('partial');
  });

  it('進捗の一覧と、保存した結果の読み直しでも目印を保つ', () => {
    const rows = applyProgressUpdate([{ sectionKey: 'b', label: 'B', status: 'running' }], { sectionKey: 'b', status: 'ng', unconfirmed: true, message: 'x' });
    expect(rows[0]).toMatchObject({ status: 'ng', unconfirmed: true });
    expect(summarizeApplyProgress(rows)).toBe('1 / 1 項目が完了（反映されたか不明 1）');
    expect(normalizeApplySections(JSON.parse(JSON.stringify(sections)))[1]).toMatchObject({ status: 'ng', unconfirmed: true });
  });
});
