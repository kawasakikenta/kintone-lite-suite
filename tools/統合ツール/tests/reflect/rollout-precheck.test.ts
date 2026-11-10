import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRolloutPrecheckMarkdown, countRolloutPrecheck, describeRolloutPrecheckPending, describeRolloutPrecheckSummary, dropSameRolloutTargets, filterRolloutPrecheckRows,
  formatRolloutPrecheckTarget, mergeRolloutPrecheckRows, rolloutFailureRow, rolloutNotRunRow, rolloutRetryTargets, runRolloutPrecheck, selectRolloutPrecheckRows,
  summarizeRolloutPreview, type RolloutPrecheckRow
} from '../../src/reflect/rolloutPrecheck';
import { precheckRolloutTargetsStandalone, createRecentFileDownloader } from '../../src/tabs/reflect-rollout-standalone';
import { __resetRunControlForTests, beginRun, endRun, requestCancel, RunCancelledError } from '../../src/runControl';
import { createRolloutWorld, lookup, row, text } from './rollout-world';

const target = (appId: string, guestId = '') => ({ appId, guestId });
const entry = (sectionKey: string, label: string, status: string, extra: Record<string, any> = {}) => ({
  sectionKey, label, status, message: '', behavior: '', changes: [], changeCount: 0, removalCount: 0, warnings: [], blockers: [], operations: [], ...extra
}) as any;
const summarize = (entries: any[], extra: Record<string, any> = {}, scopes = entries.map(item => item.sectionKey)) =>
  summarizeRolloutPreview({ ...target('203'), name: '大阪営業所' }, { entries, sourceFieldCodes: [], targetFieldCodes: [], sourceSystemFieldCodes: [], ...extra }, scopes, 1000);
const sample = (appId: string, state: RolloutPrecheckRow['state'], extra: Partial<RolloutPrecheckRow> = {}): RolloutPrecheckRow => ({
  appId, guestId: '', name: `アプリ${appId}`, state, changedLabels: [], attentionLabels: [], changeCount: 0, removalCount: 0, pending: '', pendingLabels: [], reason: '', lookupCandidates: 0, lookupConflicts: 0, at: 1, ...extra
});

