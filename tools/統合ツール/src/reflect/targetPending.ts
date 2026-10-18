import { apiGet, buildApiPrefix, fetchBundle } from '../api.js';
import { reflectSectionLabel } from './sections.js';
import { isCompleteReflectSection, stableReflectStringify } from './standalonePreflight.js';

export interface ReflectTargetPending { state: 'clean' | 'pending' | 'unknown'; productionRevision: string; previewRevision: string; sectionKeys: string[]; message: string }

/** revision など取得のたびに変わるメタ情報を除き、設定内容だけを比較する。 */
const comparable = (section: any) => {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return stableReflectStringify(section);
  const { revision: _revision, ...rest } = section;
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
    previewRevision = [...Object.values(targetPreviewBundle?.meta?.sectionRevisions || {}), ...Object.values(targetPreviewBundle?.sections || {}).map((section: any) => section?.revision)].map(value => String(value ?? '')).find(value => /^\d+$/.test(value)) || '';
    if (!previewRevision) return unknown('', '', '反映先プレビューのrevisionがありません');
    const response = await apiGet(buildApiPrefix(opts.targetGuestId || '', false), '/app/settings.json', { app: opts.targetAppId });
    productionRevision = String(response?.revision ?? '');
    if (!/^\d+$/.test(productionRevision)) return unknown('', previewRevision, '本番のrevisionがありません');
    if (productionRevision === previewRevision) return { state: 'clean', productionRevision, previewRevision, sectionKeys: [], message: '反映先プレビューに未公開の変更はありません。' };
    const production = await fetchBundle({ appId: opts.targetAppId, guestId: opts.targetGuestId || '', preview: false, sections: opts.scopes, rawSettings: true });
    const sectionKeys: string[] = [];
    for (const key of opts.scopes) {
      const before = production.sections?.[key], after = targetPreviewBundle?.sections?.[key];
      if (!isCompleteReflectSection(before) || !isCompleteReflectSection(after)) return unknown(productionRevision, previewRevision, `${reflectSectionLabel(key)}を取得できません`);
      if (comparable(before) !== comparable(after)) sectionKeys.push(key);
    }
    const message = sectionKeys.length
      ? `反映先プレビューには未公開の変更があります（${sectionKeys.map(reflectSectionLabel).join('、')}）。公開すると今回の反映と一緒に本番へ反映されます。`
      : `選択した項目には未公開の変更はありませんが、ほかの設定に未公開の変更がある可能性があります（本番 revision ${productionRevision} / プレビュー revision ${previewRevision}）。`;
    return { state: 'pending', productionRevision, previewRevision, sectionKeys, message };
  } catch (error: any) { return unknown(productionRevision, previewRevision, error?.message || String(error)); }
}
