'use strict';

// フィールド追加・JS/CSS 設定の通し検証（field-jsconfig-explore.cjs）で使う合成 kintone と業務アプリの設定。
// installSyntheticKintone は page.evaluate に関数として渡すため、外側の変数は参照しない（ページ内で動く）。
// 実際の kintone に近い振る舞いにする。
//   - アプリ単位の revision（本番・プレビュー別）。書き込みの revision 照合は GAIA_CO02。
//   - フィールド: 種類の変更・コードの重複・存在しないフィールドを参照する計算式やルックアップのコピー先・選択肢に無い初期値はエラー。
//   - JS/CSS: 別のアプリの fileKey は使えない。アップロード直後の fileKey は 1 回だけ使える。
//   - ファイル本体は GET /k/v1/file.json?fileKey=、アップロードは POST /k/v1/file.json（ゲストスペースは /k/guest/N/v1/…）。

function installSyntheticKintone(config) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const nativeSetTimeout = window.setTimeout.bind(window);
  const sleep = ms => new Promise(resolve => nativeSetTimeout(resolve, ms));

  const S = window.__k = {
    seq: 0, latency: config.latency ?? 4, calls: [], writes: [], uploads: [], fileFetches: [], violations: [], downloads: [],
    files: clone(config.files || {}), fileOwner: clone(config.fileOwner || {}), uploadKeys: new Set(), consumedKeys: {}, apps: {},
    failUpload: config.failUpload || {}, failUploadNth: config.failUploadNth || [], failFileGet: config.failFileGet || {}, holdUploads: false, uploadResolvers: [], heldUploads: 0,
    bumpOnGet: null, failWrites: config.failWrites || {}, holdWrites: false, writeResolvers: [], heldWrites: 0
  };
  const kerr = (code, message, extra = {}) => Object.assign(new Error(message), { code, id: `req-${S.seq}`, ...extra });
  const invalid = (path, message) => kerr('CB_VA01', '入力内容が正しくありません。', { errors: { [path]: { messages: [message] } } });
  const noField = code => kerr('GAIA_FC01', `指定したフィールド（code: ${code}）が見つかりません。`);
  const violation = message => { S.violations.push(message); return new Error(message); };

  for (const def of config.apps) {
    S.apps[`${def.guest || ''}/${def.id}`] = {
      id: String(def.id), guest: def.guest || '', name: def.name, code: def.code || `app${def.id}`,
      prodRev: Number(def.prodRevision ?? 5), previewRev: Number(def.previewRevision ?? def.prodRevision ?? 5),
      prod: { fields: clone(def.fields || {}), customize: clone(def.customize || { scope: 'ALL', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } }) },
      preview: { fields: clone(def.previewFields || def.fields || {}), customize: clone(def.previewCustomize || def.customize || { scope: 'ALL', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } }) }
    };
  }
  const appOf = (guest, id) => {
    const app = S.apps[`${guest}/${id}`];
    if (!app) throw kerr('GAIA_AP01', `指定したアプリ（id: ${id}）が見つかりません。`);
    return app;
  };
  S.app = (id, guest = '') => S.apps[`${guest}/${id}`];
  S.bumpPreview = (id, guest = '') => { const app = S.app(id, guest); app.previewRev += 1; };

  const allCodes = props => {
    const map = new Map();
    for (const [code, def] of Object.entries(props)) { map.set(code, def); if (def.type === 'SUBTABLE') for (const [child, childDef] of Object.entries(def.fields || {})) map.set(child, childDef); }
    return map;
  };
  const FUNCTIONS = new Set(['SUM', 'IF', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'AND', 'OR', 'NOT', 'MAX', 'MIN', 'DATE_FORMAT', 'YEN', 'AVG', 'COUNT', 'TRUE', 'FALSE']);
  const validateField = (path, def, form, selfCode, guest) => {
    if (!def || typeof def.type !== 'string') throw invalid(`${path}.type`, 'フィールドタイプを指定してください。');
    if (['DROP_DOWN', 'RADIO_BUTTON', 'CHECK_BOX', 'MULTI_SELECT'].includes(def.type)) {
      if (!def.options || !Object.keys(def.options).length) throw invalid(`${path}.options`, '選択肢を1つ以上指定してください。');
      const dv = def.defaultValue;
      const values = Array.isArray(dv) ? dv : (dv === undefined || dv === '' ? [] : [dv]);
      for (const value of values) if (!Object.prototype.hasOwnProperty.call(def.options, value)) throw invalid(`${path}.defaultValue`, `初期値「${value}」は選択肢にありません。`);
    }
    if (def.type === 'CALC') {
      if (typeof def.expression !== 'string' || !def.expression) throw invalid(`${path}.expression`, '計算式を指定してください。');
      const tokens = def.expression.replace(/"[^"]*"/g, '""').match(/[\p{L}_][\p{L}\p{N}_]*/gu) || [];
      for (const token of tokens) {
        if (FUNCTIONS.has(token.toUpperCase())) continue;
        if (!form.has(token) || token === selfCode) throw invalid(`${path}.expression`, `計算式で使われているフィールド「${token}」が見つかりません。`);
      }
    }
    if (def.lookup) {
      const lookup = def.lookup;
      const related = lookup.relatedApp?.app ? S.apps[`${guest}/${lookup.relatedApp.app}`] : null;
      if (!lookup.relatedApp?.app && !lookup.relatedApp?.code) throw invalid(`${path}.lookup.relatedApp`, '参照するアプリを指定してください。');
      if (lookup.relatedApp.app && !related) throw kerr('GAIA_AP01', `指定したアプリ（id: ${lookup.relatedApp.app}）が見つかりません。`);
      for (const mapping of lookup.fieldMappings || []) if (!form.has(mapping.field)) throw invalid(`${path}.lookup.fieldMappings`, `コピー先フィールド「${mapping.field}」が見つかりません。`);
    }
    if (def.type === 'REFERENCE_TABLE') {
      const ref = def.referenceTable;
      if (!ref?.relatedApp || (ref.relatedApp.app && !S.apps[`${guest}/${ref.relatedApp.app}`])) throw kerr('GAIA_AP01', `指定したアプリ（id: ${ref?.relatedApp?.app}）が見つかりません。`);
      if (!form.has(ref.condition?.field)) throw invalid(`${path}.referenceTable.condition.field`, `フィールド「${ref.condition?.field}」が見つかりません。`);
    }
  };
  const writeFields = (app, method, body) => {
    if (!body.properties || typeof body.properties !== 'object') throw invalid('properties', 'propertiesを指定してください。');
    const staged = clone(app.preview.fields);
    for (const [code, def] of Object.entries(clone(body.properties))) {
      if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(code)) throw invalid(`properties.${code}`, 'フィールドコードに使用できない文字が含まれています。');
      if (method === 'POST') {
        const newCode = def.code || code;
        if (allCodes(staged).has(newCode)) throw kerr('GAIA_FC03', `フィールドコード「${newCode}」は既に使用されています。`);
        if (def.type === 'SUBTABLE') {
          for (const [child, childDef] of Object.entries(def.fields || {})) {
            if (allCodes(staged).has(childDef.code || child)) throw kerr('GAIA_FC03', `フィールドコード「${childDef.code || child}」は既に使用されています。`);
          }
        }
        staged[newCode] = def;
      } else {
        const top = staged[code];
        if (!top) throw noField(code);
        if (def.type !== undefined && def.type !== top.type) throw invalid(`properties.${code}.type`, `フィールドタイプは変更できません（${top.type} → ${def.type}）。`);
        if (top.type === 'SUBTABLE' && def.fields) {
          const children = clone(top.fields);
          for (const [child, childDef] of Object.entries(def.fields)) {
            if (!children[child]) throw noField(child);
            if (childDef.type !== undefined && childDef.type !== children[child].type) throw invalid(`properties.${code}.fields.${child}.type`, `フィールドタイプは変更できません（${children[child].type} → ${childDef.type}）。`);
            const merged = { ...children[child], ...childDef };
            if (merged.code && merged.code !== child) { delete children[child]; children[merged.code] = merged; } else children[child] = merged;
          }
          const { fields: _fields, ...rest } = def;
          const merged = { ...top, ...rest, fields: children };
          if (merged.code && merged.code !== code) { delete staged[code]; staged[merged.code] = merged; } else staged[code] = merged;
        } else {
          const merged = { ...top, ...def };
          if (merged.code && merged.code !== code) { delete staged[code]; staged[merged.code] = merged; } else staged[code] = merged;
        }
      }
    }
    // 重複するコード（コード変更の衝突を含む）
    const seen = new Set();
    const dup = code => { if (seen.has(code)) throw kerr('GAIA_FC03', `フィールドコード「${code}」が重複しています。`); seen.add(code); };
    for (const [code, def] of Object.entries(staged)) { dup(code); if (def.type === 'SUBTABLE') for (const child of Object.keys(def.fields || {})) dup(child); }
    const form = allCodes(staged);
    for (const [code, def] of Object.entries(staged)) {
      validateField(`properties.${code}`, def, form, code, app.guest);
      if (def.type === 'SUBTABLE') for (const [child, childDef] of Object.entries(def.fields || {})) validateField(`properties.${code}.fields.${child}`, childDef, form, child, app.guest);
    }
    app.preview.fields = staged;
  };
  const writeCustomize = (app, body) => {
    if (body.scope !== undefined && !['ALL', 'ADMIN', 'NONE'].includes(body.scope)) throw invalid('scope', 'scopeが正しくありません。');
    const own = new Set(['desktop', 'mobile'].flatMap(platform => ['js', 'css'].flatMap(kind => (app.preview.customize[platform]?.[kind] || []).map(item => item.file?.fileKey).filter(Boolean))));
    const used = [];
    for (const platform of ['desktop', 'mobile']) for (const kind of ['js', 'css']) {
      for (const item of body[platform]?.[kind] || []) {
        if (item.type === 'URL') { if (!/^https?:\/\//.test(item.url || '')) throw invalid(`${platform}.${kind}.url`, 'URLが正しくありません。'); continue; }
        if (item.type !== 'FILE') throw invalid(`${platform}.${kind}.type`, 'typeはFILEまたはURLを指定してください。');
        const key = item.file?.fileKey;
        const stored = S.fileOwner[key] === `${app.guest}/${app.id}` || own.has(key);
        // 別のアプリで添付されている fileKey は流用できない。アップロード直後の fileKey は 1 回だけ使える。
        if (!key || (!stored && !S.uploadKeys.has(key))) throw kerr('GAIA_BL01', `ファイル（fileKey: ${key}）が見つかりません。`);
        if (!stored) { if (S.consumedKeys[key]) throw kerr('GAIA_BL01', `ファイル（fileKey: ${key}）は既に使用されています。`); used.push(key); }
      }
    }
    for (const key of used) { S.consumedKeys[key] = true; S.fileOwner[key] = `${app.guest}/${app.id}`; }
    const rebuilt = { scope: body.scope !== undefined ? body.scope : app.preview.customize.scope };
    for (const platform of ['desktop', 'mobile']) {
      rebuilt[platform] = {};
      for (const kind of ['js', 'css']) {
        rebuilt[platform][kind] = (body[platform]?.[kind] || []).map(item => {
          if (item.type !== 'FILE') return item;
          const key = item.file.fileKey;
          const prev = ['desktop', 'mobile'].flatMap(p => ['js', 'css'].flatMap(k => app.preview.customize[p]?.[k] || [])).find(entry => entry.file?.fileKey === key);
          return { type: 'FILE', file: { fileKey: key, name: S.fileNames?.[key] || prev?.file?.name || key, contentType: 'text/plain', size: String((S.files[key] || '').length) } };
        });
      }
    }
    app.preview.customize = rebuilt;
  };
  S.fileNames = {};
  for (const app of Object.values(S.apps)) for (const section of [app.prod.customize, app.preview.customize]) {
    for (const platform of ['desktop', 'mobile']) for (const kind of ['js', 'css']) for (const item of section[platform]?.[kind] || []) {
      if (item.type === 'FILE') { S.fileNames[item.file.fileKey] = item.file.name; if (!S.fileOwner[item.file.fileKey]) S.fileOwner[item.file.fileKey] = `${app.guest}/${app.id}`; }
    }
  }

  const api = async (url, method, params) => {
    const call = { seq: ++S.seq, url, method, params: method === 'GET' ? clone(params ?? {}) : undefined };
    S.calls.push(call);
    if (S.latency) await sleep(S.latency);
    const match = /^\/k(?:\/guest\/(\d+))?\/v1(\/preview)?(\/.*)$/.exec(url);
    if (!match) throw violation(`想定外の URL: ${method} ${url}`);
    const guest = match[1] || '', preview = !!match[2], p = match[3];
    if (method === 'GET') {
      if (p === '/apps.json') {
        if (preview) throw violation(`apps.json に preview prefix は無い: ${url}`);
        const limit = Number(params?.limit ?? 100), offset = Number(params?.offset ?? 0);
        const list = Object.values(S.apps).filter(app => app.guest === guest).sort((a, b) => Number(a.id) - Number(b.id));
        const named = params?.name ? list.filter(app => app.name.includes(params.name)) : list;
        return { apps: named.slice(offset, offset + limit).map(app => ({ appId: app.id, code: app.code, name: app.name, description: '', spaceId: null, threadId: null })) };
      }
      if (p === '/app.json') { const app = appOf(guest, params?.id); return { appId: app.id, code: app.code, name: app.name, description: '', spaceId: null, threadId: null }; }
      if (p === '/app/form/fields.json' || p === '/app/customize.json') {
        const app = appOf(guest, params?.app);
        const section = preview ? app.preview : app.prod;
        const result = p === '/app/form/fields.json' ? { properties: clone(section.fields) } : clone(section.customize);
        result.revision = String(preview ? app.previewRev : app.prodRev);
        if (S.bumpOnGet && S.bumpOnGet.app === `${guest}/${app.id}` && preview && p === S.bumpOnGet.path) { const hook = S.bumpOnGet; S.bumpOnGet = null; app.previewRev += 1; if (hook.mutate) hook.mutate(app); }
        return result;
      }
      throw violation(`想定外の GET: ${url}`);
    }
    if ((method === 'PUT' || method === 'POST') && (p === '/app/form/fields.json' || p === '/app/customize.json')) {
      if (!preview) throw violation(`本番への設定の書き込み: ${method} ${url}`);
      const app = appOf(guest, params?.app);
      const record = { seq: call.seq, url, path: p, method, body: clone(params), rejected: false, error: '', appKey: `${guest}/${app.id}` };
      S.writes.push(record);
      if (S.holdWrites) { S.heldWrites += 1; await new Promise(resolve => S.writeResolvers.push(resolve)); }
      const fail = error => { record.rejected = true; record.error = `${error.code}: ${error.message}`; return error; };
      const injected = S.failWrites[`${record.appKey}${p}`] || S.failWrites[p];
      if (injected) throw fail(kerr(injected.code, injected.message));
      if (params.revision !== undefined && String(params.revision) !== '-1' && String(params.revision) !== String(app.previewRev)) throw fail(kerr('GAIA_CO02', '指定したrevisionは最新ではありません。他のユーザーによってアプリの設定が更新されています。'));
      try { if (p === '/app/form/fields.json') writeFields(app, method, params); else writeCustomize(app, params); } catch (error) { throw fail(error); }
      app.previewRev += 1;
      return { revision: String(app.previewRev) };
    }
    throw violation(`想定外の書き込み: ${method} ${url}`);
  };
  api.url = value => value;
  const callApi = (url, method, params, ok, ng) => {
    const promise = api(url, method, params);
    if (typeof ok === 'function') { promise.then(ok, ng || (() => {})); return undefined; }
    return promise;
  };
  callApi.url = value => value;
  window.kintone = { app: { getId: () => Number(config.currentAppId ?? 101), getHeaderMenuSpaceElement: () => null }, getRequestToken: () => 'TOKEN', api: callApi };

  window.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    S.calls.push({ seq: ++S.seq, url: String(url), method, fetch: true });
    if (S.latency) await sleep(S.latency);
    if (method === 'POST') {
      const m = /^\/k(?:\/guest\/(\d+))?\/v1\/file\.json$/.exec(String(url));
      if (!m) throw violation(`想定外の fetch: POST ${url}`);
      const upload = init.body.get('file');
      const record = { seq: S.seq, url: String(url), name: upload.name, size: upload.size, fileKey: '' };
      S.uploads.push(record);
      if (S.holdUploads) { S.heldUploads += 1; await new Promise((resolve, reject) => { S.uploadResolvers.push(resolve); init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); }); }
      const failure = S.failUpload[upload.name] || S.failUpload['*'] || (S.failUploadNth.includes(S.uploads.length) ? { status: 500, code: 'GAIA_UP01', message: 'アップロードに失敗しました。' } : null);
      if (failure) return new Response(JSON.stringify({ code: failure.code, message: failure.message }), { status: failure.status || 500 });
      record.fileKey = `up-${S.uploads.length}`;
      S.files[record.fileKey] = await upload.text();
      S.fileNames[record.fileKey] = upload.name;
      S.uploadKeys.add(record.fileKey);
      return new Response(JSON.stringify({ fileKey: record.fileKey }));
    }
    const m = /^\/k(?:\/guest\/(\d+))?\/v1\/file\.json\?fileKey=([^&]+)$/.exec(String(url));
    if (!m) throw violation(`想定外の fetch: ${method} ${url}`);
    const key = decodeURIComponent(m[2]);
    S.fileFetches.push({ guest: m[1] || '', key });
    if (S.failFileGet[key]) return new Response('', { status: S.failFileGet[key] });
    if (S.files[key] === undefined) return new Response('', { status: 404 });
    return new Response(new Blob([S.files[key]], { type: 'text/javascript' }));
  };
  S.release = () => { S.holdUploads = false; S.holdWrites = false; S.uploadResolvers.splice(0).forEach(resolve => resolve()); S.writeResolvers.splice(0).forEach(resolve => resolve()); };

  // ZIP は製品の自前実装が作る（ページの window.JSZip は使われない）。保存された ZIP は downloads に記録し、Node 側で読み戻して検査する。
  // ダウンロードは実ファイルにせず、名前と中身を記録する。
  if (!window.__anchorPatched) {
    window.__anchorPatched = true;
    const create = URL.createObjectURL.bind(URL), blobs = new Map();
    URL.createObjectURL = blob => { const url = create(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () { const current = window.__k; if (current) current.downloads.push({ name: this.download, blob: blobs.get(this.href) }); };
  }
  window.open = () => null;
}

// ---------------------------------------------------------------------------
// 業務アプリに近いフィールド設定（Node 側）
// ---------------------------------------------------------------------------
const clone = value => JSON.parse(JSON.stringify(value));
const f = {
  text: (code, label, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, noLabel: false, required: false, unique: false, maxLength: '', minLength: '', defaultValue: '', expression: '', hideExpression: false, ...extra }),
  memo: (code, label, extra = {}) => ({ type: 'MULTI_LINE_TEXT', code, label, noLabel: false, required: false, defaultValue: '', ...extra }),
  number: (code, label, extra = {}) => ({ type: 'NUMBER', code, label, noLabel: false, required: false, unique: false, minValue: '', maxValue: '', digit: false, displayScale: '', unit: '', unitPosition: 'BEFORE', defaultValue: '', ...extra }),
  calc: (code, label, expression, extra = {}) => ({ type: 'CALC', code, label, noLabel: false, required: false, expression, format: 'NUMBER', displayScale: '', hideExpression: false, unit: '', unitPosition: 'BEFORE', ...extra }),
  choice: (type, code, label, names, defaultValue, extra = {}) => ({ type, code, label, noLabel: false, required: false, options: Object.fromEntries(names.map((name, index) => [name, { label: name, index: String(index) }])), defaultValue, ...(type === 'DROP_DOWN' ? {} : { align: 'HORIZONTAL' }), ...extra }),
  date: (code, label, extra = {}) => ({ type: 'DATE', code, label, noLabel: false, required: false, unique: false, defaultValue: '', defaultNowValue: false, ...extra }),
  user: (code, label, extra = {}) => ({ type: 'USER_SELECT', code, label, noLabel: false, required: false, entities: [], defaultValue: [], ...extra }),
  file: (code, label) => ({ type: 'FILE', code, label, noLabel: false, required: false, thumbnailSize: '150' }),
  group: (code, label) => ({ type: 'GROUP', code, label, noLabel: false, openGroup: true }),
  table: (code, fields) => ({ type: 'SUBTABLE', code, noLabel: false, fields: Object.fromEntries(fields.map(field => [field.code, field])) }),
  lookup: (code, label, relatedApp, mappings = [], extra = {}) => ({ ...f.text(code, label), lookup: { relatedApp: { app: String(relatedApp), code: '' }, relatedKeyField: 'code', fieldMappings: mappings, lookupPickerFields: ['code', 'name'], filterCond: '', sort: 'code asc' }, ...extra }),
  reference: (code, label, relatedApp, conditionField, extra = {}) => ({ type: 'REFERENCE_TABLE', code, label, noLabel: false, referenceTable: { relatedApp: { app: String(relatedApp), code: '' }, condition: { field: conditionField, relatedField: 'code' }, filterCond: '', displayFields: ['code', 'name'], sort: 'code asc', size: '5' }, ...extra }),
  system: () => [
    { type: 'RECORD_NUMBER', code: 'record_no', label: 'レコード番号', noLabel: false },
    { type: 'CREATOR', code: 'creator', label: '作成者', noLabel: false },
    { type: 'CREATED_TIME', code: 'created', label: '作成日時', noLabel: false },
    { type: 'MODIFIER', code: 'modifier', label: '更新者', noLabel: false },
    { type: 'UPDATED_TIME', code: 'updated', label: '更新日時', noLabel: false }
  ]
};
const props = fields => Object.fromEntries(fields.map(field => [field.code, clone(field)]));

