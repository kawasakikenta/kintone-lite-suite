'use strict';

// settings-design-explore.cjs 用の合成 kintone（ページ内で動く読み取り専用の API）。
// page.evaluate に関数として渡すため、外側の変数は参照しない。実際の kintone には通信しない。
function installSyntheticKintone(config) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const nativeSetTimeout = window.setTimeout.bind(window);
  const sleep = ms => new Promise(resolve => nativeSetTimeout(resolve, ms));
  const ENDPOINTS = {
    '/app/settings.json': 'appSettings', '/app/form/fields.json': 'fieldSettings', '/app/form/layout.json': 'layoutSettings',
    '/app/views.json': 'viewSettings', '/app/reports.json': 'reportSettings', '/app/status.json': 'processSettings',
    '/app/plugins.json': 'pluginSettings', '/app/customize.json': 'customizeSettings', '/app/actions.json': 'actionSettings',
    '/app/acl.json': 'appAcl', '/field/acl.json': 'fieldAcl', '/record/acl.json': 'recordPermissions',
    '/app/notifications/general.json': 'notifications', '/app/notifications/perRecord.json': 'perRecordNotifications',
    '/app/notifications/reminder.json': 'reminderNotifications', '/app/categories.json': 'categories', '/form.json': 'formSettings'
  };
  const S = window.__k = {
    seq: 0, t0: Date.now(), latency: config.latency ?? 3, calls: [], violations: [], downloads: [], fileFetches: [], active: 0, maxActive: 0,
    apps: {}, files: clone(config.files || {}), failures: {}, hold: false, resolvers: [], clipboard: [], rejectAll: false
  };
  for (const def of config.apps) {
    S.apps[`${def.guest || ''}:${def.id}`] = { ...clone(def) };
  }
  const kerr = (code, message, extra = {}) => Object.assign(new Error(message), { code, id: `req-${S.seq}`, ...extra });
  const violation = message => { S.violations.push(message); return new Error(message); };

  const parse = url => {
    const m = /^\/k(?:\/guest\/(\d+))?\/v1(\/preview)?(\/.+?)(?:\?.*)?$/.exec(String(url));
    if (!m) throw violation(`想定外の URL: ${url}`);
    return { guest: m[1] || '', preview: !!m[2], path: m[3] };
  };
  const appOf = (guest, id) => {
    const app = S.apps[`${guest}:${id}`];
    if (!app) throw kerr('GAIA_AP01', `指定したアプリ（id: ${id}）が見つかりません。`);
    return app;
  };

  const api = async (url, method, params) => {
    const call = { seq: ++S.seq, at: Date.now() - S.t0, url: String(url), method, params: clone(params || {}) };
    S.calls.push(call);
    S.active += 1; S.maxActive = Math.max(S.maxActive, S.active);
    try {
      if (S.latency) await sleep(S.latency);
      while (S.hold) await new Promise(resolve => S.resolvers.push(resolve));
      if (method !== 'GET') throw violation(`読み取り専用のツールが書き込みを送った: ${method} ${url}`);
      const { guest, preview, path: p } = parse(url);
      if (S.rejectAll) throw kerr('CB_NO02', '権限がありません。');
      if (p === '/apps.json') {
        const list = Object.values(S.apps).filter(a => (a.guest || '') === guest);
        let filtered = list;
        if (params?.name) filtered = filtered.filter(a => a.name.includes(params.name));
        const spaceIds = (params?.spaceIds || []).map(String);
        if (spaceIds.length) filtered = filtered.filter(a => spaceIds.includes(String(a.spaceId)));
        filtered = filtered.sort((a, b) => Number(a.id) - Number(b.id));
        const offset = Number(params?.offset || 0), limit = Math.min(Number(params?.limit || 100), 100);
        return { apps: filtered.slice(offset, offset + limit).map(a => ({ appId: a.id, code: a.code, name: a.name, description: '', spaceId: a.spaceId, threadId: a.spaceId, createdAt: '2026-01-01T00:00:00Z', creator: { code: 'admin', name: '管理者' }, modifiedAt: '2026-02-01T00:00:00Z', modifier: { code: 'admin', name: '管理者' } })) };
      }
      if (p === '/app.json') {
        const app = appOf(guest, params?.id);
        const name = preview ? (app.preview.appSettings.name || app.name) : (app.production.appSettings.name || app.name);
        return { appId: app.id, code: app.code, name, description: '', spaceId: app.spaceId, threadId: app.spaceId, createdAt: '2026-01-01T00:00:00Z', creator: { code: 'admin', name: '管理者' }, modifiedAt: '2026-02-01T00:00:00Z', modifier: { code: 'admin', name: '管理者' } };
      }
      if (p === '/records.json') { appOf(guest, params?.app); return { records: [], totalCount: '1234' }; }
      if (p === '/app/adminNotes.json') { appOf(guest, params?.app); return { content: '<b>管理者メモ</b>', includeInTemplateAndDuplicates: false, revision: '1' }; }
      if (p === '/app/plugin/config.json') {
        const app = appOf(guest, params?.app);
        if ((app.pluginConfigFail || []).includes(params.id)) throw kerr('GAIA_PL02', 'プラグインの設定を取得できません。');
        const config1 = (app.pluginConfigs || {})[params.id];
        if (config1 === undefined) throw kerr('GAIA_PL01', 'プラグインが見つかりません。');
        return { config: clone(config1), revision: '3' };
      }
      const key = ENDPOINTS[p];
      if (!key) throw violation(`想定外の GET: ${url}`);
      const app = appOf(guest, params?.app);
      const failure = (app.failures || {})[p];
      if (failure) throw kerr(failure.code, failure.message);
      const sections = preview ? app.preview : app.production;
      return { ...clone(sections[key]), revision: '7' };
    } finally {
      S.active -= 1;
    }
  };
  api.url = value => value;
  const callApi = (url, method, params, ok, ng) => {
    const promise = api(url, method, params);
    if (typeof ok === 'function') { promise.then(ok, ng || (() => {})); return undefined; }
    return promise;
  };
  callApi.url = value => value;
  window.kintone = {
    app: { getId: () => (config.currentAppId == null ? null : Number(config.currentAppId)), getHeaderMenuSpaceElement: () => null },
    getRequestToken: () => 'TOKEN', getLoginUser: () => ({ code: 'admin', name: '管理者' }), api: callApi
  };
  window.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    S.calls.push({ seq: ++S.seq, at: Date.now() - S.t0, url: String(url), method, fetch: true });
    if (S.latency) await sleep(S.latency);
    const m = /^\/k(?:\/guest\/(\d+))?\/v1\/file\.json\?fileKey=([^&]+)$/.exec(String(url));
    if (!m || method !== 'GET') throw violation(`想定外の fetch: ${method} ${url}`);
    const key = decodeURIComponent(m[2]);
    S.fileFetches.push(key);
    if (S.files[key] === undefined) return new Response('', { status: 404 });
    return new Response(new Blob([S.files[key]], { type: 'text/javascript' }));
  };
  S.release = () => { S.hold = false; S.resolvers.splice(0).forEach(resolve => resolve()); };

  // ダウンロードを実ファイルにせず、名前と中身を記録する。クリップボードも記録する。
  if (!window.__anchorPatched) {
    window.__anchorPatched = true;
    const create = URL.createObjectURL.bind(URL), blobs = new Map();
    URL.createObjectURL = blob => { const url = create(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () {
      const current = window.__k;
      if (current) current.downloads.push({ seq: ++current.seq, name: this.download, blob: blobs.get(this.href) });
    };
  }
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { S.clipboard.push(String(text)); } } }); } catch (error) { /* 既定のまま */ }
  window.open = () => null;
}

module.exports = { installSyntheticKintone };
