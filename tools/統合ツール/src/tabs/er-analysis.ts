'use strict';

export type ErRetrievalStatus = 'complete' | 'partial' | 'failed';

export interface ErDependencyAnalysis {
  appCount: number;
  edgeCount: number;
  isolatedAppIds: string[];
  unresolvedTargets: Array<{
    fromAppId: string;
    fromAppName: string;
    toAppId: string;
    kind: string;
    field: string;
    reason: 'missing-target' | 'outside-diagram';
  }>;
  cycles: Array<{ appIds: string[]; appNames: string[] }>;
  selfReferences: Array<{ appId: string; appName: string; kind: string; field: string }>;
  hubs: Array<{ appId: string; name: string; incoming: number; outgoing: number; total: number }>;
  highConnectionThreshold: number;
  appStats: Array<{
    appId: string;
    name: string;
    incoming: number;
    outgoing: number;
    total: number;
    isolated: boolean;
    inCycle: boolean;
    hasSelfReference: boolean;
    retrievalStatus: ErRetrievalStatus;
  }>;
  completeAppIds: string[];
  partialAppIds: string[];
  failedAppIds: string[];
  counts: {
    apps: number;
    relations: number;
    resolvedRelations: number;
    unresolvedRelations: number;
    cycleCandidates: number;
    selfReferences: number;
    appsWithNoRelations: number;
    highConnectionApps: number;
    retrievalComplete: number;
    retrievalPartial: number;
    retrievalFailed: number;
  };
}

/** 「接続数が多い」の判定規則。入出力の関連を合計してこの件数以上を一覧化する。 */
export const ER_HIGH_CONNECTION_THRESHOLD = 3;

const idOf = (value: unknown): string => String(value ?? '').trim();

const appNameOf = (app: any, appId: string): string => String(app?.name || `アプリ ${appId}`);

const retrievalStatusOf = (app: any): ErRetrievalStatus => {
  const declared = idOf(app?.status).toLowerCase();
  if (app?.ok === false || declared === 'failed') return 'failed';
  if (declared === 'partial' || (Array.isArray(app?.issues) && app.issues.length > 0) || app?._fetchError) {
    return 'partial';
  }
  return 'complete';
};

const compareIds = (a: string, b: string): number => a.localeCompare(b, 'ja', { numeric: true });

/**
 * ER 図に取り込まれたアプリと関連から、事実ベースの確認項目を集計する。
 * 同じ起点・参照先・種別・フィールドの関連は 1 件として扱う。
 */
export function analyzeErDependencies(rawApps: any[]): ErDependencyAnalysis {
  const apps = (Array.isArray(rawApps) ? rawApps : []).filter((app) => idOf(app?.id));
  const appById = new Map(apps.map((app) => [idOf(app.id), app]));
  const adjacency = new Map<string, Set<string>>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const seenEdges = new Set<string>();
  const unresolvedTargets: ErDependencyAnalysis['unresolvedTargets'] = [];
  const selfReferences: ErDependencyAnalysis['selfReferences'] = [];
  let resolvedRelationCount = 0;

  for (const id of appById.keys()) adjacency.set(id, new Set());

  for (const app of apps) {
    const fromId = idOf(app.id);
    for (const relation of Array.isArray(app?.relations) ? app.relations : []) {
      if (!relation || typeof relation !== 'object') continue;
      const toId = idOf(relation.toApp);
      const kind = idOf(relation.kind) || 'UNKNOWN';
      const field = idOf(
        relation.fromPath
        || relation.from
        || relation.fromLabel
        || relation.controlField
        || relation.sourceJoinField
      );
      if (!toId && kind === 'UNKNOWN' && !field) continue;

      const edgeKey = `${fromId}\u0000${toId}\u0000${kind}\u0000${field}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);
      outgoing.set(fromId, (outgoing.get(fromId) || 0) + 1);

      if (!toId || !appById.has(toId)) {
        unresolvedTargets.push({
          fromAppId: fromId,
          fromAppName: appNameOf(app, fromId),
          toAppId: toId,
          kind,
          field,
          reason: toId ? 'outside-diagram' : 'missing-target'
        });
        continue;
      }

      resolvedRelationCount += 1;
      incoming.set(toId, (incoming.get(toId) || 0) + 1);
      adjacency.get(fromId)?.add(toId);
      if (fromId === toId) {
        selfReferences.push({
          appId: fromId,
          appName: appNameOf(app, fromId),
          kind,
          field
        });
      }
    }
  }

  // Tarjan の強連結成分。自己参照は selfReferences に分け、複数アプリの循環候補だけを返す。
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
    .filter((ids) => ids.length > 1)
    .map((ids) => {
      const appIds = ids.slice().sort(compareIds);
      return {
        appIds,
        appNames: appIds.map((id) => appNameOf(appById.get(id), id))
      };
    })
    .sort((a, b) => b.appIds.length - a.appIds.length || compareIds(a.appIds[0], b.appIds[0]));
  const cycleIds = new Set(cycles.flatMap((cycle) => cycle.appIds));
  const selfReferenceIds = new Set(selfReferences.map((relation) => relation.appId));

  const appStats = apps.map((app) => {
    const appId = idOf(app.id);
    const inCount = incoming.get(appId) || 0;
    const outCount = outgoing.get(appId) || 0;
    return {
      appId,
      name: appNameOf(app, appId),
      incoming: inCount,
      outgoing: outCount,
      total: inCount + outCount,
      isolated: inCount === 0 && outCount === 0,
      inCycle: cycleIds.has(appId),
      hasSelfReference: selfReferenceIds.has(appId),
      retrievalStatus: retrievalStatusOf(app)
    };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja'));

  const isolatedAppIds = appStats.filter((stat) => stat.isolated).map((stat) => stat.appId);
  const hubs = appStats
    .filter((stat) => stat.total >= ER_HIGH_CONNECTION_THRESHOLD)
    .map(({ appId, name, incoming: inCount, outgoing: outCount, total }) => ({
      appId,
      name,
      incoming: inCount,
      outgoing: outCount,
      total
    }));
  const completeAppIds = appStats
    .filter((stat) => stat.retrievalStatus === 'complete')
    .map((stat) => stat.appId);
  const partialAppIds = appStats
    .filter((stat) => stat.retrievalStatus === 'partial')
    .map((stat) => stat.appId);
  const failedAppIds = appStats
    .filter((stat) => stat.retrievalStatus === 'failed')
    .map((stat) => stat.appId);

  return {
    appCount: apps.length,
    edgeCount: seenEdges.size,
    isolatedAppIds,
    unresolvedTargets,
    cycles,
    selfReferences,
    hubs,
    highConnectionThreshold: ER_HIGH_CONNECTION_THRESHOLD,
    appStats,
    completeAppIds,
    partialAppIds,
    failedAppIds,
    counts: {
      apps: apps.length,
      relations: seenEdges.size,
      resolvedRelations: resolvedRelationCount,
      unresolvedRelations: unresolvedTargets.length,
      cycleCandidates: cycles.length,
      selfReferences: selfReferences.length,
      appsWithNoRelations: isolatedAppIds.length,
      highConnectionApps: hubs.length,
      retrievalComplete: completeAppIds.length,
      retrievalPartial: partialAppIds.length,
      retrievalFailed: failedAppIds.length
    }
  };
}