describe('一括事前確認: 差分取得の結果を行にまとめる', () => {
  it('差分のある項目名と、変更・削除の件数を示す', () => {
    const result = summarize([
      entry('fieldSettings', 'フィールド設定', 'change', { changeCount: 3, removalCount: 1 }),
      entry('layoutSettings', 'レイアウト設定', 'same'),
      entry('viewSettings', 'ビュー設定', 'change', { changeCount: 2 })
    ]);
    expect(result).toMatchObject({ state: 'diff', name: '大阪営業所', changedLabels: ['フィールド設定', 'ビュー設定'], changeCount: 5, removalCount: 1, pending: '', reason: '' });
  });

  it('すべて一致なら「差分なし（一致）」にする', () => {
    expect(summarize([entry('fieldSettings', 'フィールド設定', 'same'), entry('viewSettings', 'ビュー設定', 'same')])).toMatchObject({ state: 'same', changedLabels: [], changeCount: 0 });
  });

  it('設定を取得できない項目があるときは、差分が無くても「取得失敗」にする（差分なしと表示しない）', () => {
    const result = summarize([
      entry('fieldSettings', 'フィールド設定', 'same'),
      entry('viewSettings', 'ビュー設定', 'tgt-missing', { message: '反映先を完全に取得できません: 権限がありません', blockers: ['x'] })
    ]);
    expect(result.state).toBe('error');
    expect(result.reason).toBe('反映先を完全に取得できません: 権限がありません');
    expect(result.attentionLabels).toEqual(['ビュー設定']);
  });

  it('種類の違い・参照するフィールドの不足など、そのままでは反映できない項目は「確認が必要」にし、差分のある項目名も残す', () => {
    const result = summarize([
      entry('fieldSettings', 'フィールド設定', 'error', { blockers: ['customer: 種類が異なります（NUMBER → SINGLE_LINE_TEXT）。'], message: 'customer: 種類が異なります' }),
      entry('layoutSettings', 'レイアウト設定', 'change', { changeCount: 1, requiredFields: ['ghost'] })
    ], { targetFieldCodes: ['customer'] }, ['fieldSettings', 'layoutSettings']);
    expect(result.state).toBe('attention');
    expect(result.attentionLabels).toEqual(['フィールド設定', 'レイアウト設定']);
    expect(result.changedLabels).toEqual(['レイアウト設定']);
    expect(result.reason).toContain('種類が異なります');
  });

  it('取得失敗は確認が必要より優先する', () => {
    const result = summarize([entry('fieldSettings', 'フィールド設定', 'error', { blockers: ['種類が異なります'] }), entry('viewSettings', 'ビュー設定', 'src-missing', { message: '反映元を完全に取得できません: 設定がありません' })]);
    expect(result.state).toBe('error');
  });

  it('反映先プレビューの未公開の変更の有無と項目名を示す', () => {
    const entries = [entry('fieldSettings', 'フィールド設定', 'same')];
    expect(summarize(entries, { targetPending: { state: 'pending', productionRevision: '5', previewRevision: '6', sectionKeys: ['fieldSettings', 'viewSettings'], message: '' } })).toMatchObject({ pending: 'pending', pendingLabels: ['フィールド設定', 'ビュー設定'] });
    expect(summarize(entries, { targetPending: { state: 'clean', productionRevision: '5', previewRevision: '5', sectionKeys: [], message: '' } })).toMatchObject({ pending: 'clean', pendingLabels: [] });
    expect(summarize(entries).pending).toBe('');
  });

  it('選んだ項目以外の取得結果は数えず、参照先変換の候補の件数を引き継ぐ', () => {
    const result = summarize([entry('fieldSettings', 'フィールド設定', 'same'), entry('viewSettings', 'ビュー設定', 'src-missing', { message: '取得失敗' })], { lookupCandidates: { candidates: [{}, {}], conflicts: [{}] } }, ['fieldSettings']);
    expect(result).toMatchObject({ state: 'same', lookupCandidates: 2, lookupConflicts: 1 });
  });

  it('取得そのものが失敗した行は、内部の通信情報を除いた1行目を理由にする', () => {
    const failure = rolloutFailureRow(target('204'), new Error('反映先 #204: 指定したアプリが見つかりません。\n[API] GET /k/v1/app.json id=204'), 5);
    expect(failure).toMatchObject({ state: 'error', reason: '反映先 #204: 指定したアプリが見つかりません。', at: 5 });
    expect(rolloutFailureRow(target('204'), { message: '' }, 5).reason).toBe('設定を取得できませんでした');
    expect(rolloutNotRunRow(target('205'), 6)).toMatchObject({ state: 'notrun', reason: '中止したため確認していません' });
  });
});

