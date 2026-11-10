import { vi } from 'vitest';
import { SECTION_DEFS } from '../../src/constants';

/**
 * 続けて反映する反映先（一括事前確認）と参照先変換の候補のテスト用に、kintone.api を合成する。
 * アプリごとに本番・プレビューの設定と revision を持ち、/app.json（アプリ名）・設定の GET・プレビューへの書き込み（revision 照合）を再現する。
 */
export interface RolloutApp {
  name: string;
  production: Record<string, any>;
  /** 省略すると本番と同じ（未公開の変更なし） */
  preview?: Record<string, any>;
  prodRevision?: string;
  previewRevision?: string;
}

export interface RolloutCall { url: string; method: string; params: any }

export interface RolloutWorldOptions {
  /** この条件に合う GET を失敗させる（例外を投げる） */
  failGet?: (call: RolloutCall & { appId: string; preview: boolean; key: string }) => any | undefined;
  /** GET の前に呼ばれる（待機・中止の再現に使う） */
  onGet?: (call: RolloutCall & { appId: string; preview: boolean; key: string }) => void | Promise<void>;
}

const endpointToKey = new Map(SECTION_DEFS.map(def => [def.endpoint, def.key]));
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const text = (code: string, extra: Record<string, any> = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label: code, required: false, ...extra });
export const lookup = (code: string, app: string | number, extra: Record<string, any> = {}) => ({
  ...text(code),
  lookup: { relatedApp: { app: String(app), code: '' }, relatedKeyField: 'code', fieldMappings: [], lookupPickerFields: [], filterCond: '', sort: '' },
  ...extra
});
export const reference = (code: string, app: string | number) => ({
  type: 'REFERENCE_TABLE', code, label: code, noLabel: false,
  referenceTable: { relatedApp: { app: String(app), code: '' }, condition: { field: 'key', relatedField: 'key' }, filterCond: '', displayFields: [], sort: '', size: '5' }
});
export const row = (...codes: string[]) => ({ type: 'ROW', fields: codes.map(code => ({ type: 'SINGLE_LINE_TEXT', code, size: { width: '200' } })) });

export function createRolloutWorld(apps: Record<string, RolloutApp>, options: RolloutWorldOptions = {}) {
  const state = Object.fromEntries(Object.entries(apps).map(([id, app]) => [id, {
    name: app.name, production: copy(app.production), preview: copy(app.preview ?? app.production),
    prodRevision: app.prodRevision ?? '10', previewRevision: app.previewRevision ?? app.prodRevision ?? '10'
  }]));
  const calls: RolloutCall[] = [];
  const api = vi.fn(async (url: string, method: string, params: any) => {
    const call: RolloutCall = { url, method, params };
    calls.push(call);
    const match = url.match(/^\/k(?:\/guest\/(\d+))?\/v1(\/preview)?(\/.*)$/);
    if (!match) throw new Error(`Unexpected URL: ${url}`);
    const [, , isPreview, path] = match;
    if (method === 'GET' && path === '/app.json') {
      const app = state[String(params?.id)];
      if (!app) throw Object.assign(new Error('指定したアプリ（ID: ' + params?.id + '）が見つかりません。'), { code: 'GAIA_AP01' });
      return { appId: String(params.id), name: app.name, code: `code${params.id}` };
    }
    const appId = String(params?.app ?? '');
    const key = endpointToKey.get(path) as string | undefined;
    const app = state[appId];
    if (!key) throw new Error(`Unexpected endpoint: ${url}`);
    if (method === 'GET') {
      const info = { ...call, appId, preview: !!isPreview, key };
      await options.onGet?.(info);
      const failure = options.failGet?.(info);
      if (failure) throw failure;
      if (!app) throw Object.assign(new Error('指定したアプリ（ID: ' + appId + '）が見つかりません。'), { code: 'GAIA_AP01' });
      const side = isPreview ? app.preview : app.production;
      const revision = isPreview ? app.previewRevision : app.prodRevision;
      if (path === '/app/settings.json') return { name: app.name, ...copy(side.appSettings ?? {}), revision };
      return { ...copy(side[key] ?? {}), revision };
    }
    if (!isPreview) throw new Error(`本番への書き込み: ${method} ${url}`);
    if (!app) throw Object.assign(new Error('指定したアプリが見つかりません。'), { code: 'GAIA_AP01' });
    if (String(params.revision) !== app.previewRevision) throw Object.assign(new Error('指定したrevisionは最新ではありません。'), { code: 'GAIA_CO02' });
    const { app: _app, revision: _revision, ...rest } = copy(params);
    const section = app.preview[key] ?? (app.preview[key] = {});
    if (key === 'fieldSettings') {
      section.properties = section.properties ?? {};
      for (const [code, definition] of Object.entries<any>(rest.properties || {})) section.properties[code] = method === 'POST' ? definition : { ...(section.properties[code] || {}), ...definition };
    } else app.preview[key] = { ...section, ...rest };
    app.previewRevision = String(Number(app.previewRevision) + 1);
    return { revision: app.previewRevision };
  });
  return {
    api, calls, state,
    writes: () => calls.filter(call => call.method !== 'GET'),
    gets: (filter: (call: RolloutCall) => boolean = () => true) => calls.filter(call => call.method === 'GET' && filter(call)),
    install: () => vi.stubGlobal('kintone', { api })
  };
}
