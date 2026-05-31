'use strict';

// プレビュー反映タブ「反映履歴」の集計・表示ロジックを DOM 非依存の純粋関数として切り出す。
// components.ts の描画と handlers.ts の「再反映準備」から共有し、単体テストの対象にしている。

export interface ApplyHistoryEntry {
  id?: string;
  at?: number;
  mode?: string;
  appId?: string;
  scopes?: string[];
  okCount?: number;
  ngCount?: number;
  skipCount?: number;
  failedSectionKeys?: string[];
  hadError?: boolean;
}

// commitApplyReport が記録する mode 値に対応する表示ラベル。
export const APPLY_HISTORY_MODE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  section: 'まとめ反映',
  nodes: '差分選択',
  patch: 'JSONパッチ',
  retry: '再反映',
  restore: '復元'
});

export function formatApplyHistoryModeLabel(mode: string | undefined | null): string {
  if (!mode) return '反映';
  return APPLY_HISTORY_MODE_LABELS[mode] || mode;
}

export interface ApplyHistorySummary {
  count: number;
  totalOk: number;
  totalNg: number;
  totalSkip: number;
  /** ngCount > 0 もしくは hadError のエントリ件数 */
  errorEntryCount: number;
  /** 最新の反映時刻（epoch ミリ秒）。履歴が空なら null。 */
  lastAppliedAt: number | null;
}

function safeCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * 反映履歴の累計を集計する。件数の合計と、エラーを含むエントリ数、最新反映時刻を返す。
 * UI ヘッダーに「累計 OK/NG」「成功率」を出して、セッション全体の傾向を一目で掴めるようにする。
 */
export function summarizeApplyHistory(entries: ApplyHistoryEntry[] | null | undefined): ApplyHistorySummary {
  const list = Array.isArray(entries) ? entries : [];
  let totalOk = 0;
  let totalNg = 0;
  let totalSkip = 0;
  let errorEntryCount = 0;
  let lastAppliedAt: number | null = null;
  let count = 0;
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    count += 1;
    totalOk += safeCount(entry.okCount);
    totalNg += safeCount(entry.ngCount);
    totalSkip += safeCount(entry.skipCount);
    const hadError = !!entry.hadError || safeCount(entry.ngCount) > 0;
    if (hadError) errorEntryCount += 1;
    const at = Number(entry.at);
    if (Number.isFinite(at) && (lastAppliedAt === null || at > lastAppliedAt)) {
      lastAppliedAt = at;
    }
  }
  return { count, totalOk, totalNg, totalSkip, errorEntryCount, lastAppliedAt };
}

export interface ReplayScopeResolution {
  /** 現在の選択可能スコープに存在し、復元できるキー */
  applicable: string[];
  /** 履歴には含まれるが、現在は選択肢に無いキー（put 非対応・定義変更など） */
  unavailable: string[];
}

/**
 * 履歴エントリのスコープのうち、現在の反映スコープ（put 対応セクション）に存在するキーだけを採用する。
 * 重複は除去し、入力順を保つ。過去の反映構成をワンクリックで再現する「再反映準備」で使う。
 */
export function resolveReplayScopeKeys(
  entryScopes: string[] | null | undefined,
  availableScopeKeys: Iterable<string> | null | undefined
): ReplayScopeResolution {
  const available = new Set<string>();
  if (availableScopeKeys) {
    for (const key of availableScopeKeys) {
      if (key) available.add(String(key));
    }
  }
  const seen = new Set<string>();
  const applicable: string[] = [];
  const unavailable: string[] = [];
  for (const raw of Array.isArray(entryScopes) ? entryScopes : []) {
    const key = String(raw == null ? '' : raw).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (available.has(key)) applicable.push(key);
    else unavailable.push(key);
  }
  return { applicable, unavailable };
}