describe('一括事前確認: 実行', () => {
  afterEach(() => __resetRunControlForTests());

  it('結果は反映先と同じ順序で返し、進捗を通知する', async () => {
    const targets = ['a', 'b', 'c', 'd', 'e'].map((_, i) => target(String(300 + i)));
    const progress: number[] = [];
    const rows = await runRolloutPrecheck(targets, async (item, index) => {
      await new Promise(resolve => setTimeout(resolve, (5 - index) * 3));
      return sample(item.appId, 'same');
    }, { concurrency: 3, onProgress: done => progress.push(done) });
    expect(rows.map(item => item.appId)).toEqual(['300', '301', '302', '303', '304']);
    expect(progress).toEqual([1, 2, 3, 4, 5]);
  });

  it('同時に確認する数を超えない', async () => {
    let running = 0, peak = 0;
    await runRolloutPrecheck(Array.from({ length: 12 }, (_, i) => target(String(400 + i))), async item => {
      running += 1; peak = Math.max(peak, running);
      await new Promise(resolve => setTimeout(resolve, 2));
      running -= 1;
      return sample(item.appId, 'diff');
    }, { concurrency: 3 });
    expect(peak).toBe(3);
  });

  it('1 件の取得失敗で全体を止めず、その反映先だけを「取得失敗」にする', async () => {
    const rows = await runRolloutPrecheck([target('1'), target('2'), target('3')], async item => {
      if (item.appId === '2') throw new Error('権限がありません\n[API] GET ...');
      return sample(item.appId, 'same');
    }, { now: () => 9 });
    expect(rows.map(item => item.state)).toEqual(['same', 'error', 'same']);
    expect(rows[1].reason).toBe('権限がありません');
  });

  it('中止すると、以降の反映先を「未実行（中止）」にし、取得失敗には数えない', async () => {
    const started: string[] = [];
    const rows = await runRolloutPrecheck(Array.from({ length: 8 }, (_, i) => target(String(500 + i))), async item => {
      started.push(item.appId);
      if (item.appId === '502') throw new RunCancelledError();
      await new Promise(resolve => setTimeout(resolve, 5));
      return sample(item.appId, 'same');
    }, { concurrency: 1 });
    expect(rows.map(item => item.state)).toEqual(['same', 'same', 'notrun', 'notrun', 'notrun', 'notrun', 'notrun', 'notrun']);
    expect(started).toEqual(['500', '501', '502']);
    expect(countRolloutPrecheck(rows)).toMatchObject({ error: 0, notrun: 6, same: 2 });
  });

  it('中止の要求を確認でき、要求後は新しい反映先の確認を始めない', async () => {
    let cancelled = false;
    const rows = await runRolloutPrecheck([target('1'), target('2'), target('3')], async item => { cancelled = true; return sample(item.appId, 'same'); }, { concurrency: 1, isCancelled: () => cancelled });
    expect(rows.map(item => item.state)).toEqual(['same', 'notrun', 'notrun']);
  });

  it('1000 件でも行は要約だけで、サイズが小さい（設定本体を持たない）', async () => {
    const targets = Array.from({ length: 1000 }, (_, i) => target(String(1000 + i)));
    const rows = await runRolloutPrecheck(targets, async item => sample(item.appId, 'diff', { changedLabels: ['フィールド設定', 'ビュー設定'], changeCount: 4 }), { concurrency: 3 });
    expect(rows).toHaveLength(1000);
    expect(JSON.stringify(rows).length).toBeLessThan(400_000);
    expect(buildRolloutPrecheckMarkdown({ generatedAt: '2026-11-01T00:00:00Z', source: { appId: '1', name: '', guestId: '' }, sourceEnvironment: 'production', scopes: ['fieldSettings'], preserveTargetOnly: true, rows }).split('\n').length).toBeLessThan(1100);
  });
});

describe('一括事前確認: 結果の操作', () => {
  const rows = [sample('1', 'diff'), sample('2', 'same'), sample('3', 'error'), sample('4', 'attention'), sample('5', 'same'), sample('6', 'notrun')];

  it('件数と、状態での絞り込み', () => {
    expect(countRolloutPrecheck(rows)).toEqual({ total: 6, diff: 1, same: 2, attention: 1, error: 1, notrun: 1, withPending: 0, withLookupCandidates: 0 });
    expect(filterRolloutPrecheckRows(rows, 'same').map(item => item.appId)).toEqual(['2', '5']);
    expect(filterRolloutPrecheckRows(rows, 'all')).toHaveLength(6);
    expect(describeRolloutPrecheckSummary(countRolloutPrecheck(rows))).toBe('6 件を確認しました（差分あり 1 / 差分なし 2 / 確認が必要 1 / 取得失敗 1 / 未実行（中止） 1）。');
    expect(describeRolloutPrecheckSummary(countRolloutPrecheck([sample('1', 'diff')]))).toBe('1 件を確認しました（差分あり 1 / 差分なし 0）。');
  });

  it('差分なしと確認できた反映先だけを取り除く（失敗・確認が必要・未確認は残す）', () => {
    const targets = [target('1'), target('2'), target('3'), target('4'), target('5'), target('6'), target('7')];
    const { kept, removed } = dropSameRolloutTargets(targets, rows);
    expect(removed.map(item => item.appId)).toEqual(['2', '5']);
    expect(kept.map(item => item.appId)).toEqual(['1', '3', '4', '6', '7']);
    // ゲストスペースが違う同じIDは別の反映先
    expect(dropSameRolloutTargets([target('2', '5')], rows).removed).toEqual([]);
  });

  it('確認し直す反映先は、取得失敗と未実行（中止）', () => {
    expect(rolloutRetryTargets(rows)).toEqual([target('3'), target('6')]);
  });

  it('確認し直した行で置き換え、順序は変えない。新しい反映先は末尾に加える', () => {
    const merged = mergeRolloutPrecheckRows(rows, [sample('3', 'diff'), sample('9', 'same')]);
    expect(merged.map(item => [item.appId, item.state])).toEqual([['1', 'diff'], ['2', 'same'], ['3', 'diff'], ['4', 'attention'], ['5', 'same'], ['6', 'notrun'], ['9', 'same']]);
  });

  it('現在の反映先と続けて反映する反映先の行だけを取り出し、確認していない反映先を返す', () => {
    const selected = selectRolloutPrecheckRows(rows, [target('5'), target('1'), target('8')]);
    expect(selected.rows.map(item => item.appId)).toEqual(['5', '1']);
    expect(selected.unchecked).toEqual([target('8')]);
  });

  it('表示用の言葉', () => {
    expect(formatRolloutPrecheckTarget({ appId: '204', guestId: '5', name: '大阪' })).toBe('#204（ゲスト 5） 大阪');
    expect(describeRolloutPrecheckPending({ pending: 'pending', pendingLabels: ['一覧'] })).toBe('あり（一覧）');
    expect(describeRolloutPrecheckPending({ pending: 'clean', pendingLabels: [] })).toBe('なし');
    expect(describeRolloutPrecheckPending({ pending: '', pendingLabels: [] })).toBe('－');
  });
});

