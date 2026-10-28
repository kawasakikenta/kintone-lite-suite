import { reflectSectionLabel } from './sections.js';

/** Reflection must preserve user-defined names, including revision / __proto__. */
export function stableReflectStringify(value: any): string {
  const sort = (input: any): any => Array.isArray(input) ? input.map(sort) : input && typeof input === 'object'
    ? Object.fromEntries(Object.keys(input).sort().map(key => [key, sort(input[key])])) : input;
  return JSON.stringify(sort(value));
}

interface SectionBaseline {
  content: string;
  revision: string;
  complete: boolean;
}

export interface ReflectBaseline {
  connection: string;
  source: Record<string, SectionBaseline>;
  target: Record<string, SectionBaseline>;
}

function connectionKey(opts: any): string {
  return stableReflectStringify({
    sourceAppId: String(opts.sourceAppId || '').trim(),
    sourceGuestId: String(opts.sourceGuestId || '').trim(),
    sourcePreview: !!opts.sourcePreview,
    sourceMode: opts.sourceBundle ? 'json' : 'api',
    targetAppId: String(opts.targetAppId || '').trim(),
    targetGuestId: String(opts.targetGuestId || '').trim(),
    lookupMap: opts.lookupMap || {},
    preserveTargetOnly: opts.preserveTargetOnly !== false
  });
}

export function isCompleteReflectSection(section: any): boolean {
  return !!section && typeof section === 'object' && !Array.isArray(section)
    && !section._fetchError && !section._partial;
}

/** 内容の比較からは、アプリ単位で変わる revision を除く（revision は別に比べ、内容の変更と区別して示す）。 */
const withoutTopLevelRevision = (section: any) => {
  if (!section || typeof section !== 'object' || Array.isArray(section) || !Object.prototype.hasOwnProperty.call(section, 'revision')) return section;
  const { revision: _revision, ...rest } = section;
  return rest;
};

function captureSections(bundle: any, scopes: string[]): Record<string, SectionBaseline> {
  return Object.fromEntries(scopes.map((key) => {
    const section = bundle?.sections?.[key];
    return [key, {
      content: stableReflectStringify(withoutTopLevelRevision(section)) ?? '',
      revision: String(bundle?.meta?.sectionRevisions?.[key] ?? section?.revision ?? ''),
      complete: isCompleteReflectSection(section)
    }];
  }));
}

/** 確認画面の取得値を文字列で固定し、再取得結果や入力JSONの変更から切り離す。 */
export function captureReflectBaseline(opts: any, source: any, target: any): ReflectBaseline {
  return {
    connection: connectionKey(opts),
    source: captureSections(source, opts.scopes),
    target: captureSections(target, opts.scopes)
  };
}

export function assertCompleteReflectBackup(bundle: any, scopes: string[]): void {
  const incomplete = scopes.filter((key) => !isCompleteReflectSection(bundle?.sections?.[key]));
  if (!incomplete.length) return;
  const labels = incomplete.map(reflectSectionLabel);
  throw new Error(`バックアップを完全に取得できなかったため反映を中止しました。対象: ${labels.join('、')}。差分を取得し直してから再実行してください。`);
}

