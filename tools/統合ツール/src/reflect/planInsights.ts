'use strict';

// ---------------------------------------------------------------------------
// プラン内容から「人が判断に使う」洞察を取り出す純粋ロジック。
// DOM・state に依存しないため、plan.ts / apply.ts の確認 UI と
// ユニットテストの両方から利用できる。
// ---------------------------------------------------------------------------

export interface PlanDeleteSectionSummary {
  sectionKey: string;
  sectionLabel: string;
  count: number;
}

export interface PlanDeleteSummary {
  total: number;
  sections: PlanDeleteSectionSummary[];
}

/**
 * DELETE リクエスト 1 件が消す対象数を body から推定する。
 * 例: { app, fields: ['a','b'] } → 2。配列が見つからなければ 1 リクエスト = 1 件扱い。
 */
function countDeleteTargets(body: any): number {
  if (!body || typeof body !== 'object') return 1;
  for (const [key, value] of Object.entries(body)) {
    if (key === 'app') continue;
    if (Array.isArray(value)) return value.length;
  }
  return 1;
}

/**
 * 予定リクエストから削除対象をセクション別に集計する。
 * 除外指定されたセクションはカウントしない（実際に送信される分だけを示す）。
 */
export function summarizePlanDeletes(plannedRequests: any[], excludedSectionKeys: string[] = []): PlanDeleteSummary {
  const excluded = new Set((excludedSectionKeys || []).map((k) => String(k)));
  const bySection = new Map<string, PlanDeleteSectionSummary>();
  for (const req of Array.isArray(plannedRequests) ? plannedRequests : []) {
    if (String(req?.method || '').toUpperCase() !== 'DELETE') continue;
    const sectionKey = String(req?.sectionKey || '');
    if (excluded.has(sectionKey)) continue;
    const sectionLabel = String(req?.sectionLabel || sectionKey || '-');
    const slot = bySection.get(sectionKey) || { sectionKey, sectionLabel, count: 0 };
    slot.count += countDeleteTargets(req?.body);
    bySection.set(sectionKey, slot);
  }
  const sections = [...bySection.values()].sort((a, b) => b.count - a.count);
  return { total: sections.reduce((sum, s) => sum + s.count, 0), sections };
}

export interface ApplyRiskInput {
  /** 比較元と比較先が同一接続（同一 appId / guestId）か */
  sameConnection: boolean;
  diffSummary: { total: number; high: number; medium: number; low: number };
  requestCount: number;
  /** プランに含まれる削除対象数（summarizePlanDeletes().total） */
  deleteCount?: number;
  diffThreshold: number;
  requestThreshold: number;
}

export interface ApplyRiskAssessment {
  /** ユーザーに見せる注意点（空なら低リスク） */
  issues: string[];
  /** 高リスク: アプリID の入力確認を要求すべき状態 */
  highRisk: boolean;
  /** キーワード/ID 入力を要求するか。false なら確認チェックのみで実行できる */
  requireKeyword: boolean;
}

/**
 * 反映実行前のリスク評価。確認 UI の「重さ」をリスクに比例させるための判定を返す。
 * - 注意点なし: チェックボックス確認のみ（誤操作防止は保ちつつ、毎回のタイピングをなくす）
 * - 注意点あり: キーワード入力
 * - 高リスク（同一接続 / 高重要度差分あり）: 比較先アプリIDの入力
 */
export function assessApplyRisk(input: ApplyRiskInput): ApplyRiskAssessment {
  const diffSummary = input.diffSummary || { total: 0, high: 0, medium: 0, low: 0 };
  const requestCount = Number(input.requestCount || 0);
  const deleteCount = Number(input.deleteCount || 0);
  const issues: string[] = [];
  if (input.sameConnection) {
    issues.push('比較元と比較先が同一接続です（同一 appId / guestId）');
  }
  if (diffSummary.total >= input.diffThreshold) {
    issues.push(`差分件数がしきい値以上です（${diffSummary.total}件 / しきい値 ${input.diffThreshold}件）`);
  }
  if (diffSummary.high > 0) {
    issues.push(`高重要度の差分を含みます（高 ${diffSummary.high}件）`);
  }
  if (requestCount >= input.requestThreshold) {
    issues.push(`APIリクエスト予定数が多いです（${requestCount}件 / しきい値 ${input.requestThreshold}件）`);
  }
  if (deleteCount > 0) {
    issues.push(`削除リクエストを含みます（削除対象 ${deleteCount}件）`);
  }
  const highRisk = input.sameConnection || diffSummary.high > 0;
  return {
    issues,
    highRisk,
    requireKeyword: highRisk || issues.length > 0
  };
}