describe('一括事前確認: Markdown', () => {
  const input = {
    generatedAt: '2026-11-01T00:00:00Z', source: { appId: '101', name: '営業<テンプレート>', guestId: '' }, sourceEnvironment: 'production' as const,
    scopes: ['fieldSettings', 'viewSettings'], preserveTargetOnly: true, lookupMap: { '101': '201' },
    rows: [
      sample('203', 'diff', { name: '大阪|営業所', changedLabels: ['フィールド設定', 'ビュー設定'], changeCount: 5, removalCount: 1, pending: 'pending', pendingLabels: ['一覧'], lookupCandidates: 1 }),
      sample('204', 'same', { pending: 'clean' }),
      sample('205', 'error', { reason: '反映先 #205: 権限がありません' }),
      sample('206', 'attention', { reason: '種類が異なります', attentionLabels: ['フィールド設定'] }),
      sample('207', 'notrun', { reason: '中止したため確認していません' })
    ]
  };
  const markdown = buildRolloutPrecheckMarkdown(input);

  it('読み取りだけの確認であることと、反映元・項目・条件を冒頭に書く', () => {
    expect(markdown).toContain('# プレビュー反映 一括事前確認');
    expect(markdown).toContain('読み取りだけの確認です。反映先のプレビューにも書き込んでいません。');
    expect(markdown).toContain('- 反映する項目: フィールド設定、ビュー設定');
    expect(markdown).toContain('- 参照先変換: 101 → 201');
    expect(markdown).toContain('- 反映先だけの一覧・グラフ・アクション: 保持する');
  });

  it('状態ごとの件数と、反映先ごとの結果を表にする', () => {
    expect(markdown).toMatch(/\| 差分あり \| 1 \|[\s\S]*\| 差分なし（一致） \| 1 \|[\s\S]*\| 確認が必要 \| 1 \|[\s\S]*\| 取得失敗 \| 1 \|[\s\S]*\| 未実行（中止） \| 1 \|[\s\S]*\| 合計 \| 5 \|/);
    expect(markdown).toContain('| #203 | 大阪\\|営業所 | 差分あり | フィールド設定、ビュー設定 | 5 | 1 | あり（一覧） | 参照先変換の候補あり |');
    expect(markdown).toContain('| #205 | アプリ205 | 取得失敗 | － | 0 | 0 | － | 反映先 #205: 権限がありません |');
    expect(markdown).toContain('以前からの未公開の変更がある反映先: 1 件');
    expect(markdown).toContain('参照先変換の候補がある反映先: 1 件');
  });

  it('Markdown の記号を退避し、設定値の生 JSON を含めず、禁止用語を使わない', () => {
    expect(markdown).toContain('営業\\<テンプレート\\>');
    expect(markdown).not.toMatch(/[{}]|"properties"|比較元|比較先|ターゲット/);
  });
});