/** 確認済みの全対象を、書き込みを始める前に照合する。対象を絞ることは許可する。 */
export function assertReflectBaselineMatches(
  baseline: ReflectBaseline | undefined, opts: any, source: any, target: any
): string {
  if (!baseline || baseline.connection !== connectionKey(opts)) {
    throw new Error('確認済みの差分と反映条件が一致しません。差分を取得し直してから再実行してください。');
  }
  const current = captureReflectBaseline({ ...opts, scopes: [...new Set([...opts.scopes, ...(opts.targetDependencies || [])])] }, source, target);
  for (const side of ['source', 'target'] as const) {
    const label = side === 'source' ? '反映元' : '反映先プレビュー';
    const revisions = new Set<string>();
    const requireRevision = side === 'target' || !opts.sourceBundle;
    const checkedScopes: string[] = side === 'source' ? opts.scopes : [...new Set<string>([...opts.scopes, ...(opts.targetDependencies || [])])];
    // revision はアプリ単位のため、別の設定が更新されただけでも全項目で変わる。内容が実際に変わった項目だけを名前で示す。
    const changedLabels: string[] = [];
    let revisionChange: { from: string; to: string } | null = null;
    for (const key of checkedScopes) {
      const before = baseline[side]?.[key];
      const after = current[side][key];
      const sectionLabel = reflectSectionLabel(key);
      if (!before?.complete || !after.complete) {
        throw new Error(`${label}の${sectionLabel}を完全に確認できないため反映を中止しました。差分を取得し直してください。`);
      }
      if (requireRevision && (!/^\d+$/.test(before.revision) || !/^\d+$/.test(after.revision))) {
        throw new Error(`${label}の${sectionLabel}のrevisionを確認できないため反映を中止しました。差分を取得し直してください。`);
      }
      if (before.content !== after.content) changedLabels.push(sectionLabel);
      else if (before.revision !== after.revision && !revisionChange) revisionChange = { from: before.revision, to: after.revision };
      if (requireRevision) revisions.add(after.revision);
    }
    if (changedLabels.length) {
      throw new Error(`差分確認後に${label}の${changedLabels.join('、')}が変更されたため反映を中止しました。差分を取得し直して、変更内容を再確認してください。`);
    }
    if (revisionChange) {
      const { from, to } = revisionChange as { from: string; to: string };
      throw new Error(`${side === 'source' ? '反映元' : '反映先'}アプリの設定が確認後に更新されました（revision ${from || '不明'} → ${to || '不明'}）。選択した項目の内容は同じでしたが、安全のため反映を中止しました。差分を取得し直してください。`);
    }
    // アプリ設定のrevisionはセクション共通。取得途中の更新で時点が混ざった結果も拒否する。
    if (requireRevision && revisions.size !== 1) {
      throw new Error(`${label}の取得中に設定が更新された可能性があるため反映を中止しました。差分を取得し直してください。`);
    }
  }
  return current.target[opts.scopes[0]].revision;
}

const SYSTEM_REF_FIELDS = new Set(['$id', '$revision']);

export interface UnmappedActionDestApp {
  actionName: string;
  destAppId: string;
}

/** アプリアクションのコピー先アプリIDで参照先変換に未指定のものを検出する。 */
export function findUnmappedActionDestApps(
  sourceActions: Record<string, any> | undefined,
  lookupMap?: Record<string, string>,
  targetActions?: Record<string, any>
): UnmappedActionDestApp[] {
  if (!sourceActions || typeof sourceActions !== 'object') return [];
  const map = lookupMap || {};
  const unmapped: UnmappedActionDestApp[] = [];
  for (const [actionName, action] of Object.entries(sourceActions)) {
    const rawApp = action?.destApp?.app;
    if (rawApp == null) continue;
    const destAppId = String(rawApp).trim();
    if (!destAppId || map[destAppId]) continue;
    const targetAppId = String(targetActions?.[actionName]?.destApp?.app ?? '').trim();
    if (targetAppId && targetAppId === destAppId) continue;
    unmapped.push({ actionName, destAppId });
  }
  return unmapped;
}

/** アプリアクションのフィールドマッピングから反映先に存在が必要なコピー元フィールドコードを抽出する。 */
export function extractActionRequiredFields(actions: Record<string, any> | undefined): string[] {
  if (!actions || typeof actions !== 'object') return [];
  const codes: string[] = [];
  for (const action of Object.values(actions)) {
    if (!Array.isArray(action?.mappings)) continue;
    for (const mapping of action.mappings) {
      if (mapping?.srcType === 'FIELD' && typeof mapping.srcField === 'string' && mapping.srcField.trim()) {
        const code = mapping.srcField.trim();
        if (!SYSTEM_REF_FIELDS.has(code)) codes.push(code);
      }
    }
  }
  return [...new Set(codes)];
}

/** グラフ設定の分類項目・集計対象から反映先に存在が必要なフィールドコードを抽出する。 */
export function extractReportRequiredFields(reports: Record<string, any> | undefined): string[] {
  if (!reports || typeof reports !== 'object') return [];
  const codes: string[] = [];
  for (const report of Object.values(reports)) {
    if (Array.isArray(report?.groups)) {
      for (const group of report.groups) {
        if (typeof group?.code === 'string' && group.code.trim()) {
          const code = group.code.trim();
          if (!SYSTEM_REF_FIELDS.has(code)) codes.push(code);
        }
      }
    }
    if (Array.isArray(report?.aggregations)) {
      for (const agg of report.aggregations) {
        if (agg?.type !== 'COUNT' && typeof agg?.code === 'string' && agg.code.trim()) {
          const code = agg.code.trim();
          if (!SYSTEM_REF_FIELDS.has(code)) codes.push(code);
        }
      }
    }
  }
  return [...new Set(codes)];
}

