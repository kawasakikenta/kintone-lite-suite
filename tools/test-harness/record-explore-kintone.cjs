'use strict';

// record-explore.cjs が使う、レコード操作用の合成 kintone。ページ内で動かすため、page.evaluate に関数として渡す。
// そのため、この関数は外側の変数を参照しない（関数の中だけで完結させる）。
//
// 実際の kintone に近い振る舞いにする。
//   - レコードの取得: records.json（$id シーク・order by・limit・offset の上限 10,000）、cursor API、条件式（= != > < >= <= in not in like、and / or、括弧）。
//   - レコードの追加（POST records.json）: 1 回 100 件まで。全件成功か全件取り消し（原子的）。必須・重複禁止・数値の範囲・文字数・日付/日時/時刻の形式・選択肢・存在しないユーザー・
//     書き込めないフィールドの種類・サブテーブルの新規行に id を含めたとき、をレコード・フィールドごとのエラー（errors: { 'records[3].amount.value': { messages } }）で拒否する。
//   - ステータスの更新（PUT records/status.json）: 1 回 100 件まで。revision の照合（GAIA_CO02）、現在の状態から実行できないアクション、次の作業者の指定が必要な遷移をエラーにする。全件成功か全件取り消し。
//   - ファイル本体（GET file.json）は window.fetch を差し替えて返す。403・遅延・失敗を設定できる。
//   - 書き込み・通信はすべて記録し、検査から読めるようにする（window.__k）。
function installRecordKintone(config) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const nativeSetTimeout = window.setTimeout.bind(window);
  const sleep = ms => new Promise(resolve => nativeSetTimeout(resolve, ms));
  const S = window.__k = {
    seq: 0, calls: [], writes: [], fetches: [], downloads: [], violations: [],
    latency: config.latency ?? 0, hangWrites: false, hangResolvers: [], failNext: [], dropResponseNext: 0,
    bumpBeforeStatus: [], apps: {}, users: new Set(config.users || ['tanaka', 'suzuki', 'reviewer', 'approver', 'sato']),
    orgs: new Set(config.orgs || ['sales', 'dev']), cursors: {}, fileBodies: {}, fileStatus: {}
  };
  const kerr = (code, message, extra = {}) => ({ code, id: `req-${++S.seq}`, message, ...extra });
  const invalid = errors => kerr('CB_VA01', '入力内容が正しくありません。', { errors });

  // ---- アプリの定義 ----------------------------------------------------
  const fieldDefaults = (code, def) => ({ code, label: def.label || code, noLabel: false, required: false, unique: false, ...def });
  for (const spec of config.apps) {
    const properties = {};
    for (const [code, def] of Object.entries(spec.fields)) {
      const prop = fieldDefaults(code, def);
      if (def.type === 'SUBTABLE') prop.fields = Object.fromEntries(Object.entries(def.fields).map(([c, d]) => [c, fieldDefaults(c, d)]));
      properties[code] = prop;
    }
    S.apps[String(spec.id)] = {
      id: String(spec.id), name: spec.name, properties, records: [], byId: new Map(), nextId: 1,
      process: spec.process || { enable: false, states: {}, actions: [] }, views: spec.views || {},
      comments: {}, strictUnique: true
    };
  }
  const allProps = app => {
    const map = new Map();
    for (const [code, def] of Object.entries(app.properties)) {
      map.set(code, def);
      if (def.type === 'SUBTABLE') for (const [c, d] of Object.entries(def.fields)) map.set(`${code}.${c}`, d);
    }
    return map;
  };
  const SYSTEM = new Set(['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CALC', 'CATEGORY', 'LABEL', 'HR', 'SPACER', 'GROUP', 'REFERENCE_TABLE']);
  const emptyValue = def => {
    switch (def.type) {
      case 'CHECK_BOX': case 'MULTI_SELECT': case 'USER_SELECT': case 'ORGANIZATION_SELECT': case 'GROUP_SELECT': case 'FILE': case 'SUBTABLE': case 'STATUS_ASSIGNEE': case 'CATEGORY': return [];
      case 'CREATOR': case 'MODIFIER': return { code: 'tanaka', name: '田中' };
      case 'CREATED_TIME': case 'UPDATED_TIME': return '2026-01-01T00:00:00Z';
      case 'DROP_DOWN': case 'RADIO_BUTTON': return def.defaultValue || (def.type === 'RADIO_BUTTON' ? (Object.keys(def.options || {})[0] || '') : null);
      default: return '';
    }
  };
  const makeRecord = (app, values, id) => {
    const record = {};
    for (const [code, def] of Object.entries(app.properties)) {
      if (['LABEL', 'HR', 'SPACER', 'GROUP', 'REFERENCE_TABLE'].includes(def.type)) continue;
      record[code] = { type: def.type, value: code in values ? values[code] : emptyValue(def) };
    }
    if (app.process.enable && record['ステータス'] && !values['ステータス']) {
      const first = Object.values(app.process.states).sort((a, b) => Number(a.index) - Number(b.index))[0];
      if (first) record['ステータス'].value = first.name;
    }
    record.$id = { type: '__ID__', value: String(id) };
    record.$revision = { type: '__REVISION__', value: '1' };
    return record;
  };
  const addRecord = (app, values) => {
    const id = app.nextId++;
    const record = makeRecord(app, values, id);
    app.records.push(record);
    app.byId.set(String(id), record);
    return record;
  };
  S.addRecord = (appId, values) => addRecord(S.apps[String(appId)], values);
  // 大量のレコード（10,000 件超の全件取得用）をページ内で作る。
  for (const bulk of config.bulk || []) {
    const app = S.apps[String(bulk.appId)];
    for (let i = 1; i <= bulk.count; i += 1) {
      const dup = bulk.dupEvery && i % bulk.dupEvery === 0 ? bulk.dupEvery : 0;
      addRecord(app, {
        title: `案件${dup ? 'D' + (Math.floor(i / bulk.dupEvery) % 5) : i}`,
        code: `C${String(i).padStart(6, '0')}`,
        amount: String(i % 1000),
        category: ['新規', '継続', '終了'][i % 3],
        tags: i % 7 === 0 ? [] : [['A', 'B', 'C'][i % 3]],
        ...(bulk.empty && i % bulk.empty === 0 ? { title: '' } : {})
      });
    }
  }
  for (const seed of config.records || []) addRecord(S.apps[String(seed.appId)], seed.values);
  for (const [key, file] of Object.entries(config.files || {})) { S.fileBodies[key] = file; if (file.status) S.fileStatus[key] = file.status; }

  // ---- 条件式 -----------------------------------------------------------
  const tokenize = text => {
    const tokens = [];
    const re = /\s*(?:("(?:[^"\\]|\\.)*")|(>=|<=|!=|=|>|<|\(|\)|,)|([^\s()=<>!,"]+))/gy;
    let m;
    while ((m = re.exec(text)) !== null && m[0] !== '') {
      if (m[1]) tokens.push({ t: 'str', v: JSON.parse(m[1]) });
      else if (m[2]) tokens.push({ t: 'op', v: m[2] });
      else tokens.push({ t: 'word', v: m[3] });
    }
    return tokens;
  };
  const valueText = field => {
    const v = field ? field.value : undefined;
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(item => (item && typeof item === 'object' ? (item.code ?? item.name ?? '') : String(item)));
    if (typeof v === 'object') return [String(v.code ?? v.name ?? '')];
    return [String(v)];
  };
  const compile = (app, text) => {
    const tokens = tokenize(text);
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];
    const isWord = (token, word) => token && token.t === 'word' && token.v.toLowerCase() === word;
    const parseOr = () => {
      let left = parseAnd();
      while (isWord(peek(), 'or')) { next(); const right = parseAnd(); const l = left; left = rec => l(rec) || right(rec); }
      return left;
    };
    const parseAnd = () => {
      let left = parsePrimary();
      while (isWord(peek(), 'and')) { next(); const right = parsePrimary(); const l = left; left = rec => l(rec) && right(rec); }
      return left;
    };
    const parsePrimary = () => {
      if (peek() && peek().t === 'op' && peek().v === '(') { next(); const inner = parseOr(); next(); return inner; }
      const field = next();
      if (!field) throw kerr('CB_IL02', '不正なクエリです。');
      let op = next();
      let negate = false;
      if (isWord(op, 'not')) { negate = true; op = next(); }
      const opName = String(op.v).toLowerCase();
      const readValues = () => {
        const out = [];
        if (peek() && peek().v === '(') { next(); while (peek() && peek().v !== ')') { const tk = next(); if (tk.v !== ',') out.push(String(tk.v)); } next(); } else out.push(String(next().v));
        return out;
      };
      const values = readValues();
      const code = field.v;
      const def = code === '$id' || code === '$revision' ? { type: 'NUMBER' } : (app.properties[code] || null);
      if (!def) throw kerr('GAIA_IQ11', `指定したフィールド（code: ${code}）が見つかりません。`);
      return rec => {
        const own = code === '$id' ? { value: rec.$id.value } : code === '$revision' ? { value: rec.$revision.value } : rec[code];
        const have = valueText(own);
        const numeric = def.type === 'NUMBER' || code === '$id' || code === '$revision' || def.type === 'RECORD_NUMBER';
        const cmp = (a, b) => (numeric ? Number(a) - Number(b) : (a < b ? -1 : a > b ? 1 : 0));
        let result;
        if (opName === 'in') result = have.some(v => values.includes(v));
        else if (opName === 'like') result = have.some(v => v.includes(values[0]));
        else if (opName === '=') result = have.length ? have.some(v => cmp(v, values[0]) === 0) : values[0] === '';
        else if (opName === '!=') result = !have.some(v => cmp(v, values[0]) === 0);
        else if (opName === '>') result = have.some(v => cmp(v, values[0]) > 0);
        else if (opName === '<') result = have.some(v => cmp(v, values[0]) < 0);
        else if (opName === '>=') result = have.some(v => cmp(v, values[0]) >= 0);
        else if (opName === '<=') result = have.some(v => cmp(v, values[0]) <= 0);
        else throw kerr('CB_IL02', `未対応の演算子: ${opName}`);
        return negate ? !result : result;
      };
    };
    const predicate = tokens.length ? parseOr() : () => true;
    return predicate;
  };
  const runQuery = (app, query, { forceLimit } = {}) => {
    let text = String(query || '').trim();
    let limit = forceLimit ?? 100;
    let offset = 0;
    let order = [];
    const offsetMatch = /\boffset\s+(\d+)\s*$/i.exec(text);
    if (offsetMatch) { offset = Number(offsetMatch[1]); text = text.slice(0, offsetMatch.index).trim(); }
    const lm = /\blimit\s+(\d+)\s*$/i.exec(text);
    if (lm) { limit = Number(lm[1]); text = text.slice(0, lm.index).trim(); }
    const om = /\border\s+by\s+(.+)$/i.exec(text);
    if (om) {
      order = om[1].split(',').map(part => { const [field, dir] = part.trim().split(/\s+/); return { field, desc: /desc/i.test(dir || '') }; });
      text = text.slice(0, om.index).trim();
    }
    if (limit > 500) throw invalid({ limit: { messages: ['limit は 500 以下で指定してください。'] } });
    if (offset > 10000) throw kerr('GAIA_IQ??', 'offset は 10000 以下で指定してください。');
    const predicate = compile(app, text);
    const matched = app.records.filter(predicate);
    if (order.length) {
      matched.sort((a, b) => {
        for (const { field, desc } of order) {
          const av = field === '$id' ? Number(a.$id.value) : valueText(a[field])[0] ?? '';
          const bv = field === '$id' ? Number(b.$id.value) : valueText(b[field])[0] ?? '';
          const numeric = field === '$id' || app.properties[field]?.type === 'NUMBER';
          const d = numeric ? Number(av) - Number(bv) : (av < bv ? -1 : av > bv ? 1 : 0);
          if (d) return desc ? -d : d;
        }
        return 0;
      });
    }
    return { matched, window: matched.slice(offset, offset + limit) };
  };
  const project = (record, fields) => {
    if (!fields || !fields.length) return clone(record);
    const out = {};
    for (const code of fields) if (record[code]) out[code] = clone(record[code]);
    return out;
  };

  // ---- 検証（kintone の拒否を再現する） ------------------------------------
  const isDate = text => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  };
  const isDateTime = text => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(text) && isDate(text.slice(0, 10)) && +text.slice(11, 13) < 24 && +text.slice(14, 16) < 60;
  const validateField = (def, field, path, errors, ctx) => {
    const add = message => { (errors[`${path}.value`] = errors[`${path}.value`] || { messages: [] }).messages.push(message); };
    if (!field || typeof field !== 'object' || !('value' in field)) { add('value が必要です。'); return; }
    const value = field.value;
    const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (SYSTEM.has(def.type) && def.type !== 'CALC') { add('このフィールドには値を設定できません。'); return; }
    if (def.type === 'CALC') { add('計算フィールドには値を設定できません。'); return; }
    if (def.required && empty) { add('必須です。'); return; }
    if (empty) return;
    switch (def.type) {
      case 'SINGLE_LINE_TEXT': case 'MULTI_LINE_TEXT': case 'LINK': case 'RICH_TEXT': {
        if (typeof value !== 'string') { add('文字列で指定してください。'); break; }
        if (def.maxLength && Array.from(value).length > Number(def.maxLength)) add(`${def.maxLength}文字以内で入力してください。`);
        if (def.minLength && Array.from(value).length < Number(def.minLength)) add(`${def.minLength}文字以上で入力してください。`);
        if (def.type === 'LINK' && def.protocol === 'WEB' && !/^https?:\/\/\S+$/.test(value)) add('URL の形式が正しくありません。');
        break;
      }
      case 'NUMBER': {
        if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value)) { add('数値で入力してください。'); break; }
        if (def.minValue !== undefined && def.minValue !== '' && Number(value) < Number(def.minValue)) add(`${def.minValue}以上の値を入力してください。`);
        if (def.maxValue !== undefined && def.maxValue !== '' && Number(value) > Number(def.maxValue)) add(`${def.maxValue}以下の値を入力してください。`);
        break;
      }
      case 'DATE': if (typeof value !== 'string' || !isDate(value)) add('日付の形式が正しくありません。'); break;
      case 'DATETIME': if (typeof value !== 'string' || !isDateTime(value)) add('日時の形式が正しくありません。'); break;
      case 'TIME': if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) add('時刻の形式が正しくありません。'); break;
      case 'DROP_DOWN': case 'RADIO_BUTTON': if (!(value in (def.options || {}))) add(`存在しない選択肢です: ${value}`); break;
      case 'CHECK_BOX': case 'MULTI_SELECT': {
        if (!Array.isArray(value)) { add('配列で指定してください。'); break; }
        for (const item of value) if (!(item in (def.options || {}))) add(`存在しない選択肢です: ${item}`);
        break;
      }
      case 'USER_SELECT': case 'ORGANIZATION_SELECT': {
        if (!Array.isArray(value)) { add('配列で指定してください。'); break; }
        const known = def.type === 'USER_SELECT' ? S.users : S.orgs;
        for (const item of value) if (!item || !known.has(item.code)) add(`存在しないコードです: ${item && item.code}`);
        break;
      }
      case 'FILE': add('ファイルフィールドには fileKey を指定してください。'); break;
      case 'SUBTABLE': {
        if (!Array.isArray(value)) { add('配列で指定してください。'); break; }
        value.forEach((row, rowIndex) => {
          if (row && 'id' in row && ctx.creating) { (errors[`${path}.value[${rowIndex}].id`] = { messages: ['新規行に id は指定できません。'] }); }
          for (const [childCode, child] of Object.entries((row && row.value) || {})) {
            const childDef = def.fields[childCode];
            if (!childDef) { errors[`${path}.value[${rowIndex}].value.${childCode}`] = { messages: ['フィールドが存在しません。'] }; continue; }
            validateField(childDef, child, `${path}.value[${rowIndex}].value.${childCode}`, errors, ctx);
          }
          for (const [childCode, childDef] of Object.entries(def.fields)) {
            if (childDef.required && !((row && row.value && childCode in row.value) && row.value[childCode].value !== '')) errors[`${path}.value[${rowIndex}].value.${childCode}.value`] = { messages: ['必須です。'] };
          }
        });
        break;
      }
      default: break;
    }
  };
  const validateRecord = (app, recordIndex, values, errors, pendingUnique, ctx) => {
    for (const [code, field] of Object.entries(values)) {
      const def = app.properties[code];
      if (!def) { errors[`records[${recordIndex}].${code}`] = { messages: ['フィールドが存在しません。'] }; continue; }
      validateField(def, field, `records[${recordIndex}].${code}`, errors, ctx);
    }
    for (const [code, def] of Object.entries(app.properties)) {
      if (def.required && !SYSTEM.has(def.type) && !(code in values) && !def.defaultValue && def.type !== 'RADIO_BUTTON') {
        const empty = def.type === 'CHECK_BOX' || def.type === 'MULTI_SELECT' || def.type === 'USER_SELECT' || def.type === 'ORGANIZATION_SELECT';
        void empty;
        errors[`records[${recordIndex}].${code}.value`] = { messages: ['必須です。'] };
      }
      if (def.unique && values[code] && values[code].value) {
        const text = String(values[code].value);
        const clash = app.records.some(rec => rec[code] && rec[code].value === text) || pendingUnique[code]?.has(text);
        if (clash) (errors[`records[${recordIndex}].${code}.value`] = errors[`records[${recordIndex}].${code}.value`] || { messages: [] }).messages.push('値がほかのレコードと重複しています。');
        (pendingUnique[code] = pendingUnique[code] || new Set()).add(text);
      }
    }
  };

  // ---- ステータス更新 ---------------------------------------------------
  const statusUpdate = (app, items) => {
    const process = app.process;
    if (!process.enable) throw kerr('GAIA_PR01', 'プロセス管理が有効ではありません。');
    const errors = {};
    const plans = [];
    items.forEach((item, index) => {
      const record = app.byId.get(String(item.id));
      if (!record) { errors[`records[${index}].id`] = { messages: ['指定したレコードが見つかりません。'] }; return; }
      if (item.revision !== undefined && item.revision !== null && String(item.revision) !== '-1' && String(item.revision) !== record.$revision.value) {
        throw kerr('GAIA_CO02', '指定したrevisionは最新ではありません。', { status: 409 });
      }
      const current = record['ステータス'].value;
      const matching = process.actions.filter(a => a.name === item.action && a.from === current);
      if (matching.length > 1) { errors[`records[${index}].action`] = { messages: [`アクション名「${item.action}」が重複しているため指定できません。`] }; return; }
      const action = matching[0];
      if (!action) { errors[`records[${index}].action`] = { messages: [`アクション「${item.action}」は現在のステータス「${current}」から実行できません。`] }; return; }
      if (action.filterCond && !compile(app, action.filterCond)(record)) { errors[`records[${index}].action`] = { messages: [`アクション「${item.action}」の実行条件を満たしていません。`] }; return; }
      const next = process.states[action.to];
      const candidates = (next && next.assignee && next.assignee.entities) || [];
      const mode = next && next.assignee && next.assignee.type;
      if (mode === 'ONE' && candidates.length > 1 && !item.assignee) { errors[`records[${index}].assignee`] = { messages: ['次の作業者を指定してください。'] }; return; }
      if (item.assignee && !S.users.has(item.assignee)) { errors[`records[${index}].assignee`] = { messages: [`存在しないユーザーです: ${item.assignee}`] }; return; }
      plans.push({ record, action, assignee: item.assignee || (candidates[0] && candidates[0].entity.code) || null });
    });
    if (Object.keys(errors).length) throw invalid(errors);
    return plans.map(({ record, action, assignee }) => {
      record['ステータス'].value = action.to;
      record['作業者'].value = assignee ? [{ code: assignee, name: assignee }] : [];
      record.$revision.value = String(Number(record.$revision.value) + 1);
      return { id: record.$id.value, revision: record.$revision.value };
    });
  };

  // ---- kintone.api ------------------------------------------------------
  const route = async (rawUrl, method, params) => {
    const url = String(rawUrl).replace(/^\/k(\/guest\/\d+)?\/v1/, '');
    const appOf = id => {
      const app = S.apps[String(id)];
      if (!app) throw kerr('GAIA_AP01', `指定したアプリ（id: ${id}）が見つかりません。`, { status: 404 });
      return app;
    };
    if (method === 'GET') {
      if (url === '/app/form/fields.json') return { properties: clone(appOf(params.app).properties), revision: '5' };
      if (url === '/app/status.json') return clone({ ...appOf(params.app).process, revision: '3' });
      if (url === '/app/views.json') return { views: clone(appOf(params.app).views), revision: '2' };
      if (url === '/app.json') return { appId: String(params.id), name: appOf(params.id).name };
      if (url === '/records.json') {
        const app = appOf(params.app);
        const { window: rows } = runQuery(app, params.query);
        return { records: rows.map(rec => project(rec, params.fields)) };
      }
      if (url === '/records/cursor.json') {
        const cursor = S.cursors[params.id];
        if (!cursor) throw kerr('GAIA_RE01', 'カーソルが見つかりません。');
        const part = cursor.rows.splice(0, cursor.size);
        if (!cursor.rows.length) delete S.cursors[params.id];
        return { records: part, next: cursor.rows.length > 0 };
      }
      if (url === '/record/comments.json') {
        const list = appOf(params.app).comments[String(params.record)] || [];
        const ordered = params.order === 'desc' ? [...list].reverse() : list;
        const slice = ordered.slice(Number(params.offset || 0), Number(params.offset || 0) + Number(params.limit || 10));
        return { comments: clone(slice), older: false, newer: false };
      }
      throw kerr('GAIA_UN00', `想定外の GET: ${url}`);
    }
    // ---- 書き込み ----
    const body = clone(params || {});
    const entry = { seq: ++S.seq, method, path: url, body, at: Date.now() };
    S.writes.push(entry);
    if (url === '/records/cursor.json' && method === 'POST') {
      const app = appOf(body.app);
      const { matched } = runQuery(app, body.query, { forceLimit: 500 });
      if (Object.keys(S.cursors).length >= 10) throw kerr('GAIA_RE04', 'カーソルが上限に達しています。');
      const id = `cursor-${S.seq}`;
      S.cursors[id] = { rows: matched.map(rec => project(rec, body.fields)), size: body.size || 100, app: String(body.app) };
      return { id, totalCount: matched.length };
    }
    if (url === '/records/cursor.json' && method === 'DELETE') { delete S.cursors[body.id]; return {}; }
    if (url === '/records.json' && method === 'POST') {
      const app = appOf(body.app);
      if (!Array.isArray(body.records) || body.records.length === 0) throw invalid({ records: { messages: ['records は必須です。'] } });
      if (body.records.length > 100) throw invalid({ records: { messages: ['1 回に登録できるレコードは 100 件までです。'] } });
      entry.rejected = false;
      const errors = {};
      const pendingUnique = {};
      body.records.forEach((values, index) => validateRecord(app, index, values, errors, pendingUnique, { creating: true }));
      if (Object.keys(errors).length) { entry.rejected = true; throw invalid(errors); }
      const created = body.records.map(values => addRecord(app, Object.fromEntries(Object.entries(values).map(([code, field]) => [code, (field.value === '' && ['DROP_DOWN', 'RADIO_BUTTON'].includes(app.properties[code].type)) ? null : field.value]))));
      entry.createdIds = created.map(rec => rec.$id.value);
      return { ids: created.map(rec => rec.$id.value), revisions: created.map(() => '1') };
    }
    if (url === '/records/status.json' && method === 'PUT') {
      const app = appOf(body.app);
      if (!Array.isArray(body.records) || body.records.length === 0) throw invalid({ records: { messages: ['records は必須です。'] } });
      if (body.records.length > 100) throw invalid({ records: { messages: ['1 回に更新できるレコードは 100 件までです。'] } });
      // 取得後に別の利用者が更新した状況を作る（検査から S.bumpBeforeStatus = [id, …] を設定する）
      for (const id of S.bumpBeforeStatus || []) { const rec = app.byId.get(String(id)); if (rec) rec.$revision.value = String(Number(rec.$revision.value) + 1); }
      S.bumpBeforeStatus = [];
      try { const out = statusUpdate(app, body.records); entry.updated = out.map(item => item.id); return { records: out }; } catch (error) { entry.rejected = true; throw error; }
    }
    S.violations.push(`想定外の書き込み: ${method} ${url}`);
    throw kerr('GAIA_UN00', `想定外の書き込み: ${method} ${url}`);
  };

  window.kintone = {
    app: { getId: () => Number(config.currentApp || 101) },
    api: Object.assign(async (url, method = 'GET', params = {}) => {
      const seq = ++S.seq;
      S.calls.push({ seq, url: String(url), method, at: Date.now() });
      if (S.latency) await sleep(S.latency);
      if (method !== 'GET' && S.hangWrites) {
        S.writes.push({ seq, method, path: String(url).replace(/^\/k(\/guest\/\d+)?\/v1/, ''), body: clone(params), hung: true, at: Date.now() });
        return new Promise(resolve => S.hangResolvers.push(resolve));
      }
      const failure = method !== 'GET' ? S.failNext.find(f => !f.match || new RegExp(f.match).test(String(url))) : null;
      if (failure) {
        S.failNext.splice(S.failNext.indexOf(failure), 1);
        S.writes.push({ seq, method, path: String(url).replace(/^\/k(\/guest\/\d+)?\/v1/, ''), body: clone(params), injectedFailure: failure.kind, at: Date.now() });
        if (failure.kind === 'network-after-commit') {
          // サーバー側では確定したが、応答が届かなかった（通信エラー）。
          await route(url, method, params);
          const error = new Error('Network Error');
          error.code = 'NETWORK';
          throw error;
        }
        if (failure.kind === 'network-before-commit') { const error = new Error('Network Error'); error.code = 'NETWORK'; throw error; }
        throw kerr('GAIA_UN99', 'サーバーエラーです。', { status: 500 });
      }
      return route(url, method, params);
    }, { url: value => value })
  };
  S.release = () => { S.hangWrites = false; S.hangResolvers.splice(0).forEach(resolve => resolve({})); };

  // ---- ファイル本体 -----------------------------------------------------
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(typeof input === 'string' ? input : input.url);
    const match = /\/k\/(?:guest\/\d+\/)?v1\/file\.json\?fileKey=([^&]+)/.exec(url);
    if (!match) return nativeFetch(input, init);
    const key = decodeURIComponent(match[1]);
    S.fetches.push({ seq: ++S.seq, key, at: Date.now() });
    if (S.latency) await sleep(S.latency);
    if (init && init.signal && init.signal.aborted) throw new DOMException('aborted', 'AbortError');
    const file = S.fileBodies[key];
    const status = S.fileStatus[key] || (file ? 200 : 404);
    if (status !== 200) return new Response('', { status });
    return new Response(new Blob([file.text !== undefined ? file.text : `body-of-${key}`]), { status: 200 });
  };

  // ---- ダウンロードの記録（ブラウザに保存せず、Blob を検査に渡す） ------------
  const createObjectURL = URL.createObjectURL.bind(URL);
  const blobs = new Map();
  URL.createObjectURL = blob => { const url = createObjectURL(blob); blobs.set(url, blob); return url; };
  document.addEventListener('click', event => {
    const anchor = event.target && event.target.closest && event.target.closest('a[download]');
    if (!anchor) return;
    event.preventDefault();
    S.downloads.push({ seq: ++S.seq, name: anchor.download, blob: blobs.get(anchor.href), at: Date.now() });
  }, true);
}

module.exports = { installRecordKintone };
