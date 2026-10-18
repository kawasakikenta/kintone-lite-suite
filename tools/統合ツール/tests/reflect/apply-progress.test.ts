import { describe, expect, it } from 'vitest';
import {
  RESTORE_MODE_NOTICE,
  TARGET_PENDING_REASON,
  applyProgressUpdate,
  collectUploadLabels,
  countReflectItemKinds,
  createApplyProgressRows,
  describeApplyProgressStatus,
  describeRemovedItem,
  describeUndoGuidance,
  formatReflectDateTime,
  formatUploadList,
  orderReflectItems,
  summarizeApplyProgress
} from '../../src/reflect/applyProgress';
import { REFLECT_UNDO_GUIDANCE } from '../../src/reflect/liteSetup';
import { reflectSectionLabel } from '../../src/reflect/sections';

describe('実行中の進捗', () => {
  it('状態は記号と文字で示す（色だけに頼らない）', () => {
    expect(describeApplyProgressStatus('waiting')).toEqual({ icon: '○', text: '待機中', tone: 'waiting' });
    expect(describeApplyProgressStatus('running')).toEqual({ icon: '…', text: '実行中…', tone: 'running' });
    expect(describeApplyProgressStatus('ok')).toEqual({ icon: '✓', text: '成功', tone: 'ok' });
    expect(describeApplyProgressStatus('ng')).toEqual({ icon: '✕', text: '失敗', tone: 'ng' });
    expect(describeApplyProgressStatus('skip')).toEqual({ icon: '－', text: '変更なし', tone: 'skip' });
    expect(describeApplyProgressStatus('pending')).toEqual({ icon: '○', text: '未実行', tone: 'pending' });
  });

  it('実行予定の項目を、選んだ順ではなく反映エンジンの処理順に「待機中」で並べる', () => {
    const rows = createApplyProgressRows(['viewSettings', 'appSettings', 'fieldSettings', 'viewSettings'], reflectSectionLabel);
    expect(rows).toEqual([
      { sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'waiting' },
      { sectionKey: 'appSettings', label: '一般設定', status: 'waiting' },
      { sectionKey: 'viewSettings', label: 'ビュー設定', status: 'waiting' }
    ]);
    expect(createApplyProgressRows(['unknown', 'fieldSettings'], (key) => key).map((row) => row.sectionKey)).toEqual(['fieldSettings', 'unknown']);
  });

  it('通知を反映した新しい一覧を返し、元の一覧と一覧に無い項目は変えない', () => {
    const rows = createApplyProgressRows(['fieldSettings', 'viewSettings'], reflectSectionLabel);
    const running = applyProgressUpdate(rows, { sectionKey: 'fieldSettings', status: 'running' });
    expect(running.map((row) => row.status)).toEqual(['running', 'waiting']);
    expect(rows.map((row) => row.status)).toEqual(['waiting', 'waiting']);
    const failed = applyProgressUpdate(running, { sectionKey: 'fieldSettings', status: 'ng', message: '失敗しました' });
    expect(failed[0]).toEqual({ sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ng', message: '失敗しました' });
    expect(applyProgressUpdate(failed, { sectionKey: 'unknown', status: 'ok' })).toEqual(failed);
    // 状態が変わったら、前の状態のメッセージは持ち越さない。
    expect(applyProgressUpdate(failed, { sectionKey: 'fieldSettings', status: 'ok' })[0]).toEqual({ sectionKey: 'fieldSettings', label: 'フィールド設定', status: 'ok' });
  });

  it('進み具合を 1 文で示す', () => {
    const rows = createApplyProgressRows(['fieldSettings', 'layoutSettings', 'viewSettings'], reflectSectionLabel);
    expect(summarizeApplyProgress([])).toBe('');
    expect(summarizeApplyProgress(rows)).toBe('0 / 3 項目が完了');
    const midway = applyProgressUpdate(applyProgressUpdate(rows, { sectionKey: 'fieldSettings', status: 'ok' }), { sectionKey: 'layoutSettings', status: 'running' });
    expect(summarizeApplyProgress(midway)).toBe('1 / 3 項目が完了。実行中: レイアウト設定');
    const stopped = applyProgressUpdate(applyProgressUpdate(midway, { sectionKey: 'layoutSettings', status: 'ng' }), { sectionKey: 'viewSettings', status: 'pending' });
    expect(summarizeApplyProgress(stopped)).toBe('3 / 3 項目が完了（失敗 1）');
  });
});

describe('取り消しの案内', () => {
  it('未公開の変更が無かったときは、『変更を中止』で今回の反映をすべて取り消せると案内し、設定画面へ誘導する', () => {
    const guidance = describeUndoGuidance({ state: 'clean' });
    expect(guidance.text).toBe('反映前、反映先プレビューに未公開の変更はありませんでした。アプリの設定画面で『変更を中止』を押すと、今回の反映をすべて取り消せます。');
    expect(guidance).toMatchObject({ tone: 'ok', openSettings: true });
  });

  it('以前から未公開の変更があったときは、『変更を中止』ではそれらも破棄されると警告し、バックアップから戻すよう案内する', () => {
    const guidance = describeUndoGuidance({ state: 'pending' });
    expect(guidance.text).toBe('反映前から未公開の変更があったため、『変更を中止』ではそれらも破棄されます。今回の反映だけを戻す場合は『バックアップから戻す』を使ってください。');
    expect(guidance).toMatchObject({ tone: 'warn', openSettings: false });
  });

  it('不明・判定なしは、従来の汎用の案内にする', () => {
    for (const input of [{ state: 'unknown' }, undefined, null, {}]) {
      expect(describeUndoGuidance(input)).toEqual({ tone: 'info', openSettings: false, text: REFLECT_UNDO_GUIDANCE });
    }
  });

  it('バックアップから戻している間の注意と、未公開の変更の理由を示す', () => {
    expect(RESTORE_MODE_NOTICE).toContain('バックアップから戻しています。反映で追加したフィールドは削除されません（保持として表示）');
    expect(TARGET_PENDING_REASON).toBe('反映先プレビューに以前からの未公開の変更があります');
  });
});

describe('JS/CSS のアップロード予定', () => {
  const upload = (platform: 'desktop' | 'mobile', kind: 'js' | 'css', sourceFileKey: string, name: string, byteSize: number, index = 0) => ({ platform, kind, index, sourceFileKey, name, byteSize });

  it('「PC JS / app.js（12 KB）」の形で示す', () => {
    expect(formatUploadList([upload('desktop', 'js', 'k1', 'app.js', 12288), upload('mobile', 'css', 'k2', 'm.css', 100), upload('desktop', 'css', 'k3', 'big.css', 3 * 1048576)])).toEqual([
      'PC JS / app.js（12 KB）', 'モバイル CSS / m.css（1 KB）', 'PC CSS / big.css（3.0 MB）'
    ]);
  });

  it('同じ反映元ファイルを複数の場所で使うときは 1 回にまとめる', () => {
    expect(formatUploadList([
      upload('desktop', 'js', 'k1', 'common.js', 2048, 0), upload('mobile', 'js', 'k1', 'common.js', 2048, 1), upload('desktop', 'js', 'k1', 'common.js', 2048, 2)
    ])).toEqual(['PC JS・モバイル JS / common.js（2 KB）']);
  });

  it('アップロードが無いときは空', () => {
    expect(formatUploadList(undefined)).toEqual([]);
    expect(formatUploadList([])).toEqual([]);
  });

  it('複数の項目にまたがる一覧は、重複を除いて 1 つにする', () => {
    const shared = [upload('desktop', 'js', 'k1', 'app.js', 1024)];
    expect(collectUploadLabels([{ fileUploads: shared }, { fileUploads: shared }, {}])).toEqual(['PC JS / app.js（1 KB）']);
  });
});

describe('変更の要約（項目単位）', () => {
  const item = (kind: '追加' | '変更' | '削除' | '保持', name: string, details: string[] = []) => ({ kind, name, details });

  it('削除 → 変更 → 追加 → 保持の順に並べ、同じ種類の中では元の順を保つ。不正な行は除く', () => {
    const ordered = orderReflectItems([item('保持', 'k'), item('追加', 'a1'), item('削除', 'd'), item('変更', 'c'), item('追加', 'a2'), { kind: '不明', name: 'x', details: [] } as any, null as any]);
    expect(ordered.map((entry) => `${entry.kind}:${entry.name}`)).toEqual(['削除:d', '変更:c', '追加:a1', '追加:a2', '保持:k']);
    expect(orderReflectItems(undefined)).toEqual([]);
  });

  it('種類ごとの件数を数える', () => {
    expect(countReflectItemKinds([item('追加', 'a'), item('追加', 'b'), item('削除', 'c')])).toEqual({ 削除: 1, 変更: 0, 追加: 2, 保持: 0 });
  });

  it('削除される設定は「項目名：内容」で示す', () => {
    expect(describeRemovedItem('ビュー設定', item('削除', '新規一覧', ['種類: 表形式', '表示フィールド 1件']))).toBe('ビュー設定 / 新規一覧：種類: 表形式、表示フィールド 1件');
    expect(describeRemovedItem('ビュー設定', item('削除', '新規一覧'))).toBe('ビュー設定 / 新規一覧');
  });
});

describe('日時の表示', () => {
  it('日本語の形式（年/月/日 時:分:秒）で示す', () => {
    expect(formatReflectDateTime(new Date(2026, 0, 2, 3, 4, 5))).toMatch(/^2026\/1\/2 3:04:05$/);
  });
});
