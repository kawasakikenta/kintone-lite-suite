'use strict';

export interface ErDependencyAnalysis {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  appCount: number;
  edgeCount: number;
  isolatedAppIds: string[];
  unresolvedTargets: Array<{ fromAppId: string; fromAppName: string; toAppId: string; kind: string; field: string }>;
  cycles: Array<{ appIds: string[]; appNames: string[] }>;
  hubs: Array<{ appId: string; name: string; incoming: number; outgoing: number; total: number }>;
  appStats: Array<{ appId: string; name: string; incoming: number; outgoing: number; total: number; isolated: boolean; inCycle: boolean }>;
  failedAppIds: string[];
}

const idOf = (value: unknown): string => String(value ?? '').trim();

/**
 * ER 図に読み込まれたアプリ集合だけを対象に、設計レビュー向けの依存関係指標を算出する。
 * 同じ関連が重複して含まれていても、起点・宛先・種類・項目が同じなら 1 本として扱う。
 */
export function analyzeErDependencies(rawApps: any[]): ErDependencyAnalysis {
  const apps = (Array.isArray(rawApps) ? rawApps : []).filter((app) => idOf(app?.id));
  const appById = new Map(apps.map((app) => [idOf(app.id), app]));
  const adjacency = new Map<string, Set<string>>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const seenEdges = new Set<string>();
  const unresolvedTargets: ErDependencyAnalysis['unresolvedTargets'] = [];

  for (const id of appById.keys()) adjacency.set(id, new Set());

  for (const app of apps) {
    const fromId = idOf(app.id);
    for (const relation of Array.isArray(app?.relations) ? app.relations : []) {
      const toId = idOf(relation?.toApp);
      if (!toId) continue;
      const kind = idOf(relation?.kind) || 'UNKNOWN';
      const field = idOf(relation?.fromPath || relation?.from || relation?.fromLabel);
      const edgeKey = `${fromId}\u0000${toId}\u0000${kind}\u0000${field}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);

      outgoing.set(fromId, (outgoing.get(fromId) || 0) + 1);
      if (appById.has(toId)) {
        incoming.set(toId, (incoming.get(toId) || 0) + 1);
        adjacency.get(fromId)?.add(toId);
      } else {
        unresolvedTargets.push({
          fromAppId: fromId,
          fromAppName: String(app?.name || `アプリ ${fromId}`),
          toAppId: toId,
          kind,
          field
        });
      }
    }
  }

  // Tarjan の強連結成分。2 ノード以上、または自己参照を循環依存として扱う。
  let nextIndex = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  const visit = (id: string) => {
    indexes.set(id, nextIndex);
    lowLinks.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);
    for (const next of adjacency.get(id) || []) {
      if (!indexes.has(next)) {
        visit(next);
        lowLinks.set(id, Math.min(lowLinks.get(id)!, lowLinks.get(next)!));
      } else if (onStack.has(next)) {
        lowLinks.set(id, Math.min(lowLinks.get(id)!, indexes.get(next)!));
      }
    }
    if (lowLinks.get(id) !== indexes.get(id)) return;
    const component: string[] = [];
    let current = '';
    do {
      current = stack.pop()!;
      onStack.delete(current);
      component.push(current);
    } while (current !== id);
    components.push(component);
  };
  for (const id of appById.keys()) if (!indexes.has(id)) visit(id);

  const cycles = components
    .filter((ids) => ids.length > 1 || adjacency.get(ids[0])?.has(ids[0]))
    .map((ids) => ({
      appIds: ids.slice().sort((a, b) => Number(a) - Number(b)),
      appNames: ids.map((id) => String(appById.get(id)?.name || `アプリ ${id}`)).sort()
    }))
    .sort((a, b) => b.appIds.length - a.appIds.length);
  const cycleIds = new Set(cycles.flatMap((cycle) => cycle.appIds));

  const appStats = apps.map((app) => {
    const appId = idOf(app.id);
    const inCount = incoming.get(appId) || 0;
    const outCount = outgoing.get(appId) || 0;
    return {
      appId,
      name: String(app?.name || `アプリ ${appId}`),
      incoming: inCount,
      outgoing: outCount,
      total: inCount + outCount,
      isolated: inCount === 0 && outCount === 0,
      inCycle: cycleIds.has(appId)
    };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja'));

  const isolatedAppIds = appStats.filter((stat) => stat.isolated).map((stat) => stat.appId);
  const averageDegree = apps.length ? seenEdges.size / apps.length : 0;
  const hubThreshold = Math.max(3, Math.ceil(averageDegree * 2));
  const hubs = appStats.filter((stat) => stat.total >= hubThreshold).slice(0, 8);
  const failedAppIds = apps.filter((app) => app?.ok === false).map((app) => idOf(app.id));

  const isolatedPenalty = apps.length ? Math.min(20, Math.round((isolatedAppIds.length / apps.length) * 20)) : 0;
  const score = Math.max(0, 100
    - Math.min(30, failedAppIds.length * 15)
    - Math.min(20, unresolvedTargets.length * 4)
    - Math.min(24, cycles.length * 8)
    - isolatedPenalty);
  const grade: ErDependencyAnalysis['grade'] = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

  return {
    score,
    grade,
    appCount: apps.length,
    edgeCount: seenEdges.size,
    isolatedAppIds,
    unresolvedTargets,
    cycles,
    hubs,
    appStats,
    failedAppIds
  };
}
