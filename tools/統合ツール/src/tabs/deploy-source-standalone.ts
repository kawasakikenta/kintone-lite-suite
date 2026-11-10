'use strict';

/**
 * 「反映元アプリから本番へ」のエンジン。取り決めは deploy/sourceTypes.ts を参照。
 *
 * 1. 反映先プレビューへ、選んだ変更と修正のとおりに書き込む（runApplyPreviewStandalone。安全確認・バックアップ・revision の引き継ぎはそちらの規則）。
 * 2. goal が production なら、書き込みがすべて成功し、確認が一致したときだけ続けて本番へ反映する（runDeployStandalone）。
 * 書き込み後に本番へ反映しない場合は、その理由を deploySkipped で返す（プレビューへの書き込みは済んでいる）。
 */

import { fetchBundle } from '../api.js';
import { compareVerifyExpectations, type SourceVerifyResult, type VerifyExpectation, type VerifyRead, type VerifySide } from '../deploy/sourceVerify.js';
import type { SourceDeployOptions, SourceDeployResult, SourceApplyResult } from '../deploy/sourceTypes.js';
import type { DeployAppInspection } from '../deploy/types.js';
import { isRunCancelledError, RUN_CANCELLED_MESSAGE } from '../runControl.js';
import { previewWriteState } from '../reflect/applyOutcome.js';
import { buildReflectSectionPlan } from '../reflect/standalonePlan.js';
import { isCompleteReflectSection } from '../reflect/standalonePreflight.js';
import { runApplyPreviewStandalone } from './reflect-standalone.js';
import { inspectDeployTargetsStandalone, runDeployStandalone } from './deploy-standalone.js';

const WRITTEN_NOTE = '反映先プレビューへの書き込みは完了しています。';
const PUBLISH_GUIDE = '本番反映の「プレビューの変更を公開」で内容を確認して反映できます。';

const reasonOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** 反映先プレビューへ書き込み（runApplyPreviewStandalone + composed）、goal が production なら続けて本番へ反映する。 */
export async function runSourceToProductionStandalone(opts: SourceDeployOptions): Promise<SourceDeployResult> {
  const setStatus = (message: string) => { try { opts.setStatus?.(message); } catch { /* 表示側の例外は無視する */ } };
  let apply: SourceApplyResult;
  try {
    apply = await runApplyPreviewStandalone({
      ...opts.reflect, reviewBaseline: opts.reviewBaseline, composed: opts.composed, doBackup: true, stopOnError: true, onSectionUpdate: opts.onSectionUpdate
    }, message => setStatus(message), () => {});
  } catch (error) {
    // 利用者の中止は結果で返す。書き込みの前に止まった中止だけがここへ来る（書き込み中の中止は apply.cancelled）。
    if (!isRunCancelledError(error)) throw error;
    const empty: SourceApplyResult = { logs: [`${RUN_CANCELLED_MESSAGE}（書き込み前に停止）`], sections: [], finalRevision: '', cancelled: true };
    return { goal: opts.goal, apply: empty, ...(opts.goal === 'production' ? { deploySkipped: '中止したため、まだ何も書き込んでいません。本番へも反映していません。' } : {}) };
  }
  const result: SourceDeployResult = { goal: opts.goal, apply };
  if (opts.goal === 'preview') return result;
  const skip = (reason: string, inspection?: DeployAppInspection): SourceDeployResult => {
    const base: SourceDeployResult = { ...result, deploySkipped: reason };
    if (inspection) { const { productionBundle: _production, previewBundle: _preview, ...rest } = inspection; base.deployInspection = rest; }
    return base;
  };

  // 1. 書き込みの中止・失敗・未実行が 1 項目でもあれば本番へは反映しない。
  // 反映先プレビューが変わったかは、書き込めた件数で言い分ける（1 件も書き込めていないのに「書き込み済み」「一部更新」と言わない）。
  const writeState = previewWriteState(apply.sections);
  const UNCHANGED_NOTE = '反映先プレビューは変わっていません。';
  const PARTIAL_NOTE = '反映先プレビューには一部だけ書き込まれています。差分を取得し直して現在の状態を確認してください。';
  if (apply.cancelled) return skip(`中止したため、本番へは反映していません。${writeState === 'none' ? UNCHANGED_NOTE : '反映先プレビューは一部だけ更新されている可能性があります。差分を取得し直して現在の状態を確認してください。'}`);
  const incomplete = apply.sections.filter(section => section.status === 'ng' || section.status === 'pending');
  if (incomplete.length) {
    const list = incomplete.map(section => `${section.label}: ${section.status === 'ng' ? '失敗' : '未実行'}`).join('、');
    return skip(`反映先プレビューへの書き込みが完了しなかった項目があるため（${list}）、本番へは反映していません。${writeState === 'none' ? UNCHANGED_NOTE : PARTIAL_NOTE}`);
  }

  // 2. 以前からの未公開の変更がある、または有無を確認できなかったときは、利用者の了承がなければ本番へ反映しない
  //    （本番へ反映するとプレビューの全体が公開されるため、自分の書き込み以外が混ざっていないと言えない場合は止める）。
  const pending = opts.targetPending;
  if (pending?.state !== 'clean' && pending?.state !== 'own' && !opts.allowPendingChanges) {
    const reason = pending?.state === 'pending' ? '反映先には以前からの未公開の変更があるため' : '反映先に以前からの未公開の変更があるか確認できなかったため';
    return skip(`${WRITTEN_NOTE}ただし、${reason}、本番へは反映していません。${PUBLISH_GUIDE}`);
  }

  // 3. 書き込み後の反映先の本番とプレビューを確認する。
  setStatus('反映先の本番とプレビューを確認しています…');
  let inspection: DeployAppInspection;
  try {
    const inspected = await inspectDeployTargetsStandalone({ targets: [{ appId: opts.reflect.targetAppId, guestId: opts.reflect.targetGuestId || '' }] });
    inspection = inspected.apps[0];
  } catch (error) {
    if (isRunCancelledError(error)) return skip(`${WRITTEN_NOTE}本番の確認中に中止したため、本番へは反映していません。${PUBLISH_GUIDE}`);
    return skip(`${WRITTEN_NOTE}本番とプレビューを確認できなかったため、本番へは反映していません（${reasonOf(error)}）。${PUBLISH_GUIDE}`);
  }
  if (!inspection) return skip(`${WRITTEN_NOTE}本番とプレビューを確認できなかったため、本番へは反映していません。${PUBLISH_GUIDE}`, undefined);
  if (inspection.state !== 'changes') {
    const reason = inspection.state === 'clean' ? '反映先の本番とプレビューに差がないため、本番へ反映するものがありません。'
      : inspection.state === 'processing' ? `反映先は kintone が反映を処理中のため、本番へは反映していません（${inspection.error || '処理の完了を待ってから確認し直してください'}）。`
      : `反映先の本番とプレビューを確認できなかったため、本番へは反映していません（${inspection.error || '原因不明'}）。`;
    return skip(`${WRITTEN_NOTE}${reason}${inspection.state === 'clean' ? '' : PUBLISH_GUIDE}`, inspection);
  }
  if (apply.finalRevision && inspection.previewRevision !== apply.finalRevision) {
    return skip(`${WRITTEN_NOTE}ただし、書き込みの後にほかの更新が入ったため、本番へは反映していません（プレビューの設定の更新番号 revision ${apply.finalRevision} → ${inspection.previewRevision}）。内容を確認してから反映してください。${PUBLISH_GUIDE}`, inspection);
  }
  const expectedProduction = pending?.productionRevision;
  if (expectedProduction && /^\d+$/.test(expectedProduction) && inspection.productionRevision !== expectedProduction) {
    return skip(`${WRITTEN_NOTE}ただし、差分を抽出した後に本番が更新されたため、本番へは反映していません（本番の設定の更新番号 revision ${expectedProduction} → ${inspection.productionRevision}）。内容を確認してから反映してください。${PUBLISH_GUIDE}`, inspection);
  }

  // 4. 本番へ反映する。
  const { productionBundle: _production, previewBundle: _preview, ...record } = inspection;
  const deploy = await runDeployStandalone({
    mode: 'deploy', batchMode: 'sequential', stopOnError: true, targets: [inspection],
    onUpdate: opts.onDeployUpdate, setStatus: opts.setStatus, poll: opts.poll
  });
  return { ...result, deploy, deployInspection: record };
}