describe('一括事前確認: 直近のファイル本体の保持', () => {
  it('同じファイルは取得し直さず、失敗は保持せず、上限を超えたら古いものから捨てる', async () => {
    const calls: string[] = [];
    let fail = true;
    const download = createRecentFileDownloader(async (guest, key) => { calls.push(`${guest}|${key}`); if (key === 'bad' && fail) throw new Error('x'); return new Blob([key]); }, 2);
    await download('', 'a'); await download('', 'a');
    expect(calls).toEqual(['|a']);
    await expect(download('', 'bad')).rejects.toThrow();
    fail = false;
    await download('', 'bad');
    expect(calls).toEqual(['|a', '|bad', '|bad']);
    await download('', 'c');
    await download('', 'a');
    expect(calls.filter(call => call === '|a')).toHaveLength(2);
  });
});

describe('一括事前確認（実エンジン＋合成 kintone）', () => {
  afterEach(() => { vi.unstubAllGlobals(); __resetRunControlForTests(); });

  const fields = (...defs: any[]) => ({ properties: Object.fromEntries(defs.map(def => [def.code, def])) });
  const source = { fieldSettings: fields(text('name', { label: '顧客名（新）' }), text('added', { label: '追加項目' })), layoutSettings: { layout: [row('name', 'added')] }, viewSettings: { views: { 一覧: { type: 'LIST', name: '一覧', index: '0', fields: ['name'], filterCond: '', sort: '' } } } };
  const prod = (extra: Record<string, any> = {}) => ({ fieldSettings: fields(text('name', { label: '顧客名' })), layoutSettings: { layout: [row('name')] }, viewSettings: { views: {} }, ...extra });
  const world = (options = {}) => createRolloutWorld({
    '1': { name: '顧客管理（開発）', production: source },
    '202': { name: '東京営業所', production: prod() },
    '203': { name: '大阪営業所', production: { ...copyOf(source) } },
    '204': { name: '名古屋営業所', production: prod() },
    '205': { name: '福岡営業所', production: prod({ fieldSettings: fields(text('name', { label: '顧客名' }), { type: 'NUMBER', code: 'added', label: '追加項目' }) }) },
    '206': { name: '札幌営業所', production: prod(), preview: prod({ viewSettings: { views: { 手元: { type: 'LIST', name: '手元', index: '0', fields: ['name'], filterCond: '', sort: '' } } } }), previewRevision: '12' }
  }, options);
  const copyOf = (value: any) => JSON.parse(JSON.stringify(value));
  const baseOptions = { sourceAppId: '1', scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'], preserveTargetOnly: true };

  it('反映先ごとの状態を一覧にし、反映元は 1 回だけ取得し、何も書き込まない', async () => {
    const kintone = world();
    kintone.install();
    const rows = await precheckRolloutTargetsStandalone({ options: baseOptions, targets: [target('202'), target('203'), target('204'), target('205'), target('206')] });
    expect(rows.map(item => [item.appId, item.name, item.state])).toEqual([
      ['202', '東京営業所', 'diff'], ['203', '大阪営業所', 'same'], ['204', '名古屋営業所', 'diff'], ['205', '福岡営業所', 'attention'], ['206', '札幌営業所', 'diff']
    ]);
    expect(rows[0].changedLabels).toEqual(['フィールド設定', 'レイアウト設定', 'ビュー設定']);
    expect(rows[0].pending).toBe('clean');
    expect(rows[4]).toMatchObject({ pending: 'pending', pendingLabels: ['ビュー設定'] });
    expect(rows[3].reason).toContain('種類が異なります');
    expect(kintone.writes()).toEqual([]);
    // 反映元（#1）の設定は項目ごとに 1 回ずつだけ取得する（反映先の数だけ取得し直さない）。
    const sourceGets = kintone.gets(call => call.params?.app === '1');
    expect(sourceGets).toHaveLength(3);
  });

  it('反映先の設定を取得できないときは「取得失敗」にし、他の反映先の確認は続ける', async () => {
    const kintone = world({ failGet: (call: any) => call.appId === '204' && call.preview ? Object.assign(new Error('この操作を実行する権限がありません。'), { code: 'GAIA_NO01' }) : undefined });
    kintone.install();
    const rows = await precheckRolloutTargetsStandalone({ options: baseOptions, targets: [target('202'), target('204'), target('203')] });
    expect(rows.map(item => item.state)).toEqual(['diff', 'error', 'same']);
    expect(rows[1].reason).toContain('反映先を完全に取得できません');
    expect(rows[1].name).toBe('名古屋営業所');
  });

  it('存在しない反映先は名前を確認できず「取得失敗」にする', async () => {
    world().install();
    const rows = await precheckRolloutTargetsStandalone({ options: baseOptions, targets: [target('999')] });
    expect(rows[0]).toMatchObject({ state: 'error', name: '' });
    expect(rows[0].reason).toContain('反映先 #999');
  });

  it('利用者の中止で、以降の反映先を「未実行（中止）」にし、取得失敗にはしない', async () => {
    const run = beginRun();
    const kintone = world({ onGet: (call: any) => { if (call.appId === '203') requestCancel(run); } });
    kintone.install();
    const rows = await precheckRolloutTargetsStandalone({ options: baseOptions, targets: [target('202'), target('203'), target('204'), target('205')], concurrency: 1 });
    endRun(run);
    expect(rows.map(item => item.state)).toEqual(['diff', 'notrun', 'notrun', 'notrun']);
    expect(rows.some(item => item.state === 'error')).toBe(false);
    expect(kintone.writes()).toEqual([]);
  });

  it('反映元を取得できないときは、反映先の取得失敗として並べず例外にする', async () => {
    world({ failGet: (call: any) => call.appId === '1' ? Object.assign(new Error('権限がありません'), { code: 'GAIA_NO01' }) : undefined }).install();
    const rows = await precheckRolloutTargetsStandalone({ options: baseOptions, targets: [target('202')] });
    // 反映元の項目の取得失敗は _fetchError として項目の取得失敗になる（反映先の取得失敗ではないが、差分なしとも言わない）。
    expect(rows[0].state).toBe('error');
    expect(rows[0].reason).toContain('反映元を完全に取得できません');
  });

  it('設定JSONを反映元にしても同じように確認できる', async () => {
    const kintone = world();
    kintone.install();
    const rows = await precheckRolloutTargetsStandalone({ options: { sourceAppId: '1', sourceBundle: { appId: '1', sections: copyOf(source) }, scopes: ['fieldSettings'] }, targets: [target('202'), target('203')] });
    expect(rows.map(item => item.state)).toEqual(['diff', 'same']);
    expect(kintone.gets(call => call.params?.app === '1')).toEqual([]);
  });

  it('参照先変換の候補がある反映先を示す', async () => {
    const kintone = createRolloutWorld({
      '1': { name: '開発', production: { fieldSettings: fields(lookup('customer', 101)) } },
      '202': { name: '本番A', production: { fieldSettings: fields(lookup('customer', 201)) } },
      '203': { name: '本番B', production: { fieldSettings: fields(lookup('customer', 101)) } }
    });
    kintone.install();
    const rows = await precheckRolloutTargetsStandalone({ options: { sourceAppId: '1', scopes: ['fieldSettings'] }, targets: [target('202'), target('203')] });
    expect(rows.map(item => [item.state, item.lookupCandidates])).toEqual([['diff', 1], ['same', 0]]);
  });

  it('同じ反映先に書き込んだ直後の確認では、未公開の変更を自分の反映分として扱う', async () => {
    const kintone = createRolloutWorld({ '1': { name: '開発', production: source }, '202': { name: '東京', production: prod(), previewRevision: '11' } });
    kintone.install();
    const [withoutKnowledge] = await precheckRolloutTargetsStandalone({ options: baseOptions, targets: [target('202')] });
    expect(withoutKnowledge.pending).toBe('pending');
    const [own] = await precheckRolloutTargetsStandalone({ options: baseOptions, targets: [target('202')], lastWrite: { targetAppId: '202', targetGuestId: '', finalRevision: '11', priorState: 'clean' } });
    expect(own.pending).toBe('own');
  });
});
