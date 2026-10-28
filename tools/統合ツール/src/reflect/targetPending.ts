import { apiGet, buildApiPrefix, fetchBundle } from '../api.js';
import { reflectSectionLabel } from './sections.js';
import { isRunCancelledError } from '../runControl.js';
import { isCompleteReflectSection, stableReflectStringify } from './standalonePreflight.js';

/**
 * clean: 本番とプレビューの revision が一致（未公開の変更なし）。
 * own: 未公開の変更があるが、このツールの直前の反映によるものだけ（UI が直前の実行結果から判定する）。
 * pending: 以前からの未公開の変更がある。unknown: 確認できない。
 */
export interface ReflectTargetPending { state: 'clean' | 'own' | 'pending' | 'unknown'; productionRevision: string; previewRevision: string; sectionKeys: string[]; message: string }

export interface ReflectLastRunInfo { targetAppId: string; targetGuestId: string; /** 最後の書き込み後のプレビュー revision */ finalRevision: string; /** その反映の差分確認時の判定 */ priorState?: ReflectTargetPending['state'] }

/**
 * 直前にこのツールが同じ反映先へ書き込んだ直後の再確認では、未公開の変更は自分の反映分なので「以前からの変更」と扱わない。
 * プレビューの revision が直前の反映の最終 revision と一致し、その反映前に未公開の変更が無かった場合だけ own にする。
 */
export function reconcileOwnPendingChanges(pending: ReflectTargetPending | undefined, lastRun: ReflectLastRunInfo | null | undefined, target: { appId: string; guestId: string }): ReflectTargetPending | undefined {
  if (!pending || pending.state !== 'pending' || !lastRun) return pending;
  if (lastRun.targetAppId !== target.appId || (lastRun.targetGuestId || '') !== (target.guestId || '')) return pending;
  if (!/^\d+$/.test(lastRun.finalRevision) || lastRun.finalRevision !== pending.previewRevision) return pending;
  if (lastRun.priorState !== 'clean' && lastRun.priorState !== 'own') return pending;
  return { ...pending, state: 'own', message: `反映先プレビューの未公開の変更は、このツールの直前の反映によるものだけです（設定の更新番号 revision は 本番 ${pending.productionRevision} / プレビュー ${pending.previewRevision}）。アプリの設定画面の「変更を中止」で取り消せます。` };
}

/** JS/CSS の fileKey は環境ごとに異なりうるため、ファイル名とサイズで比べる。 */
const comparableResources = (list: any) => Array.isArray(list) ? list.map((item: any) => item?.type === 'FILE' ? { type: 'FILE', name: item.file?.name ?? '', size: String(item.file?.size ?? '') } : item) : list;

/** revision など取得のたびに変わるメタ情報を除き、設定内容だけを比較する。 */
const comparable = (key: string, section: any) => {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return stableReflectStringify(section);
  const { revision: _revision, ...rest } = section;
  if (key === 'customizeSettings') for (const platform of ['desktop', 'mobile']) if (rest[platform] && typeof rest[platform] === 'object') rest[platform] = { ...rest[platform], js: comparableResources(rest[platform].js), css: comparableResources(rest[platform].css) };
  return stableReflectStringify(rest);
};

/**
 * 反映先プレビューに以前からの未公開の変更があるかを確認する（書き込みなし）。
 * 反映先のプレビューと本番のrevisionを比べ、異なる場合は選択項目の内容も比較する。
 * 取得に失敗しても例外は投げず、unknown を返す（反映を止める条件にはしない）。
 */
export async function inspectTargetPendingChanges(opts: { targetAppId: string; targetGuestId?: string; scopes: string[] }, targetPreviewBundle: any): Promise<ReflectTargetPending> {
  const unknown = (productionRevision: string, previewRevision: string, reason: string): ReflectTargetPending => ({ state: 'unknown', productionRevision, previewRevision, sectionKeys: [], message: `反映先プレビューに未公開の変更があるか確認できませんでした（${reason}）。` });
  let productionRevision = '', previewRevision = '';
  try {
    // 取得できていない項目や、取得中の更新で revision が食い違う状態では「未公開の変更なし」と言えない。
    const incomplete = opts.scopes.find(key => !isCompleteReflectSection(targetPreviewBundle?.sections?.[key]));
    if (incomplete) return unknown('', '', `反映先プレビューの${reflectSectionLabel(incomplete)}を取得できません`);
    const revisions = new Set(opts.scopes.map(key => String(targetPreviewBundle?.meta?.sectionRevisions?.[key] ?? targetPreviewBundle?.sections?.[key]?.revision ?? '')));
    if (revisions.size !== 1) return unknown('', '', '取得中に反映先プレビューが更新された可能性があります');
    previewRevision = [...revisions][0];
    if (!/^\d+$/.test(previewRevision)) return unknown('', '', '反映先プレビューのrevisionがありません');
    const response = await apiGet(buildApiPrefix(opts.targetGuestId || '', false), '/app/settings.json', { app: opts.targetAppId });
    productionRevision = String(response?.revision ?? '');
    if (!/^\d+$/.test(productionRevision)) return unknown('', previewRevision, '本番のrevisionがありません');
    if (productionRevision === previewRevision) return { state: 'clean', productionRevision, previewRevision, sectionKeys: [], message: '反映先プレビューに未公開の変更はありません。' };
    const production = await fetchBundle({ appId: opts.targetAppId, guestId: opts.targetGuestId || '', preview: false, sections: opts.scopes, rawSettings: true });
    const sectionKeys: string[] = [];
    for (const key of opts.scopes) {
      const before = production.sections?.[key], after = targetPreviewBundle?.sections?.[key];
      if (!isCompleteReflectSection(before) || !isCompleteReflectSection(after)) return unknown(productionRevision, previewRevision, `${reflectSectionLabel(key)}を取得できません`);
      if (comparable(key, before) !== comparable(key, after)) sectionKeys.push(key);
    }
    const customizeNote = opts.scopes.includes('customizeSettings') ? '。JS/CSSのファイルは名前とサイズだけで比べています' : '';
    const message = sectionKeys.length
      ? `反映先プレビューには未公開の変更があります（${sectionKeys.map(reflectSectionLabel).join('、')}）。公開すると今回の反映と一緒に本番へ反映されます。`
      : `選択した項目には未公開の変更はありませんが、ほかの設定に未公開の変更がある可能性があります（設定の更新番号 revision が 本番 ${productionRevision} とプレビュー ${previewRevision} で異なります${customizeNote}）。`;
    return { state: 'pending', productionRevision, previewRevision, sectionKeys, message };
  } catch (error: any) { if (isRunCancelledError(error)) throw error; return unknown(productionRevision, previewRevision, error?.message || String(error)); }
}
