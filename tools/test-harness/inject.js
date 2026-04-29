async (page) => {
  // Stub localStorage/sessionStorage and disable popup before any script runs
  await page.addInitScript(() => {
    const makeStorage = () => {
      const store = new Map();
      return {
        get length() { return store.size; },
        key(i) { return Array.from(store.keys())[i] ?? null; },
        getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
        setItem(k, v) { store.set(String(k), String(v)); },
        removeItem(k) { store.delete(String(k)); },
        clear() { store.clear(); }
      };
    };
    try { Object.defineProperty(window, 'localStorage', { configurable: true, writable: true, value: makeStorage() }); } catch (e) {}
    try { Object.defineProperty(window, 'sessionStorage', { configurable: true, writable: true, value: makeStorage() }); } catch (e) {}
    Object.defineProperty(window, 'open', {
      configurable: true,
      writable: true,
      value: () => null
    });
  });

  // Mock kintone.api + kintone.app + kintone.getLoginUser
  await page.evaluate(() => {
    const calls = [];
    const respond = (data) => Promise.resolve(data);
    const k = {
      _calls: calls,
      api: (path, method, params) => {
        calls.push({ path, method, params });
        if (/\/app\/form\/fields\.json/.test(path)) return respond({
          properties: {
            field_a: { code: 'field_a', type: 'SINGLE_LINE_TEXT', label: '名前', required: true },
            field_b: { code: 'field_b', type: 'NUMBER', label: '金額' },
            field_old: { code: 'field_old', type: 'SINGLE_LINE_TEXT', label: '旧フィールド' }
          },
          revision: '5'
        });
        if (/\/app\.json/.test(path)) return respond({ appId: (params && params.id) || '1', name: 'デモアプリ', code: 'DEMO' });
        if (/\/app\/settings\.json/.test(path)) return respond({ name: 'デモアプリ', revision: '5', icon: { type: 'PRESET', key: 'APP62' }, theme: 'WHITE' });
        if (/\/app\/form\/layout\.json/.test(path)) return respond({ layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'field_a' }] }], revision: '5' });
        if (/\/app\/views\.json/.test(path)) return respond({ views: { '一覧': { id: '11', name: '一覧', type: 'LIST', fields: ['field_a'], filterCond: '', sort: '' } }, revision: '5' });
        if (/\/app\/reports\.json/.test(path)) return respond({ reports: {}, revision: '5' });
        if (/\/form\.json/.test(path)) return respond({ properties: [] });
        if (/\/app\/status\.json/.test(path)) return respond({ enable: true, states: { '未処理': { name: '未処理', index: '0', assignee: null } }, actions: [], revision: '5' });
        if (/\/app\/plugins\.json/.test(path)) return respond({ plugins: [] });
        if (/\/app\/customize\.json/.test(path)) return respond({ desktop: { js: [], css: [] }, mobile: { js: [], css: [] }, scope: 'ALL' });
        if (/\/app\/actions\.json/.test(path)) return respond({ actions: [], revision: '5' });
        if (/\/app\/acl\.json/.test(path)) return respond({ rights: [{ entity: { type: 'USER', code: 'admin' }, appEditable: true, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: true, recordImportable: true, recordExportable: true }], revision: '5' });
        if (/\/field\/acl\.json/.test(path)) return respond({ rights: [], revision: '5' });
        if (/\/record\/acl\.json/.test(path)) return respond({ rights: [], revision: '5' });
        if (/\/app\/notifications\/general\.json/.test(path)) return respond({ notifications: [], revision: '5' });
        if (/\/app\/notifications\/perRecord\.json/.test(path)) return respond({ notifications: [], revision: '5' });
        if (/\/app\/notifications\/reminder\.json/.test(path)) return respond({ notifications: [], revision: '5' });
        if (/\/app\/categories\.json/.test(path)) return respond({ enable: false, categories: {}, revision: '5' });
        return respond({});
      },
      app: {
        getId: () => 1,
        getQueryCondition: () => '',
        record: { getId: () => null }
      },
      getLoginUser: () => ({ id: 'admin', code: 'admin', name: 'tester', email: 'test@example.com' })
    };
    Object.defineProperty(window, 'kintone', { configurable: true, writable: true, value: k });
  });

  // Inject bundle
  await page.addScriptTag({ path: 'c:/Users/Kksof/OneDrive/デスクトップ/kintone/tools/統合ツール.js' });
  await page.waitForTimeout(300);

  // Boot the suite
  await page.evaluate(() => {
    const w = window;
    const fn = w.runKintoneUnifiedSuite || (w.__KUS && w.__KUS.run);
    if (typeof fn === 'function') {
      try { fn({}); } catch (e) { console.error('runKintoneUnifiedSuite failed', e); }
    }
  });

  await page.waitForTimeout(1500);

  return await page.evaluate(() => {
    const root = document.getElementById('kintone-unified-suite-v2');
    return {
      rootExists: !!root,
      rect: root ? { w: root.offsetWidth, h: root.offsetHeight } : null
    };
  });
}