/** 取引先マスタ（ルックアップ・関連レコード一覧の参照先）。 */
const masterFields = () => props([...f.system(), f.text('code', '取引先コード', { required: true, unique: true }), f.text('name', '取引先名'), f.text('tel', '電話番号')]);

/**
 * 業務アプリのフィールド設定。60〜100 フィールド（テーブル・ルックアップ・関連レコード一覧・計算を含む）。
 * variant: 'src'（反映元。全部入り）、'tgt'（反映先。一部が無い）、'empty'（ほぼ空）。
 */
function businessFields(variant, masterId = '301') {
  const fields = [...f.system()];
  const sections = [];
  const add = (...items) => { fields.push(...items); };
  add(f.group('basic', '基本情報'));
  add(f.text('customer', '顧客名', { required: true, maxLength: '64' }));
  add(f.text('cust_name', '取引先名'), f.text('cust_tel', '電話番号'));
  add(f.lookup('customer_code', '取引先コード', masterId, [{ field: 'cust_name', relatedField: 'name' }, { field: 'cust_tel', relatedField: 'tel' }]));
  add(f.number('amount', '金額', { unit: '円', unitPosition: 'AFTER', displayScale: '0', required: true }));
  add(f.number('tax_rate', '税率', { defaultValue: '10' }), f.number('shipping', '送料'));
  add(f.calc('total', '合計', 'amount * (1 + tax_rate / 100) + shipping'));
  add(f.choice('DROP_DOWN', 'status', 'ステータス', ['未対応', '対応中', '保留', '完了'], '未対応', { required: true }));
  add(f.choice('RADIO_BUTTON', 'priority', '優先度', ['緊急', '高', '中', '低'], '中'));
  add(f.choice('CHECK_BOX', 'tags', 'タグ', ['新規', '既存', '要注意'], ['新規']));
  add(f.date('due', '期限'), f.user('owner', '担当者'), f.memo('memo', '備考'), f.file('attach', '添付'));
  // 多数のテキスト・数値・選択肢（部署・手配・検収などの項目）
  for (let i = 1; i <= 24; i += 1) add(f.text(`item_text_${String(i).padStart(2, '0')}`, `項目テキスト${i}`));
  for (let i = 1; i <= 14; i += 1) add(f.number(`item_num_${String(i).padStart(2, '0')}`, `項目数値${i}`));
  for (let i = 1; i <= 8; i += 1) add(f.choice('DROP_DOWN', `item_sel_${String(i).padStart(2, '0')}`, `項目選択${i}`, ['A', 'B', 'C'], 'A'));
  add(f.calc('calc_sum', '数値合計', 'item_num_01 + item_num_02 + item_num_03'));
  add(f.table('items', [
    f.text('item_name', '品名'), f.number('qty', '数量'), f.number('unit_price', '単価'),
    f.calc('subtotal', '小計', 'qty * unit_price'), f.choice('DROP_DOWN', 'item_kind', '種別', ['物品', '役務'], '物品'),
    f.lookup('item_code', '品目コード', masterId, [{ field: 'item_name', relatedField: 'name' }])
  ]));
  add(f.table('visits', [f.date('visit_date', '訪問日'), f.text('visit_memo', '訪問メモ'), f.user('visitor', '訪問者')]));
  add(f.reference('rel', '取引先の関連レコード', masterId, 'customer_code'));
  const all = props(fields);
  if (variant === 'src') return all;
  if (variant === 'empty') return props([...f.system(), f.text('customer', '顧客名', { required: true, maxLength: '64' }), f.number('amount', '金額', { required: true })]);
  // tgt: 一部だけある（顧客名・金額・ステータスなど）。種類が違う同コードのフィールドも 1 つ含める。
  const keep = ['customer', 'cust_name', 'cust_tel', 'amount', 'tax_rate', 'status', 'due', 'memo', 'item_text_01', 'item_text_02', 'item_num_01', 'item_num_02', 'item_num_03'];
  const out = props([...f.system()]);
  for (const code of keep) out[code] = clone(all[code]);
  out.status.options = { 未対応: { label: '未対応', index: '0' }, 完了: { label: '完了', index: '1' } };
  out.status.defaultValue = '未対応';
  out.memo = f.text('memo', '備考'); // 反映元（MULTI_LINE_TEXT）とは種類が違う
  return out;
}

module.exports = { installSyntheticKintone, f, props, masterFields, businessFields, clone };