export interface VerifySourceDeployOptions {
  /** 確認する反映先（読み取るだけ。書き込まない） */
  target: { appId: string; guestId: string };
  /** 本番まで反映したなら production、プレビューまでなら preview */
  side: VerifySide;
  /** 実行したときに控えた、選んだ変更の場所と期待する値 */
  expectations: readonly VerifyExpectation[];
  setStatus?: (message: string) => void;
}

/**
 * 反映後の内容を確認する（読み取りだけ）。反映先の現在の設定（side の本番またはプレビュー）を、反映と同じ形（PUT 形）で読み取り、
 * 実行したときに控えた期待する値と比べる。取得に失敗した項目は「確認できません」として返す（例外にしない。中止だけは伝える）。
 * 設定を PUT 形にするのは、差分の抽出と同じ buildReflectSectionPlan（反映先を反映元にも渡して、before だけを使う）。
 */
export async function verifySourceDeployStandalone(opts: VerifySourceDeployOptions): Promise<SourceVerifyResult> {
  const keys = [...new Set(opts.expectations.map(item => item.sectionKey))];
  const read: Record<string, VerifyRead> = {};
  const failAll = (message: string) => { for (const key of keys) read[key] = { ok: false, message }; };
  opts.setStatus?.(opts.side === 'production' ? '本番の設定を読み取って確認中…' : '反映先プレビューの設定を読み取って確認中…');
  try {
    const bundle = await fetchBundle({
      rawSettings: true, appId: opts.target.appId, guestId: opts.target.guestId || '', preview: opts.side === 'preview', sections: keys,
      onProgress: (done, label) => opts.setStatus?.(`${opts.side === 'production' ? '本番' : '反映先プレビュー'}の設定を確認中 ${Math.round(done * 100)}%（${label}）`)
    });
    for (const key of keys) {
      const section = bundle.sections?.[key];
      if (!isCompleteReflectSection(section)) { read[key] = { ok: false, message: String(section?._fetchError || '設定を完全には取得できませんでした') }; continue; }
      const plan = buildReflectSectionPlan(key, section, section);
      read[key] = plan.values ? { ok: true, value: plan.values.before } : { ok: false, message: plan.blockers[0] || plan.message || '設定の形式を読み取れませんでした' };
    }
  } catch (error) {
    if (isRunCancelledError(error)) throw error;
    failAll(`設定を取得できませんでした（${reasonOf(error)}）`);
  }
  return compareVerifyExpectations(opts.expectations, read, { checkedAt: new Date().toISOString(), side: opts.side });
}
