import { SECTION_DEFS } from '../constants.js';
import { stableStringify } from '../utils.js';

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
  return stableStringify({
    sourceAppId: String(opts.sourceAppId || '').trim(),
    sourceGuestId: String(opts.sourceGuestId || '').trim(),
    sourcePreview: !!opts.sourcePreview,
    sourceMode: opts.sourceBundle ? 'json' : 'api',
    targetAppId: String(opts.targetAppId || '').trim(),
    targetGuestId: String(opts.targetGuestId || '').trim(),
    lookupMap: opts.lookupMap || {}
  });
}

export function isCompleteReflectSection(section: any): boolean {
  return !!section && typeof section === 'object' && !Array.isArray(section)
    && !section._fetchError && !section._partial;
}

function captureSections(bundle: any, scopes: string[]): Record<string, SectionBaseline> {
  return Object.fromEntries(scopes.map((key) => {
    const section = bundle?.sections?.[key];
    return [key, {
      content: stableStringify(section) ?? '',
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
  const labels = incomplete.map((key) => SECTION_DEFS.find((def) => def.key === key)?.label || key);
  throw new Error(`バックアップを完全に取得できなかったため反映を中止しました。対象: ${labels.join('、')}。差分を取得し直してから再実行してください。`);
}

/** 確認済みの全対象を、書き込みを始める前に照合する。対象を絞ることは許可する。 */
export function assertReflectBaselineMatches(
  baseline: ReflectBaseline | undefined, opts: any, source: any, target: any
): string {
  if (!baseline || baseline.connection !== connectionKey(opts)) {
    throw new Error('確認済みの差分と反映条件が一致しません。差分を取得し直してから再実行してください。');
  }
  const current = captureReflectBaseline(opts, source, target);
  for (const side of ['source', 'target'] as const) {
    const label = side === 'source' ? '比較元' : '比較先プレビュー';
    const revisions = new Set<string>();
    const requireRevision = side === 'target' || !opts.sourceBundle;
    for (const key of opts.scopes as string[]) {
      const before = baseline[side]?.[key];
      const after = current[side][key];
      const sectionLabel = SECTION_DEFS.find((def) => def.key === key)?.label || key;
      if (!before?.complete || !after.complete) {
        throw new Error(`${label}の${sectionLabel}を完全に確認できないため反映を中止しました。差分を取得し直してください。`);
      }
      if (requireRevision && (!/^\d+$/.test(before.revision) || !/^\d+$/.test(after.revision))) {
        throw new Error(`${label}の${sectionLabel}のrevisionを確認できないため反映を中止しました。差分を取得し直してください。`);
      }
      if (before.content !== after.content || before.revision !== after.revision) {
        throw new Error(`差分確認後に${label}の${sectionLabel}が変更されたため反映を中止しました。差分を取得し直して、変更内容を再確認してください。`);
      }
      if (requireRevision) revisions.add(after.revision);
    }
    // アプリ設定のrevisionはセクション共通。取得途中の更新で時点が混ざった結果も拒否する。
    if (requireRevision && revisions.size !== 1) {
      throw new Error(`${label}の取得中に設定が更新された可能性があるため反映を中止しました。差分を取得し直してください。`);
    }
  }
  return current.target[opts.scopes[0]].revision;
}
