'use strict';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sectionsToRun } from '../../src/deploy/sourceDisplay';
import { applySelection, createSourceSession, recomposeSession, setJsonOverride, setOverride, type SourceSession } from '../../src/deploy/sourceSession';
import {
  buildVerifyExpectations,
  compareVerifyExpectations,
  describeVerifyResult,
  formatVerifyValue,
  satisfiesExpected,
  verifySideFor,
  verifyState,
  type VerifyExpectation
} from '../../src/deploy/sourceVerify';
import { __resetRunControlForTests } from '../../src/runControl';
import { runSourceToProductionStandalone, verifySourceDeployStandalone } from '../../src/tabs/deploy-source-standalone';
import { makeWorld } from '../reflect/compose-world';
import type { SourceDeployResult } from '../../src/deploy/sourceTypes';

const POLL = { initialMs: 1, maxMs: 2, timeoutMs: 5000 };

beforeEach(() => {
  vi.stubGlobal('document', { createElement: vi.fn(() => ({ href: '', download: '', click() {} })) });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:backup');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('satisfiesExpected', () => {
  it('オブジェクトは期待するキーだけを調べ、kintone が足した既定値は許す', () => {
    expect(satisfiesExpected({ type: 'LIST', fields: ['a'] }, { type: 'LIST', fields: ['a'], extra: 1 })).toBe(true);
    expect(satisfiesExpected({ type: 'LIST', fields: ['a'] }, { type: 'LIST', fields: ['b'] })).toBe(false);
    expect(satisfiesExpected({ a: 1 }, {})).toBe(false);
  });

  it('数値と文字列は同じ表記なら同じ値、真偽値は厳密に比べる', () => {
    expect(satisfiesExpected(16, '16')).toBe(true);
    expect(satisfiesExpected('16', 17)).toBe(false);
    expect(satisfiesExpected(true, 'true')).toBe(false);
    expect(satisfiesExpected(false, false)).toBe(true);
  });

  it('削除した値は、反映先に残っていなければ満たす', () => {
    expect(satisfiesExpected(undefined, undefined)).toBe(true);
    expect(satisfiesExpected(undefined, null)).toBe(true);
    expect(satisfiesExpected(undefined, { code: 'old' })).toBe(false);
  });

  it('配列は長さと各要素を同じ位置で比べる', () => {
    expect(satisfiesExpected(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(satisfiesExpected(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(satisfiesExpected(['a'], ['a', 'b'])).toBe(false);
  });
});

describe('compareVerifyExpectations / describeVerifyResult', () => {
  const expectation = (id: string, extra: Partial<VerifyExpectation> = {}): VerifyExpectation => ({
    id, sectionKey: 'fieldSettings', sectionLabel: 'フィールド設定', place: `フィールド設定 / ${id}`, pointer: `/properties/${id}/label`, kind: '変更', check: 'value', expected: '新', expectedText: '新', edited: false, ...extra
  });
  const meta = { checkedAt: '2026-11-09T00:00:00.000Z', side: 'production' as const };
  const fields = (properties: Record<string, any>) => ({ fieldSettings: { ok: true as const, value: { properties } } });

  it('選んだ変更がすべて意図した値なら「すべて反映されています」', () => {
    const result = compareVerifyExpectations([expectation('a'), expectation('b', { edited: true, expected: '直した値' })], fields({ a: { label: '新' }, b: { label: '直した値' } }), meta);
    expect(result).toMatchObject({ total: 2, reflected: 2, mismatches: [], unknownCount: 0, editedTotal: 1, editedReflected: 1 });
    expect(verifyState(result)).toBe('all');
    expect(describeVerifyResult(result)).toEqual({ text: '選んだ 2 件はすべて反映されています（本番の設定を確認しました。修正した値 1 件も、その値になっています）。', tone: 'ok' });
  });

  it('反映されていない変更は、場所・期待した値・現在の値を返す（修正した値が違うときも同じ）', () => {
    const result = compareVerifyExpectations([expectation('a'), expectation('b', { edited: true, expected: '直した値', expectedText: '直した値' })], fields({ a: { label: '旧' }, b: { label: '元の値' } }), meta);
    expect(result.reflected).toBe(0);
    expect(result.mismatches).toEqual([
      { sectionKey: 'fieldSettings', sectionLabel: 'フィールド設定', place: 'フィールド設定 / a', kind: '変更', expectedText: '新', currentText: '旧' },
      { sectionKey: 'fieldSettings', sectionLabel: 'フィールド設定', place: 'フィールド設定 / b', kind: '変更', expectedText: '直した値', currentText: '元の値' }
    ]);
    expect(result.editedReflected).toBe(0);
    expect(verifyState(result)).toBe('mismatch');
    expect(describeVerifyResult(result)).toEqual({ text: '反映されていない変更 2 件（選んだ 2 件中。本番の設定を確認しました）。', tone: 'err' });
  });

  it('取得できなかった項目は「確認できません」とし、「反映されています」と言わない', () => {
    const result = compareVerifyExpectations([expectation('a'), expectation('b', { sectionKey: 'viewSettings', sectionLabel: 'ビュー設定' })], { ...fields({ a: { label: '新' } }), viewSettings: { ok: false, message: 'ビュー設定を取得できませんでした（GAIA_NO01）\n[API] GET ...' } }, meta);
    expect(result).toMatchObject({ reflected: 1, unknownCount: 1, mismatches: [], unknown: [{ sectionKey: 'viewSettings', sectionLabel: 'ビュー設定', count: 1, reason: 'ビュー設定を取得できませんでした（GAIA_NO01）' }] });
    expect(verifyState(result)).toBe('unknown');
    const message = describeVerifyResult(result);
    expect(message.tone).toBe('warn');
    expect(message.text).toContain('確認できません。選んだ 2 件のうち 1 件の内容を確認できませんでした（確認できた 1 件は反映されています）');
    expect(message.text).not.toContain('すべて反映されています');
  });

  it('反映されていない変更と確認できない変更が混ざるときは、両方を示す', () => {
    const result = compareVerifyExpectations([expectation('a'), expectation('b', { sectionKey: 'viewSettings' })], fields({ a: { label: '旧' } }), meta);
    expect(describeVerifyResult(result).text).toBe('反映されていない変更 1 件（選んだ 2 件中。本番の設定を確認しました）。確認できなかった変更 1 件。');
  });

  it('プラグインの ID は一覧にあるかで、並び順は反映先にあるものどうしの順で確認する', () => {
    const plugin: VerifyExpectation = { ...expectation('p'), sectionKey: 'pluginSettings', sectionLabel: 'プラグイン', pointer: '/plugins/plug1', check: 'member', expected: 'plug1', expectedText: 'plug1' };
    const order: VerifyExpectation = { ...expectation('o'), sectionKey: 'viewSettings', sectionLabel: 'ビュー設定', pointer: '/views#order', check: 'order', expected: ['B', 'A'], expectedText: 'B → A' };
    const ok = compareVerifyExpectations([plugin, order], { pluginSettings: { ok: true, value: { plugins: ['plug0', 'plug1'] } }, viewSettings: { ok: true, value: { views: { A: { index: '1' }, B: { index: '0' }, Z: { index: '2' } } } } }, meta);
    expect(ok).toMatchObject({ reflected: 2, mismatches: [] });
    const ng = compareVerifyExpectations([plugin, order], { pluginSettings: { ok: true, value: { plugins: ['plug0'] } }, viewSettings: { ok: true, value: { views: { A: { index: '0' }, B: { index: '1' } } } } }, meta);
    expect(ng.mismatches.map(item => [item.place, item.currentText])).toEqual([['フィールド設定 / p', '（一覧にありません）'], ['フィールド設定 / o', 'A → B']]);
  });

  it('JS/CSS はファイル名で比べ、そのことを注記する', () => {
    const js: VerifyExpectation = { ...expectation('js'), sectionKey: 'customizeSettings', sectionLabel: 'JS/CSS設定', pointer: '/desktop/js', expected: [{ type: 'FILE', file: { fileKey: 'SRC-KEY', name: 'a.js' } }], expectedText: 'a.js' };
    const result = compareVerifyExpectations([js], { customizeSettings: { ok: true, value: { desktop: { js: [{ type: 'FILE', file: { fileKey: 'TARGET-KEY', name: 'a.js' } }], css: [] } } } }, meta);
    expect(result.reflected).toBe(1);
    expect(result.notes).toEqual(['JS/CSS はファイル名で確認しています（ファイルの中身は比べていません）。']);
  });

  it('値の表示は、真偽値を「はい / いいえ」、無い値を「（なし）」、長い値を先頭だけにする', () => {
    expect(formatVerifyValue(true)).toBe('はい');
    expect(formatVerifyValue(undefined)).toBe('（なし）');
    expect(formatVerifyValue('')).toBe('（空）');
    expect(formatVerifyValue('x'.repeat(200))).toHaveLength(121);
  });
});

describe('verifySideFor', () => {
  const base = (extra: Partial<SourceDeployResult> & { status?: string; cancelled?: boolean; sectionStatus?: 'ok' | 'ng' } = {}): SourceDeployResult => ({
    goal: extra.goal || 'production',
    apply: { logs: [], sections: [{ sectionKey: 'fieldSettings', label: 'フィールド設定', status: extra.sectionStatus || 'ok' }], finalRevision: '1', ...(extra.cancelled ? { cancelled: true } : {}) },
    ...(extra.status ? { deploy: { mode: 'deploy', batchMode: 'sequential', startedAt: '', finishedAt: '', logs: [], apps: [{ appId: '2', guestId: '', name: 'x', status: extra.status as any, productionRevisionBefore: '1', previewRevision: '2' }] } } : {})
  });
  it('本番まで反映が成功・完了を確認できないときは本番、プレビューまでですべて書き込めたときはプレビューを確認する', () => {
    expect(verifySideFor(base({ status: 'success' }))).toBe('production');
    expect(verifySideFor(base({ status: 'unknown' }))).toBe('production');
    expect(verifySideFor(base({ goal: 'preview' }))).toBe('preview');
  });
  it('本番へ反映していない・失敗・中止は確認の対象にしない', () => {
    expect(verifySideFor(base({ status: 'failed' }))).toBeNull();
    expect(verifySideFor(base())).toBeNull();
    expect(verifySideFor(base({ goal: 'preview', sectionStatus: 'ng' }))).toBeNull();
    expect(verifySideFor(base({ status: 'success', cancelled: true }))).toBeNull();
  });
});

// =============================================================================
// 実エンジン（差分の抽出・選択・書き込み・本番反映）＋合成 kintone
// =============================================================================

async function reflectAndExpect(world: ReturnType<typeof makeWorld>, choose: (session: SourceSession) => void) {
  const preview = await world.preview();
  const identities = { source: { appId: '1', name: '開発用', code: '', guestId: '' }, target: { appId: '2', name: '本番用', code: '', guestId: '' } };
  const session = createSourceSession({ signature: 'sig', opts: world.reflect, identities, sourceEnvironment: 'production', preview });
  choose(session);
  recomposeSession(session, world.reflect.scopes);
  const run = sectionsToRun(session.composed, world.reflect.scopes);
  const expectations = buildVerifyExpectations({ session, sections: run });
  const result = await runSourceToProductionStandalone({
    reflect: { ...world.reflect, scopes: run.map(section => section.sectionKey) }, reviewBaseline: preview.baseline,
    composed: Object.fromEntries(run.map(section => [section.sectionKey, section.after])), goal: 'production', targetPending: preview.targetPending, poll: POLL
  });
  expect(result.deploy?.apps[0].status).toBe('success');
  return { session, expectations, result };
}
const verify = (expectations: VerifyExpectation[], side: 'production' | 'preview' = 'production') => verifySourceDeployStandalone({ target: { appId: '2', guestId: '' }, side, expectations });

describe('verifySourceDeployStandalone（実エンジン＋合成 kintone）', () => {
  it('反映後の本番を読み取り、選んだ変更がすべて反映されていると確かめる（修正した値を含む）', async () => {
    const world = makeWorld();
    const { expectations } = await reflectAndExpect(world, session => {
      setOverride(session, 'fieldSettings', '/properties/name/label', 'お客様名', '顧客名（新）');
    });
    expect(expectations.length).toBeGreaterThan(3);
    expect(expectations.find(item => item.pointer === '/properties/name/label')).toMatchObject({ edited: true, expected: 'お客様名' });
    const before = world.env.calls.length;
    const result = await verify(expectations);
    expect(world.env.calls.slice(before).every(call => call.method === 'GET' && !call.url.includes('/preview/') )).toBe(true);
    expect(result.mismatches).toEqual([]);
    expect(result.unknownCount).toBe(0);
    expect(result.reflected).toBe(result.total);
    expect(result.editedTotal).toBe(1);
    expect(world.apps['2'].production.fieldSettings.properties.name.label).toBe('お客様名');
    expect(describeVerifyResult(result).text).toMatch(/^選んだ \d+ 件はすべて反映されています（本番の設定を確認しました。修正した値 1 件も、その値になっています）。/);
  });

  it('本番が一部の値を受け取っていない（反映後に別の値になっている）ときは、その場所・期待した値・現在の値を示す', async () => {
    const world = makeWorld();
    const { expectations } = await reflectAndExpect(world, session => {
      setOverride(session, 'fieldSettings', '/properties/name/label', 'お客様名', '顧客名（新）');
    });
    // 本番で一部の値が反映されていない状況を再現する
    world.apps['2'].production.fieldSettings.properties.name.required = false;
    world.apps['2'].production.fieldSettings.properties.name.label = '顧客名';
    delete world.apps['2'].production.viewSettings.views.List;
    const result = await verify(expectations);
    const places = result.mismatches.map(item => item.place);
    expect(places).toContain('フィールド設定 / 顧客名（新）（name） / 必須項目にする');
    expect(places).toContain('フィールド設定 / 顧客名（新）（name） / フィールド名');
    expect(places.some(place => place.startsWith('ビュー設定'))).toBe(true);
    const required = result.mismatches.find(item => item.place.endsWith('必須項目にする'))!;
    expect(required).toMatchObject({ kind: '変更', expectedText: 'はい', currentText: 'いいえ' });
    const label = result.mismatches.find(item => item.place.endsWith('フィールド名'))!;
    expect(label).toMatchObject({ expectedText: 'お客様名', currentText: '顧客名' });
    expect(result.editedReflected).toBe(0);
    expect(verifyState(result)).toBe('mismatch');
    expect(describeVerifyResult(result).tone).toBe('err');
  });

  it('選ばなかった変更が反映先に残っているのは正常で、問題に数えない', async () => {
    const world = makeWorld();
    const { expectations, session } = await reflectAndExpect(world, current => {
      applySelection(current, current.models.fieldSettings.changes.filter(change => change.pointer !== '/properties/name/required').map(change => change.id), false);
      applySelection(current, ['fieldSettings:/properties/name/required'], true);
      for (const key of ['layoutSettings', 'viewSettings', 'appSettings']) applySelection(current, current.models[key].changes.map(change => change.id), false);
    });
    expect(expectations.map(item => item.pointer)).toEqual(['/properties/name/required']);
    const result = await verify(expectations);
    expect(result).toMatchObject({ total: 1, reflected: 1, mismatches: [] });
    expect(world.apps['2'].production.fieldSettings.properties.name.label).toBe('顧客名');
    expect(session.models.fieldSettings.changes.length).toBeGreaterThan(1);
  });

  it('JSON で直した項目は、直した場所の値を確認する', async () => {
    const world = makeWorld();
    const { expectations } = await reflectAndExpect(world, session => {
      const model = session.models.appSettings;
      setJsonOverride(session, 'appSettings', { ...model.before, theme: 'BLUE', enableComments: true });
      for (const key of ['fieldSettings', 'layoutSettings', 'viewSettings']) applySelection(session, session.models[key].changes.map(change => change.id), false);
    });
    expect(expectations.map(item => [item.sectionKey, item.pointer, item.expected, item.edited])).toEqual([
      ['appSettings', '/theme', 'BLUE', true],
      ['appSettings', '/enableComments', true, false]
    ]);
    const result = await verify(expectations);
    expect(result).toMatchObject({ total: 2, reflected: 2, editedTotal: 1, editedReflected: 1 });
  });

  it('設定を取得できない項目は、確認できないと返す（例外にしない）。取得できた項目は確認する', async () => {
    const world = makeWorld();
    const { expectations } = await reflectAndExpect(world, () => {});
    const original = (globalThis as any).kintone.api;
    vi.stubGlobal('kintone', { api: vi.fn(async (url: string, method: string, params: any) => {
      if (url.endsWith('/app/views.json')) throw Object.assign(new Error('権限がありません。'), { code: 'CB_NO02' });
      return original(url, method, params);
    }) });
    const result = await verify(expectations);
    const viewCount = expectations.filter(item => item.sectionKey === 'viewSettings').length;
    expect(viewCount).toBeGreaterThan(0);
    expect(result.unknown).toEqual([expect.objectContaining({ sectionKey: 'viewSettings', sectionLabel: 'ビュー設定', count: viewCount })]);
    expect(result.unknown[0].reason).toContain('権限がありません。');
    expect(result.unknownCount).toBe(viewCount);
    expect(result.mismatches).toEqual([]);
    expect(result.reflected).toBe(result.total - viewCount);
    expect(verifyState(result)).toBe('unknown');
    expect(describeVerifyResult(result).text).not.toContain('すべて反映されています');
    // 通信そのものが失敗しても、確認できないとして返す
    vi.stubGlobal('kintone', { api: vi.fn(async () => { throw new Error('接続できません'); }) });
    const offline = await verify(expectations);
    expect(offline.unknownCount).toBe(expectations.length);
    expect(offline.reflected).toBe(0);
    expect(offline.unknown.every(item => item.reason.length > 0)).toBe(true);
  });
});
