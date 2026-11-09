import { vi } from 'vitest';
import { SECTION_DEFS } from '../../src/constants';

/**
 * 本番反映のテスト用に kintone.api を合成するモック。
 * アプリごとに本番・プレビューの設定と revision を持ち、deploy.json の依頼と状態確認を再現する。
 */
export interface FakeApp {
  name: string;
  production: Record<string, any>;
  preview: Record<string, any>;
  prodRevision: string;
  previewRevision: string;
}

export interface FakeCall { url: string; method: string; params: any }

export interface FakeOptions {
  /** 状態確認を何回呼ぶと完了するか（既定 2。PROCESSING を 1 回返してから完了） */
  pollsToFinish?: number;
  /** この ID のアプリは FAIL にする */
  failApps?: string[];
  /** deploy.json の POST を拒否する（例外を投げる） */
  postError?: any;
  /** 状態確認の GET を拒否する */
  statusError?: any;
  /** 完了せず PROCESSING のままにする */
  neverFinish?: boolean;
  /** GET の前に呼ばれる（途中で設定を更新する再現に使う） */
  onGet?: (call: FakeCall, apps: Record<string, FakeApp>) => void;
  /** deploy.json の POST の後に呼ばれる */
  onPost?: (call: FakeCall, apps: Record<string, FakeApp>) => void;
  /** プレビューの設定の書き込み（PUT / POST）を受け付ける直前に呼ばれる（途中で別の更新が入る再現に使う）。例外を投げると書き込みを拒否する */
  onWrite?: (call: FakeCall, apps: Record<string, FakeApp>) => void;
}

interface Deployment { ids: string[]; revert: boolean; polls: number; done: boolean; result: Record<string, string> }

const endpointToKey = new Map(SECTION_DEFS.map(def => [def.endpoint, def.key]));
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function makeApp(overrides: Partial<FakeApp> = {}): FakeApp {
  return { name: 'テスト', production: {}, preview: {}, prodRevision: '10', previewRevision: '10', ...overrides };
}

export function field(code: string, label = code, type = 'SINGLE_LINE_TEXT') {
  return { type, code, label, required: false };
}

/** プレビューの設定の書き込み（フィールド・一般設定・プラグインなど）を、保存している設定へ反映する。 */
function writeSection(app: FakeApp, key: string, method: string, body: any) {
  const { app: _app, revision: _revision, ...rest } = body;
  const section = app.preview[key] ?? (app.preview[key] = {});
  if (key === 'fieldSettings') {
    section.properties = section.properties ?? {};
    for (const [code, definition] of Object.entries<any>(rest.properties || {})) {
      const current = section.properties[code];
      if (method === 'POST') {
        if (current && definition.type === 'SUBTABLE') current.fields = { ...current.fields, ...copy(definition.fields) };
        else section.properties[code] = copy(definition);
      } else section.properties[code] = definition.type === 'SUBTABLE' && current
        ? { ...current, ...copy(definition), fields: { ...current.fields, ...copy(definition.fields) } } : { ...(current || {}), ...copy(definition) };
    }
  } else if (key === 'pluginSettings') section.plugins = [...(section.plugins || []), ...(rest.ids || rest.pluginIds || []).map((id: string) => ({ id }))];
  else app.preview[key] = { ...section, ...copy(rest) };
}

export function createFakeKintone(apps: Record<string, FakeApp>, options: FakeOptions = {}) {
  const calls: FakeCall[] = [];
  const deployments: Deployment[] = [];
  const requests: Array<{ url: string; body: any }> = [];

  const finish = (deployment: Deployment) => {
    deployment.done = true;
    const failed = deployment.ids.some(id => (options.failApps || []).includes(id));
    for (const id of deployment.ids) {
      const app = apps[id];
      if (failed) {
        deployment.result[id] = (options.failApps || []).includes(id) ? 'FAIL' : 'CANCEL';
        continue;
      }
      deployment.result[id] = 'SUCCESS';
      if (deployment.revert) { app.preview = copy(app.production); app.previewRevision = app.prodRevision; }
      else { app.production = copy(app.preview); app.prodRevision = app.previewRevision; }
    }
  };

  const api = vi.fn(async (url: string, method: string, params: any) => {
    const call: FakeCall = { url, method, params };
    calls.push(call);
    const match = url.match(/^\/k(?:\/guest\/(\d+))?\/v1(\/preview)?(\/.*)$/);
    if (!match) throw new Error(`Unexpected URL: ${url}`);
    const [, , isPreview, path] = match;
    if (method === 'GET') {
      options.onGet?.(call, apps);
      if (path === '/app/deploy.json') {
        if (!isPreview) throw new Error('deploy.json GET は preview prefix のみ');
        if (options.statusError) throw options.statusError;
        const touched = new Set<Deployment>();
        const rows = (params.apps as string[]).map((id) => {
          const deployment = [...deployments].reverse().find(item => item.ids.includes(id));
          if (!deployment) return { app: id, status: 'SUCCESS' };
          touched.add(deployment);
          return { app: id, deployment };
        });
        for (const deployment of touched) {
          if (deployment.done || options.neverFinish) continue;
          deployment.polls -= 1;
          if (deployment.polls <= 0) finish(deployment);
        }
        return { apps: rows.map(row => 'deployment' in row ? { app: row.app, status: row.deployment.done ? row.deployment.result[row.app] : 'PROCESSING' } : row) };
      }
      const appId = String(params?.app ?? params?.id ?? '');
      const app = apps[appId];
      if (!app) throw Object.assign(new Error('指定したアプリ（ID: ' + appId + '）が見つかりません。'), { code: 'GAIA_AP01' });
      const side = isPreview ? app.preview : app.production;
      const revision = isPreview ? app.previewRevision : app.prodRevision;
      if (path === '/app/settings.json') return { name: app.name, ...copy(side.appSettings ?? {}), revision };
      const key = endpointToKey.get(path);
      if (!key) throw new Error(`Unexpected endpoint: ${url}`);
      return { ...copy(side[key] ?? {}), revision };
    }
    if (method === 'POST' && isPreview && path === '/app/deploy.json') {
      requests.push({ url, body: params });
      for (const row of params.apps) {
        const app = apps[row.app];
        if (row.revision !== undefined && row.revision !== app.previewRevision) {
          throw Object.assign(new Error('リビジョンが最新ではありません。'), { code: 'GAIA_CO02' });
        }
      }
      if (options.postError) throw options.postError;
      options.onPost?.(call, apps);
      deployments.push({ ids: params.apps.map((row: any) => row.app), revert: !!params.revert, polls: options.pollsToFinish ?? 2, done: false, result: {} });
      return {};
    }
    if ((method === 'PUT' || method === 'POST') && isPreview && endpointToKey.has(path)) {
      const app = apps[String(params?.app)];
      if (!app) throw Object.assign(new Error('指定したアプリが見つかりません。'), { code: 'GAIA_AP01' });
      options.onWrite?.(call, apps);
      if (params.revision !== undefined && String(params.revision) !== app.previewRevision) {
        throw Object.assign(new Error('リビジョンが最新ではありません。'), { code: 'GAIA_CO02' });
      }
      writeSection(app, endpointToKey.get(path)!, method, params);
      app.previewRevision = String(Number(app.previewRevision) + 1);
      return { revision: app.previewRevision };
    }
    throw new Error(`Unexpected write: ${method} ${url}`);
  });

  return { api, calls, requests, deployments, apps, writes: () => calls.filter(call => call.method !== 'GET') };
}
