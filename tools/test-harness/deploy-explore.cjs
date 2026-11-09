#!/usr/bin/env node
'use strict';

// 本番反映（tools/本番反映.js）の通し検証。配布物をそのままページに読み込み（esbuild で作り直さない）、
// window.kintone.api と window.fetch を、状態を持つ合成 kintone に差し替えて、利用者と同じ操作で確かめる。
// 画面の表示と、合成 kintone が受け取った送信内容の両方を確認する。実際の kintone には通信しない。
//
// 合成 kintone は実際の kintone に近い振る舞いにする。
//   - アプリ単位の revision（本番・プレビュー別。プレビューへの書き込みで +1、公開で本番 = プレビュー）。書き込みの revision 照合は GAIA_CO02。
//   - POST /preview/app/deploy.json は非同期（PROCESSING → SUCCESS / FAIL / CANCEL。まとめて依頼して 1 件 FAIL なら全件 CANCEL）。反映処理中の書き込みはエラー。
//   - フィールドの種類の変更、選択肢に無い初期値、存在しないフィールドを参照する一覧・レイアウト・計算式などは、kintone と同じようにエラー。
//
// 直した問題は通常の検査（失敗させるもの）にしてある。まだ直していない製品の不具合・使いにくさ・文言の問題だけを「既知の問題（findings）」として記録する。
// 既知の問題は失敗させずに一覧で出し（severity が critical のものだけ失敗にする）、.iter-shots/deploy-explore/results.json に保存する。
// 画面は同じディレクトリのスクリーンショットに保存する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const TOOL_FILE = path.join(ROOT, 'tools/本番反映.js');
const OUT = path.join(ROOT, '.iter-shots/deploy-explore');

function printHelp() {
  console.log(`Usage: node tools/test-harness/deploy-explore.cjs [options]

本番反映（tools/本番反映.js をそのまま読み込み）を、状態を持つ合成 kintone につないで、利用者と同じ操作で通しに検証します。
実際の kintone には通信しません。

Options:
  --browser <name>      chrome または chromium（既定: chrome）
  --executable <path>   ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --only <text>         名前に <text> を含むシナリオだけ実行します（例: --only scale）
  --skip-scale          規模のシナリオ（1000 アプリなど、時間がかかるもの）を省きます
  --help                このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/deploy-explore/（results.json に計測値と既知の問題）`);
}

const argValue = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);

// ---------------------------------------------------------------------------
// 合成 kintone（ページ内で動く）。page.evaluate に関数として渡すため、外側の変数は参照しない。
// ---------------------------------------------------------------------------
function installSyntheticKintone(config) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const nativeSetTimeout = window.setTimeout.bind(window);
  const sleep = ms => new Promise(resolve => nativeSetTimeout(resolve, ms));

  // 比較項目（セクション）と API の対応
  const ENDPOINTS = {
    '/app/settings.json': 'appSettings', '/app/form/fields.json': 'fieldSettings', '/app/form/layout.json': 'layoutSettings',
    '/app/views.json': 'viewSettings', '/app/reports.json': 'reportSettings', '/app/status.json': 'processSettings',
    '/app/plugins.json': 'pluginSettings', '/app/customize.json': 'customizeSettings', '/app/actions.json': 'actionSettings',
    '/app/acl.json': 'appAcl', '/field/acl.json': 'fieldAcl', '/record/acl.json': 'recordPermissions',
    '/app/notifications/general.json': 'notifications', '/app/notifications/perRecord.json': 'perRecordNotifications',
    '/app/notifications/reminder.json': 'reminderNotifications', '/app/categories.json': 'categories'
  };
  const SYSTEM_TYPES = ['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CATEGORY'];

  const defaultSections = name => ({
    appSettings: { name, description: '', icon: { type: 'PRESET', key: 'APP01' }, theme: 'WHITE', titleField: { selectionMode: 'AUTO' }, enableThumbnails: true, enableBulkDeletion: true, enableComments: true, enableDuplicateRecord: true, enableInlineRecordEditing: true, numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '1' },
    fieldSettings: { properties: {} }, layoutSettings: { layout: [] }, viewSettings: { views: {} }, reportSettings: { reports: {} },
    processSettings: { enable: false, states: {}, actions: [] }, pluginSettings: { plugins: [] },
    customizeSettings: { scope: 'ALL', desktop: { js: [], css: [] }, mobile: { js: [], css: [] } },
    actionSettings: { actions: {} }, appAcl: { rights: [] }, fieldAcl: { rights: [] }, recordPermissions: { rights: [] },
    notifications: { notifications: [], notifyToCommenter: false }, perRecordNotifications: { notifications: [] },
    reminderNotifications: { notifications: [], timezone: 'Asia/Tokyo' }, categories: { enabled: false, categories: {} }
  });

  const S = window.__k = {
    seq: 0, t0: Date.now(), latency: config.latency ?? 5, processMs: config.processMs ?? 25,
    calls: [], writes: [], deploys: [], violations: [], downloads: [], uploads: [], fileFetches: [], statusGets: 0,
    files: clone(config.files || {}), uploadKeys: new Set(), fileNames: {}, consumedKeys: {}, hold: false, holdWrites: false, heldWrites: 0, writeResolvers: [],
    failApps: new Set((config.failApps || []).map(String)), rejectDeploy: config.rejectDeploy || {},
    writableApps: new Set((config.writableApps || ['202']).map(String)), apps: {}, installedPlugins: config.installedPlugins || ['plugin-calendar', 'plugin-chart', 'plugin-extra'],
    failWrites: config.failWrites || {}, bumpAfterWrite: null
  };

  // ---- エラー ----------------------------------------------------------
  const kerr = (code, message, extra = {}) => Object.assign(new Error(message), { code, id: `req-${S.seq}`, ...extra });
  const invalid = (path, message) => kerr('CB_VA01', '入力内容が正しくありません。', { errors: { [path]: { messages: [message] } } });
  const noField = code => kerr('GAIA_FC01', `指定したフィールド（code: ${code}）が見つかりません。`);
  const violation = message => { S.violations.push(message); return new Error(message); };

  // ---- アプリ ----------------------------------------------------------
  for (const def of config.apps) {
    const base = defaultSections(def.name);
    S.apps[String(def.id)] = {
      id: String(def.id), guest: def.guest || '', name: def.name, code: def.code || `app${def.id}`, spaceId: def.spaceId || null,
      prodRev: Number(def.prodRevision ?? 5), previewRev: Number(def.previewRevision ?? def.prodRevision ?? 5),
      prod: Object.assign(base, clone(def.shared || {}), clone(def.production || {})),
      preview: Object.assign(clone(base), clone(def.shared || {}), clone(def.preview || def.production || {})),
      group: null, status: null, deniedPreview: !!def.deniedPreview
    };
  }
  // 大量のアプリ（1000 件の確認・反映の計測用）。ページ内で組み立てて、受け渡しの負荷を避ける。
  if (config.bulk) {
    const { count, startId, changedEvery = 1, namePrefix = '一括アプリ' } = config.bulk;
    const textField = (code, label) => ({ type: 'SINGLE_LINE_TEXT', code, label, noLabel: false, required: false, unique: false, maxLength: '', minLength: '', defaultValue: '', expression: '', hideExpression: false });
    for (let i = 0; i < count; i += 1) {
      const id = String(startId + i);
      const name = `${namePrefix}${i + 1}`;
      const sections = defaultSections(name);
      sections.fieldSettings = { properties: { name: textField('name', '名前'), memo: textField('memo', '備考') } };
      sections.layoutSettings = { layout: [{ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'name', size: { width: '200' } }] }] };
      const changed = i % changedEvery === 0;
      const preview = clone(sections);
      if (changed) preview.fieldSettings.properties[`added_${id}`] = textField(`added_${id}`, '追加項目');
      S.apps[id] = { id, guest: '', name, code: `bulk${id}`, spaceId: null, prodRev: 10, previewRev: changed ? 12 : 10, prod: sections, preview, group: null, status: null, deniedPreview: false };
    }
  }
  S.bumpPreview = (id, mutate) => {
    const app = S.apps[String(id)];
    app.previewRev += 1;
    if (mutate) mutate(app.preview);
    else app.preview.fieldSettings.properties.late_added = { type: 'SINGLE_LINE_TEXT', code: 'late_added', label: '後から追加', noLabel: false, required: false, unique: false, maxLength: '', minLength: '', defaultValue: '', expression: '', hideExpression: false };
  };
  // 別の利用者・前回の依頼による「反映処理中」を作る（release / finishProcessing まで終わらない）。
  S.startProcessing = ids => {
    const group = { ids: ids.map(String), revert: false, finishAt: Number.POSITIVE_INFINITY, done: false };
    for (const id of group.ids) { S.apps[id].group = group; S.apps[id].status = 'PROCESSING'; }
  };
  S.finishProcessing = ids => {
    for (const id of ids.map(String)) {
      const app = S.apps[id];
      if (!app.group || app.group.done) continue;
      app.group.finishAt = Date.now() - 1;
      for (const other of app.group.ids) S.apps[other].group = app.group;
    }
    settle();
  };
  S.release = () => { S.hold = false; S.holdWrites = false; S.writeResolvers.splice(0).forEach(resolve => resolve()); };

  const allCodes = props => {
    const set = new Map();
    for (const [code, def] of Object.entries(props)) { set.set(code, def); if (def.type === 'SUBTABLE') for (const [child, childDef] of Object.entries(def.fields || {})) set.set(child, childDef); }
    return set;
  };

  // ---- 検証 ------------------------------------------------------------
  const FUNCTIONS = new Set(['SUM', 'IF', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'AND', 'OR', 'NOT', 'MAX', 'MIN', 'DATE_FORMAT', 'YEN', 'AVG', 'COUNT', 'TRUE', 'FALSE']);
  function validateOptions(path, def) {
    const options = def.options;
    if (!options || typeof options !== 'object' || !Object.keys(options).length) throw invalid(`${path}.options`, '選択肢を1つ以上指定してください。');
    const indexes = new Set();
    for (const [key, option] of Object.entries(options)) {
      if (!option || option.label !== key) throw invalid(`${path}.options[${key}].label`, '選択肢のキーとlabelを一致させてください。');
      if (!/^\d+$/.test(String(option.index))) throw invalid(`${path}.options[${key}].index`, 'indexは0以上の整数を文字列で指定してください。');
      if (indexes.has(String(option.index))) throw invalid(`${path}.options[${key}].index`, 'indexが重複しています。');
      indexes.add(String(option.index));
    }
    const dv = def.defaultValue;
    if (def.type === 'DROP_DOWN' || def.type === 'RADIO_BUTTON') {
      if (def.type === 'RADIO_BUTTON' && (dv === undefined || dv === '')) throw invalid(`${path}.defaultValue`, '初期値は必須です。');
      if (dv !== undefined && dv !== '' && !Object.prototype.hasOwnProperty.call(options, dv)) throw invalid(`${path}.defaultValue`, `初期値「${dv}」は選択肢にありません。`);
    } else if (Array.isArray(dv)) {
      for (const value of dv) if (!Object.prototype.hasOwnProperty.call(options, value)) throw invalid(`${path}.defaultValue`, `初期値「${value}」は選択肢にありません。`);
    }
  }
  function validateField(path, def, form, selfCode) {
    if (!def || typeof def.type !== 'string') throw invalid(`${path}.type`, 'フィールドタイプを指定してください。');
    if (['DROP_DOWN', 'RADIO_BUTTON', 'CHECK_BOX', 'MULTI_SELECT'].includes(def.type)) validateOptions(path, def);
    if (def.type === 'NUMBER' && def.minValue !== undefined && def.maxValue !== undefined && def.minValue !== '' && def.maxValue !== '' && Number(def.minValue) > Number(def.maxValue)) throw invalid(`${path}.minValue`, '最小値は最大値以下にしてください。');
    if (def.type === 'CALC') {
      if (typeof def.expression !== 'string' || !def.expression) throw invalid(`${path}.expression`, '計算式を指定してください。');
      const tokens = def.expression.match(/[\p{L}_][\p{L}\p{N}_]*/gu) || [];
      for (const token of tokens) {
        if (FUNCTIONS.has(token.toUpperCase())) continue;
        if (!form.has(token) || token === selfCode) throw invalid(`${path}.expression`, `計算式で使われているフィールド「${token}」が見つかりません。`);
      }
    }
    if (def.lookup) {
      const lookup = def.lookup;
      if (!lookup.relatedApp?.app && !lookup.relatedApp?.code) throw invalid(`${path}.lookup.relatedApp`, '参照するアプリを指定してください。');
      if (lookup.relatedApp.app && !S.apps[String(lookup.relatedApp.app)]) throw kerr('GAIA_AP01', `指定したアプリ（id: ${lookup.relatedApp.app}）が見つかりません。`);
      if (!lookup.relatedKeyField) throw invalid(`${path}.lookup.relatedKeyField`, 'キーとなるフィールドを指定してください。');
      for (const mapping of lookup.fieldMappings || []) if (!form.has(mapping.field)) throw invalid(`${path}.lookup.fieldMappings`, `コピー先フィールド「${mapping.field}」が見つかりません。`);
    }
    if (def.type === 'REFERENCE_TABLE') {
      const ref = def.referenceTable;
      if (!ref?.relatedApp || (ref.relatedApp.app && !S.apps[String(ref.relatedApp.app)])) throw kerr('GAIA_AP01', `指定したアプリ（id: ${ref?.relatedApp?.app}）が見つかりません。`);
      if (!form.has(ref.condition?.field)) throw invalid(`${path}.referenceTable.condition.field`, `フィールド「${ref.condition?.field}」が見つかりません。`);
    }
  }
  const LAYOUT_NO_CODE = ['LABEL', 'SPACER', 'HR'];
  function walkLayout(nodes, visit) {
    for (const node of nodes) {
      visit(node);
      if (Array.isArray(node.fields)) walkLayout(node.fields, visit);
      if (Array.isArray(node.layout)) walkLayout(node.layout, visit);
    }
  }
  const fieldRefsInQuery = (text, form, where) => {
    // 「code 演算子」の形の先頭の識別子を確かめる（括弧・文字列・関数は除く）
    const stripped = String(text || '').replace(/"[^"]*"/g, '""');
    const pattern = /(?:^|\band\b|\bor\b|\()\s*([\p{L}_][\p{L}\p{N}_]*)\s*(?:=|!=|<=|>=|<|>|\bnot in\b|\bin\b|\bnot like\b|\blike\b|\bis\b)/giu;
    let match;
    while ((match = pattern.exec(stripped))) if (!form.has(match[1]) && !['LOGIN_USER', 'PRIMARY_ORGANIZATION'].includes(match[1])) throw noField(`${match[1]}（${where}）`);
  };
  const sortRefs = (text, form, where) => {
    for (const part of String(text || '').split(',').map(item => item.trim()).filter(Boolean)) {
      const code = part.split(/\s+/)[0];
      if (!['$id', '$revision', '更新日時', '作成日時'].includes(code) && !form.has(code)) throw noField(`${code}（${where}）`);
    }
  };

  // 書き込みの検証と適用。preview は書き込み先のプレビュー、next は適用後（失敗したら捨てる）。
  const writers = {
    fieldSettings(next, method, body) {
      const props = clone(body.properties || {});
      if (!body.properties || typeof body.properties !== 'object') throw invalid('properties', 'propertiesを指定してください。');
      const current = next.fieldSettings.properties;
      const staged = clone(current);
      for (const [code, def] of Object.entries(props)) {
        if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(code)) throw invalid(`properties.${code}`, 'フィールドコードに使用できない文字が含まれています。');
        if (def.code !== undefined && def.code !== code) throw invalid(`properties.${code}.code`, 'キーとcodeが一致しません。');
        if (method === 'POST') {
          if (allCodes(staged).has(code) && !(staged[code]?.type === 'SUBTABLE' && def.type === 'SUBTABLE')) throw kerr('GAIA_FC03', `フィールドコード「${code}」は既に使用されています。`);
          if (def.type === 'SUBTABLE' && staged[code]) {
            for (const [child, childDef] of Object.entries(def.fields || {})) {
              if (allCodes(staged).has(child)) throw kerr('GAIA_FC03', `フィールドコード「${child}」は既に使用されています。`);
              staged[code].fields[child] = childDef;
            }
          } else staged[code] = def;
        } else {
          const top = staged[code];
          if (!top) throw noField(code);
          if (def.type !== undefined && def.type !== top.type) throw invalid(`properties.${code}.type`, `フィールドタイプは変更できません（${top.type} → ${def.type}）。`);
          if (top.type === 'SUBTABLE' && def.fields) {
            for (const [child, childDef] of Object.entries(def.fields)) {
              if (!top.fields[child]) throw noField(child);
              if (childDef.type !== undefined && childDef.type !== top.fields[child].type) throw invalid(`properties.${code}.fields.${child}.type`, `フィールドタイプは変更できません（${top.fields[child].type} → ${childDef.type}）。`);
              top.fields[child] = { ...top.fields[child], ...childDef };
            }
            const { fields: _fields, ...rest } = def;
            staged[code] = { ...top, ...rest, fields: top.fields };
          } else staged[code] = { ...top, ...def };
        }
      }
      const form = allCodes(staged);
      for (const [code, def] of Object.entries(staged)) {
        validateField(`properties.${code}`, def, form, code);
        if (def.type === 'SUBTABLE') for (const [child, childDef] of Object.entries(def.fields)) validateField(`properties.${code}.fields.${child}`, childDef, form, child);
      }
      next.fieldSettings.properties = staged;
    },
    layoutSettings(next, method, body) {
      if (!Array.isArray(body.layout)) throw invalid('layout', 'layoutを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      const seen = new Set();
      walkLayout(body.layout, node => {
        if (!node.code || LAYOUT_NO_CODE.includes(node.type)) return;
        if (!form.has(node.code)) throw noField(`${node.code}（レイアウト）`);
        if (node.type !== form.get(node.code).type && node.type !== 'GROUP' && node.type !== 'SUBTABLE') throw invalid(`layout.${node.code}.type`, `フィールドタイプが一致しません（${node.code}）。`);
        if (seen.has(node.code)) throw invalid(`layout.${node.code}`, `フィールド「${node.code}」がレイアウトに重複しています。`);
        seen.add(node.code);
      });
      next.layoutSettings = { layout: clone(body.layout) };
    },
    viewSettings(next, method, body) {
      if (!body.views || typeof body.views !== 'object') throw invalid('views', 'viewsを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      const indexes = new Set();
      for (const [name, view] of Object.entries(body.views)) {
        if (!['LIST', 'CALENDAR', 'CUSTOM'].includes(view.type)) throw invalid(`views.${name}.type`, '一覧の種類が正しくありません。');
        if (!/^\d+$/.test(String(view.index)) || indexes.has(String(view.index))) throw invalid(`views.${name}.index`, 'indexが不正、または重複しています。');
        indexes.add(String(view.index));
        if (view.type === 'LIST') for (const code of view.fields || []) if (!['$id'].includes(code) && !form.has(code)) throw noField(`${code}（一覧「${name}」）`);
        if (view.type === 'CALENDAR') for (const code of [view.date, view.title]) if (code && !form.has(code)) throw noField(`${code}（一覧「${name}」）`);
        if (view.type === 'CUSTOM' && typeof view.html !== 'string') throw invalid(`views.${name}.html`, 'htmlを指定してください。');
        fieldRefsInQuery(view.filterCond, form, `一覧「${name}」の絞り込み`);
        sortRefs(view.sort, form, `一覧「${name}」の並び順`);
      }
      next.viewSettings = { views: clone(body.views) };
    },
    reportSettings(next, method, body) {
      if (!body.reports || typeof body.reports !== 'object') throw invalid('reports', 'reportsを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      for (const [name, report] of Object.entries(body.reports)) {
        for (const group of report.groups || []) if (!form.has(group.code)) throw noField(`${group.code}（グラフ「${name}」）`);
        for (const aggregation of report.aggregations || []) if (aggregation.type !== 'COUNT' && !form.has(aggregation.code)) throw noField(`${aggregation.code}（グラフ「${name}」）`);
        fieldRefsInQuery(report.filterCond, form, `グラフ「${name}」の絞り込み`);
      }
      next.reportSettings = { reports: clone(body.reports) };
    },
    processSettings(next, method, body) {
      const form = allCodes(next.fieldSettings.properties);
      const states = body.states || {}, actions = body.actions || [];
      const names = Object.keys(states);
      if (body.enable) {
        if (names.length < 2) throw invalid('states', 'ステータスは2つ以上必要です。');
        const sorted = Object.values(states).map(state => Number(state.index)).sort((a, b) => a - b);
        if (sorted.some((value, index) => value !== index)) throw invalid('states', 'ステータスのindexは0から連番で指定してください。');
        for (const action of actions) {
          if (!states[action.from]) throw invalid('actions', `アクション「${action.name}」の遷移元「${action.from}」がステータスにありません。`);
          if (!states[action.to]) throw invalid('actions', `アクション「${action.name}」の遷移先「${action.to}」がステータスにありません。`);
          fieldRefsInQuery(action.filterCond, form, `アクション「${action.name}」`);
        }
        for (const state of Object.values(states)) for (const item of state.assignee?.entities || []) if (item.entity?.type === 'FIELD_ENTITY' && !form.has(item.entity.code)) throw noField(`${item.entity.code}（作業者）`);
        const before = next.processSettings;
        if (before.enable) {
          const first = states2 => Object.values(states2).sort((a, b) => Number(a.index) - Number(b.index))[0]?.name;
          if (first(before.states) !== first(states)) throw invalid('states', '先頭のステータスは変更できません。');
        }
      }
      next.processSettings = { enable: !!body.enable, states: clone(states), actions: clone(actions) };
      // プロセス管理を有効にすると、ステータス・作業者のフィールドが現れる（無効にすると消える）。
      const props = next.fieldSettings.properties;
      if (body.enable) {
        if (!props['ステータス']) props['ステータス'] = { type: 'STATUS', code: 'ステータス', label: 'ステータス', enabled: true };
        if (!props['作業者']) props['作業者'] = { type: 'STATUS_ASSIGNEE', code: '作業者', label: '作業者', enabled: true };
      } else { delete props['ステータス']; delete props['作業者']; }
    },
    pluginSettings(next, method, body) {
      if (method !== 'POST') throw kerr('GAIA_IL23', '許可されていないメソッドです。');
      const ids = body.ids || [];
      if (!Array.isArray(ids)) throw invalid('ids', 'idsを指定してください。');
      for (const id of ids) if (!S.installedPlugins.includes(id)) throw kerr('GAIA_PL01', `プラグイン（id: ${id}）が見つかりません。システム管理で導入されているか確認してください。`);
      for (const id of ids) if (!next.pluginSettings.plugins.some(item => item.id === id)) next.pluginSettings.plugins.push({ id, name: id, enabled: true });
    },
    customizeSettings(next, method, body, app) {
      if (!['ALL', 'ADMIN', 'NONE'].includes(body.scope)) throw invalid('scope', 'scopeが正しくありません。');
      const own = new Set(['desktop', 'mobile'].flatMap(platform => ['js', 'css'].flatMap(kind => (app.preview.customizeSettings[platform]?.[kind] || []).map(item => item.file?.fileKey).filter(Boolean))));
      const used = [];
      for (const platform of ['desktop', 'mobile']) for (const kind of ['js', 'css']) {
        for (const item of body[platform]?.[kind] || []) {
          if (item.type === 'URL') { if (!/^https?:\/\//.test(item.url || '')) throw invalid(`${platform}.${kind}.url`, 'URLが正しくありません。'); continue; }
          if (item.type !== 'FILE') throw invalid(`${platform}.${kind}.type`, 'typeはFILEまたはURLを指定してください。');
          const key = item.file?.fileKey;
          // 他のアプリで添付されている fileKey は流用できない。アップロード直後の fileKey は 1 回だけ使える。
          if (!key || (!own.has(key) && !S.uploadKeys.has(key))) throw kerr('GAIA_BL01', `ファイル（fileKey: ${key}）が見つかりません。`);
          if (!own.has(key)) { if (S.consumedKeys[key]) throw kerr('GAIA_BL01', `ファイル（fileKey: ${key}）は既に使用されています。`); used.push(key); }
        }
      }
      for (const key of used) S.consumedKeys[key] = true;
      const rebuilt = clone(body);
      for (const platform of ['desktop', 'mobile']) for (const kind of ['js', 'css']) {
        rebuilt[platform] = rebuilt[platform] || {};
        rebuilt[platform][kind] = (rebuilt[platform][kind] || []).map(item => item.type === 'FILE' ? { type: 'FILE', file: { fileKey: item.file.fileKey, name: S.fileNames[item.file.fileKey] || item.file.name || item.file.fileKey, contentType: 'text/plain', size: String((S.files[item.file.fileKey] || '').length || item.file.size || 0) } } : item);
      }
      next.customizeSettings = rebuilt;
    },
    actionSettings(next, method, body) {
      if (!body.actions || typeof body.actions !== 'object') throw invalid('actions', 'actionsを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      for (const [name, action] of Object.entries(body.actions)) {
        if (action.destApp?.app && !S.apps[String(action.destApp.app)]) throw kerr('GAIA_AP01', `指定したアプリ（id: ${action.destApp.app}）が見つかりません。`);
        for (const mapping of action.mappings || []) if (mapping.srcType === 'FIELD' && !form.has(mapping.srcField)) throw noField(`${mapping.srcField}（アクション「${name}」）`);
      }
      next.actionSettings = { actions: clone(body.actions) };
    },
    appAcl(next, method, body) { if (!Array.isArray(body.rights)) throw invalid('rights', 'rightsを指定してください。'); next.appAcl = { rights: clone(body.rights) }; },
    fieldAcl(next, method, body) {
      if (!Array.isArray(body.rights)) throw invalid('rights', 'rightsを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      for (const right of body.rights) if (!['$id', '$revision'].includes(right.code) && !form.has(right.code)) throw noField(`${right.code}（フィールド権限）`);
      next.fieldAcl = { rights: clone(body.rights) };
    },
    recordPermissions(next, method, body) {
      if (!Array.isArray(body.rights)) throw invalid('rights', 'rightsを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      for (const right of body.rights) fieldRefsInQuery(right.filterCond, form, 'レコード権限の条件');
      next.recordPermissions = { rights: clone(body.rights) };
    },
    notifications(next, method, body) { if (!Array.isArray(body.notifications)) throw invalid('notifications', 'notificationsを指定してください。'); next.notifications = { ...next.notifications, notifications: clone(body.notifications), ...(body.notifyToCommenter !== undefined ? { notifyToCommenter: body.notifyToCommenter } : {}) }; },
    perRecordNotifications(next, method, body) {
      if (!Array.isArray(body.notifications)) throw invalid('notifications', 'notificationsを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      for (const item of body.notifications) fieldRefsInQuery(item.filterCond, form, 'レコード条件通知');
      next.perRecordNotifications = { notifications: clone(body.notifications) };
    },
    reminderNotifications(next, method, body) {
      if (!Array.isArray(body.notifications)) throw invalid('notifications', 'notificationsを指定してください。');
      if (body.notifications.length && !body.timezone) throw invalid('timezone', 'timezoneを指定してください。');
      const form = allCodes(next.fieldSettings.properties);
      for (const item of body.notifications) if (item.timing?.code && !form.has(item.timing.code)) throw noField(`${item.timing.code}（リマインダー通知）`);
      next.reminderNotifications = { notifications: clone(body.notifications), timezone: body.timezone || next.reminderNotifications.timezone };
    },
    categories(next, method, body) {
      if (typeof body.enabled !== 'boolean' && body.enabled !== undefined) throw invalid('enabled', 'enabledは真偽値で指定してください。');
      next.categories = { enabled: body.enabled ?? next.categories.enabled, categories: clone(body.categories || {}) };
    },
    appSettings(next, method, body) {
      const { app: _app, revision: _revision, ...rest } = clone(body);
      if (rest.titleField?.selectionMode === 'MANUAL' && !allCodes(next.fieldSettings.properties).has(rest.titleField.code)) throw noField(`${rest.titleField.code}（レコードのタイトル）`);
      if (rest.numberPrecision && Number(rest.numberPrecision.digits) > 30) throw invalid('numberPrecision.digits', '桁数は30以下にしてください。');
      next.appSettings = { ...next.appSettings, ...rest };
    }
  };

  // ---- 非同期の反映 ---------------------------------------------------
  const settle = () => {
    if (S.hold) return;
    const now = Date.now();
    for (const app of Object.values(S.apps)) {
      const group = app.group;
      if (!group || group.done || now < group.finishAt) continue;
      group.done = true;
      const failed = group.ids.filter(id => S.failApps.has(id));
      for (const id of group.ids) {
        const target = S.apps[id];
        if (failed.length) { target.status = failed.includes(id) ? 'FAIL' : 'CANCEL'; continue; }
        target.status = 'SUCCESS';
        if (group.revert) { target.preview = clone(target.prod); target.previewRev = target.prodRev; }
        else { target.prod = clone(target.preview); target.prodRev = target.previewRev; }
      }
    }
  };
  const processing = app => !!app.group && !app.group.done;

  // ---- API -------------------------------------------------------------
  const api = async (url, method, params) => {
    const call = { seq: ++S.seq, at: Date.now() - S.t0, url, method, params: method === 'GET' ? clone(params ?? {}) : undefined };
    S.calls.push(call);
    if (S.latency) await sleep(S.latency);
    settle();
    const match = /^\/k(?:\/guest\/(\d+))?\/v1(\/preview)?(\/.*)$/.exec(url);
    if (!match) throw violation(`想定外の URL: ${method} ${url}`);
    const guest = match[1] || '', preview = !!match[2], p = match[3];
    const appOf = id => {
      const app = S.apps[String(id)];
      if (!app || app.guest !== guest) throw kerr('GAIA_AP01', `指定したアプリ（id: ${id}）が見つかりません。`);
      if (preview && app.deniedPreview) throw kerr('GAIA_NO01', 'この操作を実行する権限がありません。');
      return app;
    };
    if (method === 'GET') {
      if (p === '/apps.json') {
        if (preview) throw violation(`apps.json に preview prefix は無い: ${url}`);
        const limit = Number(params?.limit ?? 100), offset = Number(params?.offset ?? 0);
        if (limit > 100 || limit < 1) throw invalid('limit', 'limitは1〜100で指定してください。');
        let list = Object.values(S.apps).filter(app => app.guest === guest);
        if (params?.ids?.length) list = list.filter(app => params.ids.map(String).includes(app.id));
        if (params?.name) list = list.filter(app => app.name.includes(params.name));
        if (params?.codes?.length) list = list.filter(app => params.codes.includes(app.code));
        if (params?.spaceIds?.length) list = list.filter(app => params.spaceIds.map(String).includes(String(app.spaceId)));
        list.sort((a, b) => Number(a.id) - Number(b.id));
        return { apps: list.slice(offset, offset + limit).map(app => ({ appId: app.id, code: app.code, name: app.name, description: '', spaceId: app.spaceId, threadId: app.spaceId, createdAt: '2026-01-01T00:00:00Z', modifiedAt: '2026-01-02T00:00:00Z' })) };
      }
      if (p === '/app.json') {
        if (preview) throw violation(`app.json に preview prefix は無い: ${url}`);
        const app = appOf(params?.id);
        return { appId: app.id, code: app.code, name: app.name, description: '', spaceId: app.spaceId, threadId: app.spaceId, createdAt: '2026-01-01T00:00:00Z', modifiedAt: '2026-01-02T00:00:00Z' };
      }
      if (p === '/app/deploy.json') {
        if (!preview) throw violation(`deploy.json の GET は preview prefix のみ: ${url}`);
        S.statusGets += 1;
        const ids = (params?.apps || []).map(String);
        if (!ids.length || ids.length > 300) throw invalid('apps', 'appsは1〜300件で指定してください。');
        return { apps: ids.map(id => { const app = appOf(id); return { app: id, status: processing(app) ? 'PROCESSING' : (app.status || 'SUCCESS') }; }) };
      }
      if (p === '/app/plugin/config.json') { const app = appOf(params?.app); return { config: { note: `設定 ${params?.id}` }, revision: String(preview ? app.previewRev : app.prodRev) }; }
      const key = ENDPOINTS[p];
      if (!key) throw violation(`想定外の GET: ${url}`);
      const app = appOf(params?.app);
      return { ...clone((preview ? app.preview : app.prod)[key]), revision: String(preview ? app.previewRev : app.prodRev) };
    }
    // ---- 書き込み ----
    if (method === 'POST' && preview && p === '/app/deploy.json') {
      const body = clone(params);
      const record = { seq: call.seq, at: call.at, url, body, rejected: false };
      S.deploys.push(record);
      if (!Array.isArray(body.apps) || !body.apps.length) { record.rejected = true; throw invalid('apps', 'appsを指定してください。'); }
      for (const row of body.apps) {
        const app = appOf(row.app);
        if (S.rejectDeploy[row.app]) { record.rejected = true; throw kerr(S.rejectDeploy[row.app].code, S.rejectDeploy[row.app].message); }
        if (processing(app)) { record.rejected = true; throw kerr('GAIA_AD01', `アプリ（id: ${row.app}）は設定を反映中です。完了してから再度実行してください。`); }
        if (row.revision !== undefined && String(row.revision) !== '-1' && String(row.revision) !== String(app.previewRev)) { record.rejected = true; throw kerr('GAIA_CO02', '指定したrevisionは最新ではありません。他のユーザーによってアプリの設定が更新されています。'); }
      }
      const group = { ids: body.apps.map(row => String(row.app)), revert: body.revert === true, finishAt: Date.now() + S.processMs, done: false };
      for (const id of group.ids) { S.apps[id].group = group; S.apps[id].status = 'PROCESSING'; }
      return {};
    }
    const key = ENDPOINTS[p];
    if ((method === 'PUT' || method === 'POST') && key) {
      if (!preview) throw violation(`本番への設定の書き込み: ${method} ${url}`);
      const app = appOf(params?.app);
      if (!S.writableApps.has(app.id)) throw violation(`書き込み対象外のアプリへの書き込み: ${method} ${url} (App ${app.id})`);
      const record = { seq: call.seq, at: call.at, url, path: p, key, method, body: clone(params), rejected: false, error: '', revisionBefore: String(app.previewRev), revisionAfter: '' };
      S.writes.push(record);
      if (S.holdWrites) { S.heldWrites += 1; await new Promise(resolve => S.writeResolvers.push(resolve)); settle(); }
      const fail = error => { record.rejected = true; record.error = `${error.code}: ${error.message}`; return error; };
      if (processing(app)) throw fail(kerr('GAIA_AD01', 'アプリの設定を反映中のため、設定を変更できません。'));
      if (S.failWrites[key]) throw fail(kerr(S.failWrites[key].code, S.failWrites[key].message));
      if (params.revision !== undefined && String(params.revision) !== '-1' && String(params.revision) !== String(app.previewRev)) throw fail(kerr('GAIA_CO02', '指定したrevisionは最新ではありません。他のユーザーによってアプリの設定が更新されています。'));
      const next = clone(app.preview);
      try { writers[key](next, method, params, app); } catch (error) { throw fail(error); }
      app.preview = next;
      app.previewRev += 1;
      record.revisionAfter = String(app.previewRev);
      if (S.bumpAfterWrite && S.bumpAfterWrite.after === S.writes.length) { const hook = S.bumpAfterWrite; S.bumpAfterWrite = null; S.bumpPreview(app.id, hook.mutate); }
      return { revision: record.revisionAfter };
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
  window.kintone = { app: { getId: () => Number(config.currentAppId ?? 202), getHeaderMenuSpaceElement: () => null }, getRequestToken: () => 'TOKEN', api: callApi };

  // ファイル本体の取得（GET /k/v1/file.json?fileKey=）とアップロード（POST /k/v1/file.json）。ほかの fetch は想定外。
  window.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    S.calls.push({ seq: ++S.seq, at: Date.now() - S.t0, url: String(url), method, fetch: true });
    if (S.latency) await sleep(S.latency);
    if (method === 'POST') {
      if (!/^\/k(?:\/guest\/(\d+))?\/v1\/file\.json$/.test(String(url))) throw violation(`想定外の fetch: POST ${url}`);
      const upload = init.body.get('file'), fileKey = `uploaded-${S.uploads.length + 1}`;
      S.uploads.push({ seq: S.seq, url: String(url), name: upload.name, fileKey });
      S.files[fileKey] = await upload.text();
      S.fileNames[fileKey] = upload.name;
      S.uploadKeys.add(fileKey);
      return new Response(JSON.stringify({ fileKey }));
    }
    const m = /^\/k(?:\/guest\/(\d+))?\/v1\/file\.json\?fileKey=([^&]+)$/.exec(String(url));
    if (!m || method !== 'GET') throw violation(`想定外の fetch: ${method} ${url}`);
    const key = decodeURIComponent(m[2]);
    S.fileFetches.push(key);
    if (S.files[key] === undefined) return new Response('', { status: 404 });
    return new Response(new Blob([S.files[key]], { type: 'text/javascript' }));
  };

  // バックアップのダウンロードは実ファイルにせず、名前と中身を記録する。
  if (!window.__anchorPatched) {
    window.__anchorPatched = true;
    const create = URL.createObjectURL.bind(URL), blobs = new Map();
    URL.createObjectURL = blob => { const url = create(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () {
      const current = window.__k;
      if (current) current.downloads.push({ seq: ++current.seq, name: this.download, blob: blobs.get(this.href) });
    };
  }
  window.open = () => null;
  S.timeScale = scale => {
    window.setTimeout = (fn, ms, ...rest) => nativeSetTimeout(fn, Number(ms) >= 500 ? Number(ms) / scale : ms, ...rest);
  };
}

// ---------------------------------------------------------------------------
// 実際のアプリに近い設定の組み立て（Node 側）
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
  group: (code, label, extra = {}) => ({ type: 'GROUP', code, label, noLabel: false, openGroup: true, ...extra }),
  table: (code, fields) => ({ type: 'SUBTABLE', code, noLabel: false, fields: Object.fromEntries(fields.map(field => [field.code, field])) }),
  lookup: (code, label, relatedApp, extra = {}) => ({ ...f.text(code, label), lookup: { relatedApp: { app: String(relatedApp), code: '' }, relatedKeyField: 'code', fieldMappings: [{ field: 'cust_name', relatedField: 'name' }], lookupPickerFields: ['code', 'name'], filterCond: '', sort: 'code asc' }, ...extra }),
  reference: (code, label, relatedApp, extra = {}) => ({ type: 'REFERENCE_TABLE', code, label, noLabel: false, referenceTable: { relatedApp: { app: String(relatedApp), code: '' }, condition: { field: 'customer_code', relatedField: 'code' }, filterCond: '', displayFields: ['code', 'name'], sort: 'code asc', size: '5' }, ...extra }),
  system: () => [
    { type: 'RECORD_NUMBER', code: 'record_no', label: 'レコード番号', noLabel: false },
    { type: 'CREATOR', code: 'creator', label: '作成者', noLabel: false },
    { type: 'CREATED_TIME', code: 'created', label: '作成日時', noLabel: false },
    { type: 'MODIFIER', code: 'modifier', label: '更新者', noLabel: false },
    { type: 'UPDATED_TIME', code: 'updated', label: '更新日時', noLabel: false }
  ]
};
const props = fields => Object.fromEntries(fields.map(field => [field.code, clone(field)]));
const cell = (field, width = '200') => ({ type: field.type, code: field.code, size: { width } });
const row = (...fields) => ({ type: 'ROW', fields: fields.map(field => cell(field)) });
const view = {
  list: (name, index, fields, filterCond = '', sort = 'record_no desc', extra = {}) => ({ type: 'LIST', name, index: String(index), fields, filterCond, sort, device: 'ANY', ...extra }),
  calendar: (name, index, date, title, filterCond = '') => ({ type: 'CALENDAR', name, index: String(index), date, title, filterCond, sort: '', device: 'ANY' }),
  custom: (name, index, html) => ({ type: 'CUSTOM', name, index: String(index), html, pager: true, device: 'DESKTOP', filterCond: '', sort: '' })
};
const entity = (type, code) => ({ type, code });

/** マスタアプリ（ルックアップ・関連レコード一覧の参照先） */
const masterApp = (extra = {}) => ({
  id: '301', name: '取引先マスタ', prodRevision: 3, previewRevision: 3,
  production: { fieldSettings: { properties: props([...f.system(), f.text('code', '取引先コード', { required: true, unique: true }), f.text('name', '取引先名')]) } },
  ...extra
});

/**
 * 業務アプリの設定一式。variant: 'prod'（反映先 #202 の本番）、'dev'（反映元 #101 の開発版。
 * prod から、選択肢の追加と初期値の変更・設定値の変更・フィールドや一覧の追加を重ねたもの）。
 */
function businessSettings(name, variant) {
  const dev = variant === 'dev';
  const status = f.choice('DROP_DOWN', 'status', 'ステータス', dev ? ['未対応', '対応中', '保留', '完了'] : ['未対応', '対応中', '完了'], dev ? '保留' : '未対応', { required: true });
  const priority = f.choice('RADIO_BUTTON', 'priority', '優先度', dev ? ['緊急', '高', '中', '低'] : ['高', '中', '低'], '中');
  const tags = f.choice('CHECK_BOX', 'tags', 'タグ', ['新規', '既存', '要注意'], dev ? ['新規', '要注意'] : ['新規']);
  const customer = f.text('customer', dev ? '顧客名（正式名称）' : '顧客名', { required: dev, unique: dev, maxLength: dev ? '100' : '64' });
  const custCode = f.lookup('customer_code', '取引先コード', 301);
  const custName = f.text('cust_name', '取引先名');
  const amount = f.number('amount', '金額', { unit: dev ? '千円' : '円', unitPosition: 'AFTER', displayScale: dev ? '2' : '0', minValue: dev ? '0' : '' });
  const taxRate = f.number('tax_rate', '税率', { defaultValue: dev ? '10' : '8' });
  const total = f.calc('total', '合計', dev ? 'amount * (1 + tax_rate / 100) + shipping' : 'amount * (1 + tax_rate / 100)');
  const shipping = f.number('shipping', '送料');
  const due = f.date('due', '期限', { required: dev });
  const owner = f.user('owner', '担当者');
  const memo = f.memo('memo', '備考');
  const region = f.choice('DROP_DOWN', 'region', '地域', ['東日本', '西日本'], '東日本');
  const items = f.table('items', [
    f.text('item_name', '品名'), f.number('qty', '数量', { required: dev }), f.number('unit_price', '単価'),
    ...(dev ? [f.number('discount', '値引き')] : []),
    f.calc('subtotal', '小計', 'qty * unit_price'), f.choice('DROP_DOWN', 'item_kind', '種別', dev ? ['物品', '役務', '値引き'] : ['物品', '役務'], '物品')
  ]);
  const rel = f.reference('rel', '取引先の関連レコード', 301);
  const basic = f.group('basic', '基本情報');
  const fields = [...f.system(), basic, customer, custCode, custName, amount, taxRate, total, ...(dev ? [shipping, region] : []), status, priority, tags, due, owner, memo, items, rel];
  const layout = [
    { type: 'GROUP', code: 'basic', layout: [row(customer, custCode), row(custName)] },
    row(amount, taxRate, total),
    ...(dev ? [row(shipping, region)] : []),
    row(status, priority),
    row(tags, due),
    row(owner), row(memo),
    { type: 'SUBTABLE', code: 'items', fields: Object.values(items.fields).map(field => cell(field, '120')) },
    row(rel)
  ];
  const listBase = ['record_no', 'customer', 'amount', 'status', ...(dev ? ['region'] : [])];
  const views = {
    '全件': view.list('全件', 0, listBase, dev ? 'region != ""' : '', dev ? 'amount desc' : 'record_no desc'),
    '未完了': view.list('未完了', 1, ['record_no', 'customer', 'status', 'due'], dev ? 'status not in ("完了", "保留")' : 'status not in ("完了")', 'due asc'),
    '月次': view.calendar('月次', 2, 'due', dev ? 'cust_name' : 'customer'),
    'ダッシュボード': view.custom('ダッシュボード', 3, dev ? '<div id="dash2"></div>' : '<div id="dash"></div>'),
    ...(dev ? { '担当別': view.list('担当別', 4, ['record_no', 'owner', 'amount'], 'owner in (LOGIN_USER())', 'amount desc') } : {})
  };
  const reports = {
    ...(dev ? { '地域別': { chartType: 'PIE', chartMode: 'NORMAL', name: '地域別', index: '2', groups: [{ code: 'region' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null } } : {}),
    'ステータス別': { chartType: 'PIE', chartMode: 'NORMAL', name: 'ステータス別', index: '0', groups: [{ code: 'status' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null },
    '月別売上': { chartType: 'BAR', chartMode: 'NORMAL', name: '月別売上', index: '1', groups: [{ code: 'due', per: 'MONTH' }], aggregations: [{ type: dev ? 'AVERAGE' : 'SUM', code: 'amount' }], filterCond: '', sort: 'GROUP1_ASC', periodicReport: null }
  };
  const states = {
    '未対応': { name: '未対応', index: '0', assignee: { type: 'ONE', entities: [] } },
    '対応中': { name: '対応中', index: '1', assignee: { type: 'ONE', entities: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] } },
    ...(dev ? { '保留': { name: '保留', index: '2', assignee: { type: 'ALL', entities: [{ entity: entity('USER', 'admin'), includeSubs: false }] } } } : {}),
    '完了': { name: '完了', index: dev ? '3' : '2', assignee: { type: 'ONE', entities: [] } }
  };
  const processSettings = {
    enable: true, states,
    actions: [
      { name: '着手', from: '未対応', to: '対応中', filterCond: '' },
      ...(dev ? [{ name: '保留にする', from: '対応中', to: '保留', filterCond: '' }, { name: '再開', from: '保留', to: '対応中', filterCond: '' }] : []),
      { name: '完了にする', from: '対応中', to: '完了', filterCond: dev ? 'amount > 0' : '' }
    ]
  };
  const sys = [{ type: 'STATUS', code: 'ステータス', label: 'ステータス', enabled: true }, { type: 'STATUS_ASSIGNEE', code: '作業者', label: '作業者', enabled: true }];
  const appRights = [
    { entity: entity('GROUP', 'everyone'), includeSubs: false, appEditable: false, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: false, recordImportable: false, recordExportable: true },
    { entity: entity('USER', 'admin'), includeSubs: false, appEditable: true, recordViewable: true, recordAddable: true, recordEditable: true, recordDeletable: true, recordImportable: true, recordExportable: true },
    ...(dev ? [{ entity: entity('ORGANIZATION', 'sales'), includeSubs: true, appEditable: false, recordViewable: true, recordAddable: true, recordEditable: false, recordDeletable: false, recordImportable: false, recordExportable: false }] : [])
  ];
  return JSON.parse(JSON.stringify({
    appSettings: { name, description: dev ? '開発版' : '本番', icon: { type: 'PRESET', key: dev ? 'APP12' : 'APP01' }, theme: dev ? 'BLUE' : 'WHITE', titleField: { selectionMode: 'AUTO' }, enableThumbnails: true, enableBulkDeletion: !dev, enableComments: !dev, enableDuplicateRecord: true, enableInlineRecordEditing: true, numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: dev ? '4' : '1' },
    fieldSettings: { properties: props([...fields, ...sys]) },
    layoutSettings: { layout },
    viewSettings: { views },
    reportSettings: { reports },
    processSettings,
    pluginSettings: { plugins: [{ id: 'plugin-calendar', name: 'カレンダー', enabled: true }, ...(dev ? [{ id: 'plugin-chart', name: 'チャート', enabled: true }] : [])] },
    customizeSettings: {
      scope: 'ALL',
      desktop: {
        js: [{ type: 'URL', url: 'https://cdn.example.com/lib.js' }, ...(dev ? [{ type: 'URL', url: 'https://cdn.example.com/extra.js' }, { type: 'FILE', file: { fileKey: 'dev-main-js', name: 'main.js', contentType: 'text/javascript', size: '40' } }] : [{ type: 'FILE', file: { fileKey: 'tgt-legacy-js', name: 'legacy.js', contentType: 'text/javascript', size: '30' } }])],
        css: dev ? [{ type: 'FILE', file: { fileKey: 'dev-style-css', name: 'style.css', contentType: 'text/css', size: '20' } }] : []
      },
      mobile: { js: [], css: [] }
    },
    actionSettings: { actions: { '受注コピー': { name: '受注コピー', index: '0', destApp: { app: '301', code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'customer', dstField: 'name' }, ...(dev ? [{ srcType: 'FIELD', srcField: 'cust_name', dstField: 'name' }] : [])], entities: [{ type: 'USER', code: 'admin' }], filterCond: '' } } },
    appAcl: { rights: appRights },
    fieldAcl: { rights: [{ code: 'amount', entities: [{ accessibility: dev ? 'READ' : 'WRITE', entity: entity('GROUP', 'everyone'), includeSubs: false }, { accessibility: 'WRITE', entity: entity('USER', 'admin'), includeSubs: false }] }, ...(dev ? [{ code: 'shipping', entities: [{ accessibility: 'READ', entity: entity('GROUP', 'everyone'), includeSubs: false }] }] : [])] },
    recordPermissions: { rights: [{ filterCond: dev ? 'region = "東日本"' : '', entities: [{ entity: entity('GROUP', 'everyone'), viewable: true, editable: !dev, deletable: false, includeSubs: false }] }] },
    notifications: { notifications: [{ entity: entity('USER', 'admin'), includeSubs: false, recordAdded: true, recordEdited: false, commentAdded: true, statusChanged: true, fileImported: false }, ...(dev ? [{ entity: entity('GROUP', 'everyone'), includeSubs: false, recordAdded: true, recordEdited: true, commentAdded: false, statusChanged: false, fileImported: false }] : [])], notifyToCommenter: dev },
    perRecordNotifications: { notifications: [{ filterCond: 'amount > 1000000', title: '高額案件です', targets: [{ entity: entity('USER', 'admin'), includeSubs: false }] }] },
    reminderNotifications: { notifications: [{ filterCond: 'status != "完了"', title: '期限が近づいています', timing: { code: 'due', daysLater: dev ? '-3' : '-1', hoursLater: '0', time: '09:00' }, targets: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] }], timezone: 'Asia/Tokyo' },
    categories: { enabled: dev, categories: dev ? { '東日本': { label: '東日本', index: '0', parent: null }, '西日本': { label: '西日本', index: '1', parent: null } } : {} }
  }));
}

const BUSINESS_FILES = { 'dev-main-js': '(function(){ console.log("dev main"); })();', 'dev-style-css': '.dev { color: red; }', 'tgt-legacy-js': '(function(){ console.log("legacy"); })();' };

/** 反映元 #101（開発版）・反映先 #202（本番。プレビューも同じ）・マスタ #301。 */
const businessWorld = (config = {}) => ({
  apps: [
    { id: '101', name: '営業管理（開発）', prodRevision: 20, previewRevision: 20, production: businessSettings('営業管理（開発）', 'dev') },
    { id: '202', name: '営業管理', prodRevision: 10, previewRevision: 10, production: businessSettings('営業管理', 'prod'), ...(config.target || {}) },
    masterApp()
  ],
  files: BUSINESS_FILES,
  ...config.engine
});
const ALL_SCOPES = ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'categories', 'appSettings', 'processSettings', 'actionSettings', 'pluginSettings', 'customizeSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications'];

// ---------------------------------------------------------------------------
// 検証の枠組み
// ---------------------------------------------------------------------------
const findings = [];
const metrics = {};
const checks = [];
/** 製品の不具合・使いにくさ・文言の問題を記録する。severity: critical（失敗にする）/ high / medium / low */
function finding(id, severity, title, detail = {}) {
  if (findings.some(item => item.id === id)) return;
  findings.push({ id, severity, title, ...detail });
  console.log(`  [既知の問題 ${severity}] ${id}: ${title}`);
}
const ok = name => { checks.push(name); console.log(`  OK ${name}`); };
const sleepNode = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  if (process.argv.includes('--help')) { printHelp(); return; }
  if (!fs.existsSync(TOOL_FILE)) throw new Error(`配布物が見つかりません: ${TOOL_FILE}（npm run build で生成してください）`);
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const only = argValue('--only', '');
  const skipScale = process.argv.includes('--skip-scale');
  const toolScript = fs.readFileSync(TOOL_FILE, 'utf8');
  const browserName = argValue('--browser', 'chrome');
  const executablePath = argValue('--executable', process.env.KUS_PLAYWRIGHT_EXECUTABLE);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : browserName === 'chromium' ? {} : { channel: browserName }) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console.error: ${message.text()}`); });
  await page.route('**/*', route => route.abort());

  // ---- 画面の部品 ----
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name: new RegExp(name) });
  const radio = name => page.getByRole('radio', { name, exact: true });
  const chip = label => page.getByRole('checkbox', { name: label, exact: true });
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-deploy-lite')?.getAttribute('aria-busy') !== 'true', null, { timeout: 600000 });
  const statusText = () => page.locator('.kus-lp__status-text').innerText();
  const statusTone = () => page.locator('.kus-lp__status').getAttribute('data-tone');
  const dockText = () => page.locator('.kus-dp-dock-copy').innerText();
  const panelText = () => page.locator('#kus-deploy-lite').innerText();
  const texts = {};
  const collectTexts = () => page.evaluate(() => {
    const root = document.querySelector('#kus-deploy-lite');
    if (!root) return null;
    const visible = root.innerText;
    const labels = [...root.querySelectorAll('[aria-label],[placeholder],[title]')].map(node => node.getAttribute('aria-label') || node.getAttribute('placeholder') || node.getAttribute('title')).filter(Boolean);
    return { visible: visible.length > 60000 ? visible.slice(0, 60000) : visible, labels: [...new Set(labels)].slice(0, 400) };
  });
  const shot = async name => {
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    if (!name.startsWith('scale-')) { const collected = await collectTexts(); if (collected) texts[name] = collected; }
  };
  const row = id => page.locator(`.kus-ds-row[data-change-id="${id}"]`);
  const rowCheck = id => row(id).locator('input[type="checkbox"]');
  const card = key => page.locator(`[data-select-section="${key}"]`);
  const selectCount = key => page.locator(`[data-select-count="${key}"]`);
  const editCard = key => page.locator(`[data-edit-section="${key}"]`);
  const editRow = (key, pointer) => editCard(key).locator(`.kus-ds-edit[data-edit-pointer="${pointer}"]`);
  const fact = key => page.locator(`[data-confirm="${key}"]`);
  const ackBox = () => page.getByRole('checkbox', { name: '上記の内容を確認しました', exact: true });
  const pendingBox = () => page.getByRole('checkbox', { name: '未公開の変更も一緒に本番へ反映されることを了承する', exact: true });
  const idBox = () => page.locator('input[aria-label="確認用の反映先アプリID"]');
  const sourceRunButton = () => page.getByRole('button', { name: /^確認した内容を反映先(へ書き込み、本番へ反映|プレビューへ反映)$/ });
  const publishRunButton = () => page.getByRole('button', { name: /^確認した .* アプリ(を本番へ反映|の変更を中止)$/ });
  const confirmBox = () => page.locator('input[aria-label^="確認用の対象アプリ"]');
  const rowsOf = () => page.locator('.kus-lp__apptable tbody tr');
  const appInput = i => rowsOf().nth(i).locator('input[aria-label="アプリID"]');
  const reviewRow = id => page.locator(`tr.kus-dp-row[data-deploy-app="${id}"]`);
  const resultItem = id => page.locator(`.kus-dp-result-item[data-deploy-app="${id}"]`);
  const progress = key => page.locator(`[data-progress-section="${key}"]`);
  const K = fn => page.evaluate(fn);

  /** ページを作り直し、合成 kintone を入れ、配布物を読み込む（配布物は読み込み時に自動で起動する）。 */
  async function reset(config, { flow = 'source', width = 1440, height = 1000 } = {}) {
    await page.setViewportSize({ width, height });
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(installSyntheticKintone, config);
    pageErrors.length = 0;
    await page.evaluate(() => {
      window.__long = [];
      try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__long.push(Math.round(entry.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (error) { /* 非対応 */ }
    });
    await page.addScriptTag({ content: toolScript });
    await page.waitForSelector('#kus-deploy-lite');
    if (flow === 'publish') await radio('プレビューの変更を公開').check();
  }

  const snapshot = () => page.evaluate(() => {
    const s = window.__k;
    return {
      calls: s.calls.map(({ seq, at, url, method, params, fetch }) => ({ seq, at, url, method, params, fetch })),
      writes: s.writes, deploys: s.deploys, violations: s.violations, downloads: s.downloads.map(({ seq, name }) => ({ seq, name })),
      uploads: s.uploads, fileFetches: s.fileFetches, statusGets: s.statusGets,
      apps: Object.fromEntries(Object.values(s.apps).map(app => [app.id, { prodRev: String(app.prodRev), previewRev: String(app.previewRev), status: app.status, prod: app.prod, preview: app.preview }]))
    };
  });
  const backupJson = index => page.evaluate(async i => JSON.parse(await window.__k.downloads[i].blob.text()), index);
  const writeLabels = now => now.writes.map(write => `${write.method} ${write.path}${write.rejected ? ' (拒否)' : ''}`);
  const okWrites = now => now.writes.filter(write => !write.rejected);
  const WRITE_URL = /^\/k(\/guest\/\d+)?\/v1\/preview\/(app\/(deploy|form\/fields|form\/layout|views|settings|reports|status|plugins|customize|actions|acl|categories|notifications\/[a-zA-Z]+)|field\/acl|record\/acl)\.json$/;
  /** 書き込みは「反映先プレビューへの設定の書き込み」と「プレビューの deploy.json の POST」だけ。本番・反映元・レコードへの書き込みと想定外の通信は無い。 */
  async function assertOnlyAllowedWrites(where, allowedApps = ['202']) {
    const now = await snapshot();
    assert.deepEqual(now.violations, [], `${where}: 合成 kintone が想定外の通信を受けた`);
    for (const call of now.calls.filter(item => item.method !== 'GET')) assert.match(call.url, WRITE_URL, `${where}: 想定外の書き込み先 ${call.method} ${call.url}`);
    assert.ok(now.writes.every(write => allowedApps.includes(String(write.body.app))), `${where}: 設定の書き込みは ${allowedApps.join('・')} だけ`);
    return now;
  }
  const countGets = (now, filter) => now.calls.filter(call => call.method === 'GET' && filter(call)).length;

  // ---- 「反映元アプリから本番へ」の操作 ----
  async function extract({ source = '101', target = '202', scopes = null, kind = null } = {}) {
    if (kind) await radio(kind).check();
    await page.getByLabel('反映元アプリID', { exact: true }).fill(source);
    await page.getByLabel('反映先アプリID', { exact: true }).fill(target);
    if (scopes) {
      for (const [label, on] of scopes) await (on ? chip(label).check() : chip(label).uncheck());
    }
    await button('差分を抽出する').click();
    await idle();
  }
  const toEdit = async () => { await button('内容の修正へ').click(); assert.equal(await tab('内容を修正').getAttribute('aria-selected'), 'true'); };
  const toConfirm = async () => { await button('最終確認に進む').click(); assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true'); };
  const selectNone = async key => { await card(key).locator('[data-action="select-none"]').click(); };
  const selectAll = async key => { await card(key).locator('[data-action="select-all"]').click(); };
  async function arm(id = '202', { ackPending = false } = {}) {
    await ackBox().check();
    if (ackPending) await pendingBox().check();
    await idBox().fill(id);
    assert.equal(await sourceRunButton().isEnabled(), true, '確認後は実行できる');
  }
  async function runSource(id = '202', options = {}) { await arm(id, options); await sourceRunButton().click(); await idle(); }

  // ---- 「プレビューの変更を公開」の操作 ----
  async function setTargets(ids) {
    await page.evaluate(() => { document.querySelectorAll('.kus-lp__apptable tbody tr button').forEach(b => { if (b.textContent === '×') b.click(); }); });
    await appInput(0).fill(ids.join(','));
    await appInput(0).press('Tab');
  }
  async function chooseDetail(...labels) {
    await button('詳細設定…').click();
    for (const label of labels) await page.getByRole('radio', { name: label, exact: true }).check();
    await page.getByRole('button', { name: '詳細設定を閉じる', exact: true }).click();
  }
  const inspect = async () => { await button('未公開の変更を確認する').click(); await idle(); };
  const toPublishConfirm = async () => { await button('最終確認に進む').click(); assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true'); };
  async function armPublish(value) {
    await ackBox().check();
    await confirmBox().fill(String(value));
    assert.equal(await publishRunButton().isEnabled(), true, '確認後は実行できる');
  }
  async function runPublish(value) { await armPublish(value); await publishRunButton().click(); await idle(); }

  const ctx = {
    page, browser, context, button, tab, radio, chip, idle, statusText, statusTone, dockText, panelText, shot, row, rowCheck, card, selectCount, editCard, editRow, fact,
    ackBox, pendingBox, idBox, sourceRunButton, publishRunButton, confirmBox, rowsOf, appInput, reviewRow, resultItem, progress, K, reset, snapshot, backupJson, writeLabels,
    okWrites, assertOnlyAllowedWrites, countGets, extract, toEdit, toConfirm, selectNone, selectAll, arm, runSource, setTargets, chooseDetail, inspect, toPublishConfirm, armPublish, runPublish,
    pageErrors, only, skipScale, toolScript, finding, ok, metrics, sleepNode, texts
  };

  const scenarios = [];
  const scenario = (name, fn) => scenarios.push({ name, fn });
  for (const register of [registerScenarios, registerPublish, registerScale, registerUx, registerWording]) register(scenario, ctx);

  const failures = [];
  const started = Date.now();
  for (const item of scenarios) {
    if (only && !item.name.includes(only)) continue;
    console.log(`\n== ${item.name}`);
    const t0 = Date.now();
    try { await item.fn(); }
    catch (error) {
      failures.push({ name: item.name, message: error && error.stack ? error.stack.split('\n').slice(0, 6).join('\n') : String(error) });
      console.log(`  NG ${item.name}: ${error && error.message}`);
      await page.screenshot({ path: path.join(OUT, `failure-${item.name.replace(/[^\w぀-ヿ一-鿿-]+/g, '_')}.png`) }).catch(() => {});
    }
    metrics[`時間: ${item.name}`] = `${((Date.now() - t0) / 1000).toFixed(1)} 秒`;
  }
  await browser.close();

  const critical = findings.filter(item => item.severity === 'critical');
  const result = { generatedAt: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), checks, metrics, findings, failures, pageErrors: [...new Set(pageErrors)] };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2));
  console.log('\n===== 計測値 =====');
  for (const [key, value] of Object.entries(metrics)) console.log(`  ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  console.log(`\n===== 既知の問題 ${findings.length} 件 =====`);
  for (const item of ['critical', 'high', 'medium', 'low']) for (const entry of findings.filter(x => x.severity === item)) console.log(`  [${item}] ${entry.id}: ${entry.title}`);
  console.log(`\n確認 ${checks.length} 件 / 失敗 ${failures.length} 件 / 重大な問題 ${critical.length} 件（${result.seconds} 秒）。結果: ${path.relative(ROOT, path.join(OUT, 'results.json'))}`);
  if (failures.length || critical.length) {
    for (const failure of failures) console.error(`\n失敗: ${failure.name}\n${failure.message}`);
    process.exitCode = 1;
  }
}


function registerScenarios(scenario, ctx) {
  const { page, button, tab, radio, chip, idle, statusText, statusTone, dockText, panelText, shot, row, rowCheck, card, selectCount, snapshot, reset, extract, finding, ok, metrics, editCard, editRow, fact, toEdit, toConfirm, selectNone, selectAll, assertOnlyAllowedWrites, writeLabels, okWrites, backupJson, runSource, arm, progress, resultItem } = ctx;
  const SCOPE_LABEL = { fieldSettings: 'フィールド設定', layoutSettings: 'レイアウト設定', viewSettings: 'ビュー設定', reportSettings: 'グラフ設定', categories: 'カテゴリ設定', appSettings: '一般設定', processSettings: 'プロセス管理', actionSettings: 'アクション設定', pluginSettings: 'プラグイン(※)', customizeSettings: 'JS/CSS設定', appAcl: 'アプリ権限', fieldAcl: 'フィールド権限', recordPermissions: 'レコード権限', notifications: '通知設定', perRecordNotifications: 'レコード条件通知', reminderNotifications: 'リマインダー通知' };
  const allScopes = () => ALL_SCOPES.map(key => [SCOPE_LABEL[key], true]);
  /** 条件が成り立たないとき、失敗させずに既知の問題として記録する。 */
  const expectOr = (condition, id, severity, title, detail) => { if (!condition) finding(id, severity, title, detail); return !!condition; };
  const sections = ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'categories', 'appSettings', 'processSettings', 'actionSettings', 'pluginSettings', 'customizeSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications'];
  /** すべての項目の「選んだ変更」を外してから、指定の行だけを選ぶ。 */
  async function chooseOnly(ids) {
    const keys = await page.locator('[data-select-section]').evaluateAll(list => list.map(node => node.getAttribute('data-select-section')));
    for (const key of keys) if (await card(key).locator('[data-action="select-none"]').count()) await selectNone(key);
    for (const id of ids) {
      const target = row(id);
      if (!(await target.count())) {
        const key = id.split(':')[0];
        const toggle = card(key).locator('[data-action="toggle"]');
        if (await toggle.count()) await toggle.first().click();
      }
      await rowCheck(id).check();
    }
  }
  const counts = () => page.locator('[data-select-count]').evaluateAll(list => Object.fromEntries(list.map(node => [node.getAttribute('data-select-count'), node.innerText.replace('選んだ変更 ', '')])));

  scenario('source: 全項目の抽出', async () => {
    await reset(businessWorld());
    const t0 = Date.now();
    await extract({ scopes: allScopes() });
    metrics['抽出（全 16 項目・業務アプリ 1 組）'] = `${Date.now() - t0} ms`;
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', await statusText());
    const status = await statusText();
    assert.match(status, /^差分のある項目 15・差分なし 1（変更 \d+ 件）。反映する変更を選んでください。まだ書き込んでいません。$/);
    const now = await assertOnlyAllowedWrites('抽出');
    assert.equal(now.writes.length, 0, '抽出では何も書き込まない');
    assert.equal(now.deploys.length, 0);
    // 全項目の GET が、反映元（本番）・反映先（プレビュー）に対して届く
    const gets = new Set(now.calls.filter(call => call.method === 'GET').map(call => `${call.url}?${call.params?.app ?? ''}`));
    for (const endpoint of ['/app/settings.json', '/app/form/fields.json', '/app/form/layout.json', '/app/views.json', '/app/reports.json', '/app/status.json', '/app/plugins.json', '/app/customize.json', '/app/actions.json', '/app/acl.json', '/field/acl.json', '/record/acl.json', '/app/notifications/general.json', '/app/notifications/perRecord.json', '/app/notifications/reminder.json', '/app/categories.json']) {
      assert.ok(gets.has(`/k/v1${endpoint}?101`), `反映元の本番の ${endpoint} を取得する`);
      assert.ok(gets.has(`/k/v1/preview${endpoint}?202`), `反映先のプレビューの ${endpoint} を取得する`);
    }
    const perSection = await counts();
    const total = Object.values(perSection).reduce((sum, value) => sum + Number(value.split('/')[1]), 0);
    const reported = Number(/変更 (\d+) 件/.exec(status)[1]);
    // 「変更 N 件」は、項目ごとの「選んだ変更 x/y」の y の合計（選べる変更の数）にそろえる。単位の違いは「?」の吹き出しで説明する。
    assert.equal(reported, total, `「変更 ${reported} 件」と、項目ごとの選べる変更の合計 ${total} 件が一致する`);
    await page.locator('[data-extract-summary]').locator('xpath=ancestor::*[contains(@class,"kus-lp__card")][1]').getByRole('button', { name: /説明を表示/ }).click();
    assert.match(await panelText(), /「変更 N 件」は、下の項目で選べる変更の数です。レイアウト・アクセス権・通知・JS\/CSS の一覧などは、配置や一覧の全体を 1 件と数えます。/, '単位の違いを説明する');
    assert.equal(await page.locator('[data-target-pending="clean"]').count(), 1);
    await shot('source-extract-all');
    ok('source: 全 16 項目を抽出（GET のみ・書き込みなし）');
  });

  scenario('source: 粒度を変えて選び、入力欄と JSON で直して、本番まで', async () => {
    await reset(businessWorld());
    await extract({ scopes: allScopes() });
    const before = await snapshot();
    const target0 = before.apps['202'].prod;
    await chooseOnly([
      'fieldSettings:/properties/customer/required',
      'fieldSettings:/properties/amount/unit',
      'fieldSettings:/properties/status/options/保留',
      'fieldSettings:/properties/status/defaultValue',
      'fieldSettings:/properties/items/fields/qty/required',
      'fieldSettings:/properties/items/fields/item_kind/options/値引き',
      'fieldSettings:/properties/items/fields/discount',
      'viewSettings:/views/未完了/filterCond',
      'viewSettings:/views/担当別',
      'processSettings:/states/保留',
      'processSettings:/actions',
      'categories:/enabled', 'categories:/categories/東日本', 'categories:/categories/西日本',
      'appAcl:/rights', 'fieldAcl:/rights'
    ].filter(id => !id.startsWith('fieldAcl')));
    const chosen = await counts();
    assert.deepEqual(Object.fromEntries(Object.entries(chosen).filter(([, value]) => !value.startsWith('0/'))), { fieldSettings: '7/19', viewSettings: '2/7', processSettings: '2/2', appAcl: '1/1', categories: '3/3' }, '選んだ変更の数（項目ごと）');
    await shot('source-granular-select');
    await toEdit();
    const stageStatus = await statusText();
    // 入力欄: 単位記号を「万円」に、数量の必須はそのまま。JSON: 未完了の絞り込み条件を直す
    await editRow('fieldSettings', '/properties/amount/unit').locator('input').fill('万円');
    await editRow('fieldSettings', '/properties/amount/unit').locator('input').press('Tab');
    assert.match(await editCard('fieldSettings').locator('[data-edit-count]').innerText(), /修正した値 1/);
    await editCard('viewSettings').locator('[data-action="json-toggle"]').click();
    const area = editCard('viewSettings').locator('[data-json-area] textarea');
    const viewJson = JSON.parse(await area.inputValue());
    assert.equal(viewJson.views['未完了'].filterCond, 'status not in ("完了", "保留")', '送る一覧の設定は、反映先の一覧に選んだ値だけを反映したもの');
    assert.equal(viewJson.views['全件'].filterCond, '', '選んでいない一覧の値は反映先のまま');
    assert.deepEqual(Object.keys(viewJson.views), ['全件', '未完了', '月次', 'ダッシュボード', '担当別'], '反映先だけの一覧（ダッシュボード・月次）も残る');
    viewJson.views['未完了'].filterCond = 'status not in ("完了", "保留") and due != ""';
    await area.fill(JSON.stringify(viewJson, null, 2));
    await editCard('viewSettings').locator('[data-action="json-apply"]').click();
    assert.equal(await editCard('viewSettings').locator('[data-json-active]').isVisible(), true);
    await shot('source-granular-edit');
    assert.equal(stageStatus, '内容を確認し、必要なら直してください。まだ書き込んでいません。', '段階 3 では状態欄もその段階の文言にする（抽出直後の文言を残さない）');
    await toConfirm();
    assert.match(await fact('sections').innerText(), /反映する項目（5 項目）/);
    await shot('source-granular-confirm');
    await runSource();
    const done = await assertOnlyAllowedWrites('粒度の選択');
    assert.deepEqual(writeLabels(done), ['POST /app/form/fields.json', 'PUT /app/form/fields.json', 'PUT /app/views.json', 'PUT /app/status.json', 'PUT /app/acl.json', 'PUT /app/categories.json'], '書き込みは選んだ項目だけ（レイアウト・一般設定・グラフ・プラグイン・JS/CSS・アクション・通知は送らない）');
    const [add, update, views, process, acl, categories] = done.writes;
    assert.deepEqual(Object.keys(add.body.properties), ['items']);
    assert.deepEqual(Object.keys(add.body.properties.items.fields), ['discount'], '追加は値引き（テーブル内）だけ。顧客・送料・地域は追加しない');
    assert.deepEqual(Object.keys(update.body.properties).sort(), ['amount', 'customer', 'items', 'status'], '更新は選んだフィールドだけ');
    assert.equal(update.body.properties.customer.required, true);
    assert.equal(update.body.properties.customer.label, '顧客名', '選ばなかった表示名は反映先のまま');
    assert.equal(update.body.properties.customer.unique, false);
    assert.equal(update.body.properties.customer.maxLength, '64');
    assert.equal(update.body.properties.amount.unit, '万円', '入力欄で直した値');
    assert.equal(update.body.properties.amount.displayScale, '0', '選ばなかった小数桁数は反映先のまま');
    assert.deepEqual(Object.keys(update.body.properties.items.fields).sort(), ['item_kind', 'qty']);
    assert.equal(update.body.properties.items.fields.qty.required, true);
    assert.deepEqual(Object.keys(update.body.properties.status.options).sort(), ['保留', '完了', '対応中', '未対応'].sort());
    assert.equal(update.body.properties.status.defaultValue, '保留');
    const indexes = Object.values(update.body.properties.status.options).map(option => option.index).sort();
    assert.deepEqual(indexes, ['0', '1', '2', '3'], '選択肢の index は重複しない（追加で index が詰め直される）');
    assert.equal(views.body.views['未完了'].filterCond, 'status not in ("完了", "保留") and due != ""', 'JSON で直した絞り込み条件');
    assert.equal(views.body.views['全件'].filterCond, '', '選ばなかった一覧の値は反映先のまま');
    assert.deepEqual(views.body.views['担当別'].fields, ['record_no', 'owner', 'amount']);
    const prod = done.apps['202'].prod;
    assert.equal(done.apps['202'].prodRev, done.apps['202'].previewRev, '公開後は本番とプレビューの revision が一致');
    assert.deepEqual(prod.layoutSettings, target0.layoutSettings, '選ばなかったレイアウトは変わらない');
    assert.deepEqual(prod.appSettings, target0.appSettings, '選ばなかった一般設定は変わらない');
    assert.deepEqual(prod.reportSettings, target0.reportSettings);
    assert.deepEqual(prod.pluginSettings, target0.pluginSettings);
    assert.deepEqual(prod.customizeSettings, target0.customizeSettings);
    assert.deepEqual(prod.actionSettings, target0.actionSettings);
    assert.deepEqual(prod.recordPermissions, target0.recordPermissions);
    assert.deepEqual(prod.notifications, target0.notifications);
    assert.deepEqual(prod.fieldAcl, target0.fieldAcl);
    assert.equal(prod.fieldSettings.properties.customer.label, '顧客名');
    assert.equal(prod.fieldSettings.properties.total.expression, 'amount * (1 + tax_rate / 100)', '選ばなかった計算式は反映先のまま');
    assert.equal(prod.fieldSettings.properties.shipping, undefined, '選ばなかった追加フィールドは入らない');
    assert.equal(prod.fieldSettings.properties.items.fields.discount.type, 'NUMBER');
    assert.equal(prod.categories.enabled, true);
    assert.equal(prod.viewSettings.views['ダッシュボード'].html, '<div id="dash"></div>');
    assert.equal(done.downloads.length, 2);
    assert.equal(await statusText(), '5 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。');
    await shot('source-granular-result');
    ok('source: 粒度を変えて選ぶ・入力欄と JSON で直す・本番まで（送信内容と、選ばなかった値が反映先のまま残ること）');
  });

  /**
   * 選び方の組み合わせを 1 つ試す。画面が事前に止めるか、止めない場合は書き込みと結果の見え方がどうなるかを返す。
   */
  async function combo(ids, { edit, world, scopes } = {}) {
    await reset(world || businessWorld());
    await extract({ scopes: scopes || allScopes() });
    await chooseOnly(ids);
    const result = { blocked: false, blockers: '', next: '' };
    const nextButton = button('内容の修正へ');
    if (await nextButton.isDisabled()) {
      result.blocked = true;
      result.blockers = (await page.locator('[data-select-blockers]').innerText()).replace(/\s+/g, ' ');
      result.next = (await dockText()).replace(/\s+/g, ' ');
      return result;
    }
    result.notice = (await page.locator('[data-select-blockers]').innerText()).replace(/\s+/g, ' ');
    await toEdit();
    if (edit) await edit();
    if (await button('最終確認に進む').isDisabled()) {
      result.blocked = true; result.stage = 'edit';
      result.blockers = (await page.locator('[data-edit-blockers]').innerText()).replace(/\s+/g, ' ');
      result.next = (await dockText()).replace(/\s+/g, ' ');
      return result;
    }
    await toConfirm();
    await runSource('202', { ackPending: false });
    const now = await snapshot();
    Object.assign(result, {
      writes: writeLabels(now), errors: now.writes.filter(write => write.rejected).map(write => write.error), deploys: now.deploys.length,
      status: await statusText(), tone: await statusTone(), prodRev: now.apps['202'].prodRev, previewRev: now.apps['202'].previewRev, snap: now
    });
    return result;
  }


  /**
   * 選び方の組み合わせを 1 つ試す。画面が事前に止めるか、止めない場合は書き込みと結果の見え方がどうなるかを返す。
   */
  async function combo(ids, { edit, world, scopes } = {}) {
    await reset(world || businessWorld());
    await extract({ scopes: scopes || allScopes() });
    await chooseOnly(ids);
    const result = { blocked: false, blockers: '', next: '' };
    const checked = () => page.locator('.kus-ds-row input:checked').evaluateAll(list => list.map(node => node.closest('.kus-ds-row').getAttribute('data-change-id')));
    result.checkedAfterSelect = await checked();
    const nextButton = button('内容の修正へ');
    if (await nextButton.isDisabled()) {
      result.blocked = true;
      result.blockers = (await page.locator('[data-select-blockers]').innerText()).replace(/\s+/g, ' ');
      return result;
    }
    await toEdit();
    if (edit) await edit();
    if (await button('最終確認に進む').isDisabled()) {
      result.blocked = true; result.stage = 'edit';
      result.blockers = (await page.locator('[data-edit-blockers]').innerText()).replace(/\s+/g, ' ');
      return result;
    }
    await toConfirm();
    await runSource('202');
    const now = await snapshot();
    Object.assign(result, {
      writes: writeLabels(now), errors: now.writes.filter(write => write.rejected).map(write => write.error), okWrites: now.writes.filter(write => !write.rejected).length, deploys: now.deploys.length,
      status: await statusText(), tone: await statusTone(), result: (await page.locator('#kus-ds-stage-result').innerText()).replace(/\s+/g, ' '),
      prodRev: now.apps['202'].prodRev, previewRev: now.apps['202'].previewRev
    });
    return result;
  }

  scenario('source: kintone がエラーを返す選び方（事前に止めるか・止めないときの見え方）', async () => {
    const T = id => `fieldSettings:/properties/${id}`;
    // 1. 選択肢を追加せず初期値だけ → 必要な選択肢の追加を一緒に選ぶ（kintone に送る前に連動する）
    let r = await combo([T('status/defaultValue')]);
    assert.ok(r.checkedAfterSelect.includes(T('status/options/保留')), '初期値だけを選ぶと、必要な選択肢の追加も一緒に選ぶ');
    assert.equal(r.tone, 'ok', r.status);
    assert.equal(r.errors.length, 0);
    // 2. 入力欄で、選択肢にない初期値を入力 → 入力欄の段階で止め（最終確認へ進めない）、書き込みの前に分かる
    r = await combo([T('status/defaultValue')], { edit: async () => { await editRow('fieldSettings', '/properties/status/defaultValue').locator('input').fill('存在しない選択肢'); await editRow('fieldSettings', '/properties/status/defaultValue').locator('input').press('Tab'); } });
    assert.equal(r.blocked, true, '選択肢にない初期値は最終確認へ進めない');
    assert.equal(r.stage, 'edit');
    assert.match(r.blockers, /フィールド設定: .*の初期値「存在しない選択肢」が選択肢にありません。/);
    assert.equal((await snapshot()).writes.length, 0, '書き込みの前に止まる（バックアップも保存しない）');
    await shot('source-default-not-in-options');
    // 初期値を選択肢のどれかに直すと進める（ラジオボタンの初期値も、選択肢のどれかである必要がある）
    await editRow('fieldSettings', '/properties/status/defaultValue').locator('input').fill('保留');
    await editRow('fieldSettings', '/properties/status/defaultValue').locator('input').press('Tab');
    assert.equal(await button('最終確認に進む').isDisabled(), false, '初期値が選択肢（連動して選んだ「保留」）のどれかになれば進める');
    // 3. 計算式だけ（反映先に無い追加フィールドを参照）→ 参照する追加フィールドの追加も一緒に選ぶ（初期値と選択肢の連動と同じ）
    r = await combo([T('total/expression')]);
    assert.ok(r.checkedAfterSelect.includes(T('shipping')), '計算式を選ぶと、参照する追加フィールド（送料）の追加も一緒に選ぶ');
    assert.equal(r.errors.length, 0, '連動して選んだので、kintone に拒否されない');
    assert.equal(r.tone, 'ok', r.status);
    assert.match(r.result, /1 項目を反映先プレビューへ反映し/);
    // 4. 一覧の絞り込み条件・レコード権限の条件が、追加しないフィールド（地域）を参照 → 参照する追加フィールドの追加も一緒に選ぶ
    for (const [id, label] of [['viewSettings:/views/全件/filterCond', '一覧の絞り込み条件'], ['recordPermissions:/rights', 'レコード権限の条件']]) {
      r = await combo([id]);
      assert.ok(r.checkedAfterSelect.includes(T('region')), `${label}を選ぶと、参照する追加フィールド（地域）の追加も一緒に選ぶ`);
      assert.equal(r.errors.length, 0, `${label}: 連動して選んだので、kintone に拒否されない`);
      assert.equal(r.tone, 'ok', r.status);
    }
    ok('source: 初期値・計算式・条件が参照する追加フィールドは、書き込みの前に止めるか連動して選ぶ');
    // 5. 事前に止める組み合わせ（表示フィールド・レイアウト・フィールド権限・グラフ）は理由が分かること
    for (const [id, field] of [['viewSettings:/views/全件/fields', 'region'], ['layoutSettings:/layout', 'shipping'], ['fieldAcl:/rights', 'shipping'], ['reportSettings:/reports/地域別', 'region']]) {
      r = await combo([id]);
      assert.equal(r.blocked, true, `${id} は追加フィールドを選ばないと進めない`);
      assert.match(r.blockers, new RegExp(`参照するフィールド「${field}」が反映先にありません。反映元にあるフィールドなので、フィールド設定で「${field}」の追加も選ぶか、この項目を除外してください。`));
    }
    // 6. プロセスの actions だけ → 必要なステータスの追加を連動して選ぶ。ラジオボタンの選択肢追加は index が詰め直される
    r = await combo(['processSettings:/actions']);
    assert.ok(r.checkedAfterSelect.includes('processSettings:/states/保留'));
    assert.equal(r.tone, 'ok', r.status);
    r = await combo([T('priority/options/緊急')]);
    assert.equal(r.tone, 'ok', r.status);
    ok('source: kintone がエラーを返す選び方');
  });

  scenario('source: 反映先が反映処理中・競合・書き込みの途中で更新', async () => {
    // a. 反映先が前回の反映を処理中: 抽出の時点で示し、最終確認へ進めない（処理が終わってから抽出し直す）
    await reset(businessWorld());
    await page.evaluate(() => window.__k.startProcessing(['202']));
    await extract({ scopes: allScopes() });
    const processingMessage = '反映先は前回の反映を kintone が処理中です。完了してから抽出し直してください。';
    assert.match(await page.locator('[data-target-deploy-status="processing"]').innerText(), /反映先は反映処理中です[\s\S]*反映先は前回の反映を kintone が処理中です。完了してから抽出し直してください。/, '抽出結果に示す');
    const selectable = Object.values(await counts()).reduce((sum, value) => sum + Number(value.split('/')[1]), 0);
    assert.equal(await statusText(), `差分のある項目 15・差分なし 1（変更 ${selectable} 件）。${processingMessage}まだ書き込んでいません。`);
    assert.equal(await statusTone(), 'warn');
    assert.equal(await button('内容の修正へ').isDisabled(), true, '処理中の反映先では、先へ進めない');
    assert.match(await dockText(), new RegExp(`次に進むには：${processingMessage}`));
    assert.match(await page.locator('[data-select-blockers]').innerText(), /反映先は前回の反映を kintone が処理中です/);
    assert.equal((await snapshot()).writes.length, 0);
    // 処理が終わったら、抽出し直して進める
    await page.evaluate(() => window.__k.finishProcessing(['202']));
    await button('対象を変更').click();
    await button('抽出し直す').click(); await idle();
    assert.equal(await page.locator('[data-target-deploy-status]').count(), 0, '処理中でなければ注記は出ない');
    await chooseOnly(['fieldSettings:/properties/customer/required']);
    assert.equal(await button('内容の修正へ').isDisabled(), false);
    // 抽出のあとで処理中になった場合（確認できない）は、書き込みで拒否され、1 件も書き込めていないので「プレビューは変わっていません」と示す
    await toEdit(); await toConfirm();
    await page.evaluate(() => window.__k.startProcessing(['202']));
    await runSource('202');
    const now = await assertOnlyAllowedWrites('反映先が処理中');
    assert.equal(now.deploys.length, 0);
    assert.deepEqual(writeLabels(now), ['PUT /app/form/fields.json (拒否)']);
    assert.match(await page.locator('#kus-ds-stage-result').innerText(), /アプリの設定を反映中のため、設定を変更できません。/, '失敗の理由を画面に示す');
    const noWritten = await page.locator('[data-deploy-skipped-note]').innerText();
    assert.match(noWritten, /反映先プレビューへの書き込みが完了しなかった項目があるため[\s\S]*反映先プレビューは変わっていません。/);
    assert.doesNotMatch(noWritten, /書き込み済み|一部だけ|続けて本番へ反映できます/, '1 件も書き込めていないのに「書き込み済み」と言わない');
    assert.equal(await page.locator('[data-deploy-skipped-note]').getAttribute('data-preview-write'), 'none');
    ok('source: 反映先が反映処理中なら抽出で示して進めない・書き込めなかったときは「変わっていません」');
    // b. 書き込みの途中で、別の利用者が反映先のプレビューを更新（2 件目の書き込みが GAIA_CO02）
    await reset(businessWorld());
    await extract({ scopes: allScopes() });
    await chooseOnly(['fieldSettings:/properties/customer/required', 'viewSettings:/views/未完了/filterCond', 'appAcl:/rights']);
    await toEdit(); await toConfirm();
    await page.evaluate(() => { window.__k.bumpAfterWrite = { after: 1, mutate: preview => { preview.appSettings.description = '別の利用者の変更'; } }; });
    await runSource('202');
    const conflict = await assertOnlyAllowedWrites('書き込みの途中の競合');
    assert.deepEqual(writeLabels(conflict), ['PUT /app/form/fields.json', 'PUT /app/views.json (拒否)'], '2 件目で GAIA_CO02 になり、残りは送らない');
    assert.match(conflict.writes[1].error, /^GAIA_CO02/);
    assert.equal(conflict.deploys.length, 0, '本番へは反映しない');
    const text = await page.locator('#kus-ds-stage-result').innerText();
    assert.match(text, /revision 競合/);
    assert.match(text, /本番へは反映していません/);
    // 1 項目は書き込めた（残りは書き込めていない）ので、「一部だけ書き込まれています」と示す
    const partialNote = await page.locator('[data-deploy-skipped-note]').innerText();
    assert.match(partialNote, /反映先プレビューには一部だけ書き込まれています。差分を取得し直して現在の状態を確認してください。/);
    assert.doesNotMatch(partialNote, /反映先プレビューには書き込み済みです|続けて本番へ反映できます/);
    assert.match(await statusText(), /^3 項目中 1 項目を反映先プレビューへ反映しました。失敗 1 項目、未実行 1 項目/);
    await shot('source-conflict-mid-write');
    ok('source: 書き込みの途中の競合');
  });
}

// ---------------------------------------------------------------------------
// 「プレビューの変更を公開」の合成アプリ
// ---------------------------------------------------------------------------
/** 本番とプレビューでフィールドが 1 つ異なる（追加）アプリ。 */
function changedApp(id, name, extra = {}) {
  const base = businessSettings(name, 'prod');
  const preview = clone(base);
  preview.fieldSettings.properties[`added_${id}`] = f.text(`added_${id}`, '追加項目');
  preview.layoutSettings.layout.push({ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: `added_${id}`, size: { width: '200' } }] });
  return { id: String(id), name, prodRevision: 10, previewRevision: 12, production: base, preview, ...extra };
}
/** プレビューの変更がない（revision 一致）アプリ。 */
const cleanApp = (id, name) => ({ id: String(id), name, prodRevision: 8, previewRevision: 8, production: businessSettings(name, 'prod') });
function publishWorld({ count = 3, extra = [], engine = {} } = {}) {
  const apps = [masterApp()];
  for (let i = 0; i < count; i += 1) apps.push(changedApp(101 + i, `営業管理${i + 1}`));
  return { apps: [...apps, ...extra], writableApps: [], files: BUSINESS_FILES, ...engine };
}

function registerPublish(scenario, ctx) {
  const { page, button, tab, radio, idle, statusText, statusTone, panelText, shot, snapshot, reset, finding, ok, metrics, reviewRow, resultItem, assertOnlyAllowedWrites, setTargets, chooseDetail, inspect, toPublishConfirm, armPublish, runPublish, publishRunButton, backupJson, extract, runSource, toEdit, toConfirm, selectNone, rowCheck, card, writeLabels } = ctx;
  const expectOr = (condition, id, severity, title, detail) => { if (!condition) finding(id, severity, title, detail); return !!condition; };
  const SCOPE_LABEL = { fieldSettings: 'フィールド設定', layoutSettings: 'レイアウト設定', viewSettings: 'ビュー設定', reportSettings: 'グラフ設定', categories: 'カテゴリ設定', appSettings: '一般設定', processSettings: 'プロセス管理', actionSettings: 'アクション設定', pluginSettings: 'プラグイン(※)', customizeSettings: 'JS/CSS設定', appAcl: 'アプリ権限', fieldAcl: 'フィールド権限', recordPermissions: 'レコード権限', notifications: '通知設定', perRecordNotifications: 'レコード条件通知', reminderNotifications: 'リマインダー通知' };
  const allScopesFor = () => ALL_SCOPES.map(key => [SCOPE_LABEL[key], true]);
  async function chooseOnlyFirst() {
    const keys = await page.locator('[data-select-section]').evaluateAll(list => list.map(node => node.getAttribute('data-select-section')));
    for (const key of keys) if (await card(key).locator('[data-action="select-none"]').count()) await selectNone(key);
    await rowCheck('fieldSettings:/properties/customer/required').check();
  }

  scenario('publish: 1 アプリを本番へ（revision と送信内容）', async () => {
    await reset(publishWorld({ count: 1 }), { flow: 'publish' });
    await setTargets(['101']);
    await inspect();
    assert.equal(await tab('変更を確認').getAttribute('aria-selected'), 'true', await statusText());
    assert.match(await reviewRow('101').innerText(), /変更あり[\s\S]*フィールド設定[\s\S]*本番 10 → プレビュー 12/);
    await reviewRow('101').getByRole('button', { name: '詳細を表示' }).click();
    await shot('publish-1-review');
    await toPublishConfirm();
    await shot('publish-1-confirm');
    await runPublish(101);
    const now = await assertOnlyAllowedWrites('公開 1 アプリ', []);
    assert.equal(now.writes.length, 0, '設定の書き込みは無い（deploy.json の依頼だけ）');
    assert.deepEqual(now.deploys.map(item => item.body), [{ apps: [{ app: '101', revision: '12' }] }], '確認時のプレビュー revision を添えて 1 回依頼');
    assert.equal(now.apps['101'].prodRev, '12');
    assert.equal(now.apps['101'].previewRev, '12');
    assert.ok(now.apps['101'].prod.fieldSettings.properties.added_101, '本番へ反映される');
    assert.equal(now.downloads.length, 1);
    assert.ok(now.downloads[0].seq < now.deploys[0].seq, 'バックアップが依頼より前');
    assert.equal(await statusText(), '1 アプリを本番へ反映しました。');
    assert.equal(await statusTone(), 'ok');
    await shot('publish-1-result');
    ok('publish: 1 アプリ');
  });

  scenario('publish: 複数アプリを 1 アプリずつ（未公開なし・取得失敗・処理中を含む）', async () => {
    const world = publishWorld({ count: 3, extra: [cleanApp(150, '在庫'), changedApp(160, '権限なし', { deniedPreview: true }), changedApp(170, '処理中のアプリ')] });
    await reset({ ...world, processMs: 25 }, { flow: 'publish' });
    await page.evaluate(() => window.__k.startProcessing(['170']));
    await setTargets(['101', '102', '103', '150', '160', '170']);
    await inspect();
    const review = await panelText();
    assert.match(review, /変更あり 3/);
    assert.match(review, /取得失敗 1/);
    assert.match(review, /反映処理中 1/);
    assert.match(await reviewRow('170').innerText(), /反映処理中/);
    assert.match(await reviewRow('160').innerText(), /取得失敗/);
    assert.equal(await button('最終確認に進む').isDisabled(), true, '取得失敗・処理中を選んだままでは進めない');
    await reviewRow('160').getByRole('button', { name: '対象から外す' }).click();
    await reviewRow('170').getByRole('button', { name: '対象から外す' }).click();
    assert.equal(await button('最終確認に進む').isEnabled(), true);
    await shot('publish-n-review');
    await toPublishConfirm();
    const t0 = Date.now();
    await runPublish(3);
    metrics['公開 3 アプリ（1 アプリずつ・待ち時間の既定）'] = `${Date.now() - t0} ms`;
    const now = await assertOnlyAllowedWrites('公開 N アプリ', []);
    assert.deepEqual(now.deploys.map(item => item.body.apps.map(entry => entry.app)), [['101'], ['102'], ['103']], '1 アプリずつ依頼する');
    for (const id of ['101', '102', '103']) assert.equal(now.apps[id].prodRev, '12');
    assert.equal(now.apps['150'].prodRev, '8', '未公開の変更なしのアプリには触れない');
    assert.equal(now.apps['170'].prodRev, '10');
    assert.equal(await statusText(), '3 アプリを本番へ反映しました。');
    await shot('publish-n-result');
    ok('publish: 複数アプリを 1 アプリずつ');
  });

  scenario('publish: まとめて反映で 1 件 FAIL（全件取り消し）', async () => {
    await reset({ ...publishWorld({ count: 3 }), failApps: ['102'] }, { flow: 'publish' });
    await setTargets(['101', '102', '103']);
    await chooseDetail('まとめて反映');
    await inspect(); await toPublishConfirm(); await runPublish(3);
    const now = await assertOnlyAllowedWrites('まとめて反映の失敗', []);
    assert.equal(now.deploys.length, 1);
    assert.deepEqual(now.deploys[0].body.apps.map(entry => entry.app), ['101', '102', '103']);
    assert.deepEqual(['101', '102', '103'].map(id => now.apps[id].status), ['CANCEL', 'FAIL', 'CANCEL']);
    for (const id of ['101', '102', '103']) assert.equal(now.apps[id].prodRev, '10', '本番は変わらない');
    assert.match(await resultItem('101').innerText(), /取り消し（ほかのアプリの失敗）/);
    assert.match(await resultItem('102').innerText(), /失敗/);
    assert.equal(await statusTone(), 'err');
    await shot('publish-atomic-fail');
    ok('publish: まとめて反映の失敗');
  });

  scenario('publish: 変更を中止（revert）', async () => {
    await reset(publishWorld({ count: 2 }), { flow: 'publish' });
    await radio('変更を中止（プレビューを本番に戻す）').check();
    await setTargets(['101', '102']);
    await inspect(); await toPublishConfirm();
    assert.equal(await publishRunButton().innerText(), '確認した 2 アプリの変更を中止');
    await runPublish(2);
    const now = await assertOnlyAllowedWrites('変更を中止', []);
    assert.deepEqual(now.deploys.map(item => item.body), [{ apps: [{ app: '101', revision: '12' }], revert: true }, { apps: [{ app: '102', revision: '12' }], revert: true }]);
    for (const id of ['101', '102']) {
      assert.equal(now.apps[id].prodRev, '10', '本番は変わらない');
      assert.equal(now.apps[id].previewRev, '10', 'プレビューが本番に戻る');
      assert.equal(now.apps[id].preview.fieldSettings.properties[`added_${id}`], undefined);
    }
    const backup = await backupJson(0);
    assert.equal(backup.environment, 'preview', '中止前のプレビューを保存する');
    assert.match(await statusText(), /^2 アプリのプレビューの変更を中止しました。$/);
    ok('publish: 変更を中止');
  });

  scenario('publish: 競合（確認後にプレビューが更新された）', async () => {
    // 1) 最終確認のあと、実行前に更新 → どのアプリにも依頼せず止める
    await reset(publishWorld({ count: 2 }), { flow: 'publish' });
    await setTargets(['101', '102']);
    await inspect(); await toPublishConfirm(); await armPublish(2);
    await page.evaluate(() => window.__k.bumpPreview('102'));
    await publishRunButton().click(); await idle();
    let now = await assertOnlyAllowedWrites('競合（実行前）', []);
    assert.equal(now.deploys.length, 0, '1 件も依頼しない');
    assert.equal(now.downloads.length, 0, 'バックアップも保存しない');
    assert.match(await statusText(), /^反映前の確認で止めました。まだ本番へは反映していません。/);
    assert.match(await resultItem('102').innerText(), /確認後に更新/);
    await shot('publish-conflict-before');
    // 2) 1 アプリずつ反映の途中（101 の反映中）に 102 が更新された → 102 は依頼せず「確認後に更新」
    await reset({ ...publishWorld({ count: 2 }), processMs: 400 }, { flow: 'publish' });
    await setTargets(['101', '102']);
    await inspect(); await toPublishConfirm(); await armPublish(2);
    await publishRunButton().click();
    await page.waitForFunction(() => window.__k.deploys.length === 1);
    await page.evaluate(() => window.__k.bumpPreview('102'));
    await idle();
    now = await assertOnlyAllowedWrites('競合（実行中）', []);
    assert.deepEqual(now.deploys.map(item => item.body.apps[0].app), ['101'], '102 は依頼しない');
    assert.equal(now.apps['101'].prodRev, '12');
    assert.equal(now.apps['102'].prodRev, '10');
    assert.match(await resultItem('102').innerText(), /確認後に更新/);
    await shot('publish-conflict-during');
    ok('publish: 競合');
  });

  scenario('publish: 1 件 FAIL（残りを実行しない／残りも続ける）', async () => {
    for (const stop of [true, false]) {
      await reset({ ...publishWorld({ count: 3 }), failApps: ['102'] }, { flow: 'publish' });
      await setTargets(['101', '102', '103']);
      if (!stop) await chooseDetail('残りも続ける');
      await inspect(); await toPublishConfirm(); await runPublish(3);
      const now = await assertOnlyAllowedWrites(`FAIL（${stop ? '止める' : '続ける'}）`, []);
      assert.deepEqual(now.deploys.map(item => item.body.apps[0].app), stop ? ['101', '102'] : ['101', '102', '103']);
      assert.equal(now.apps['101'].prodRev, '12');
      assert.equal(now.apps['102'].prodRev, '10');
      assert.equal(now.apps['103'].prodRev, stop ? '10' : '12');
      assert.match(await resultItem('102').innerText(), /失敗/);
      assert.match(await resultItem('103').innerText(), stop ? /未実行/ : /成功/);
      assert.equal(await statusTone(), 'warn');
      await shot(`publish-fail-${stop ? 'stop' : 'continue'}`);
    }
    // 失敗・未実行だけ選び直す → 確認し直すと 102 と 103 が残る（FAIL は本番もプレビューも変わらない）
    await reset({ ...publishWorld({ count: 3 }), failApps: ['102'] }, { flow: 'publish' });
    await setTargets(['101', '102', '103']);
    await inspect(); await toPublishConfirm(); await runPublish(3);
    await button('失敗・未実行だけ選び直す').click();
    await idle();
    await page.evaluate(() => window.__k.failApps.clear());
    await inspect();
    assert.match(await panelText(), /変更あり 2/, '失敗の 102 と未実行の 103 が残る');
    ok('publish: FAIL');
  });

  scenario('publish: 中止（完了待ち）→ kintone 側で完了 → 確認し直す', async () => {
    await reset({ ...publishWorld({ count: 2 }), processMs: 3000 }, { flow: 'publish' });
    await setTargets(['101', '102']);
    await inspect(); await toPublishConfirm(); await armPublish(2);
    await publishRunButton().click();
    await page.waitForFunction(() => window.__k.deploys.length === 1);
    await page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await idle();
    const now = await assertOnlyAllowedWrites('中止', []);
    assert.equal(now.deploys.length, 1, '依頼済みの 1 件だけ');
    assert.match(await statusText(), /^中止しました（0\/2 アプリを反映、/);
    assert.match(await resultItem('101').innerText(), /完了を確認できない/);
    assert.match(await resultItem('102').innerText(), /未実行/);
    await shot('publish-cancel');
    // kintone 側では処理が続き、完了する
    await page.waitForTimeout(3200);
    await button('失敗・未実行だけ選び直す').click(); await idle();
    await inspect();
    const review = await panelText();
    expectOr(/未公開の変更なし 1/.test(review), 'publish-cancel-recheck', 'medium', '中止後に確認し直しても、kintone 側で完了した 101 が「未公開の変更なし」にならない', { repro: '2 アプリを反映 → 1 件目の完了待ちで「処理を中止」→ kintone 側で完了 → 「失敗・未実行だけ選び直す」から確認し直す。', expected: '完了した 101 は「未公開の変更なし」、未実行の 102 は「変更あり」。', actual: review.slice(0, 400) });
    ok('publish: 中止と確認し直し');
  });

  scenario('publish: 反映処理中の書き込みはエラー（反映元アプリから本番へ）', async () => {
    await reset(businessWorld());
    // 抽出の時点で反映先が処理中だと、抽出結果に示して先へ進めない（source のシナリオで検証）。ここは抽出のあとに処理中になった場合
    await extract({ scopes: allScopesFor() });
    await chooseOnlyFirst();
    await toEdit(); await toConfirm();
    await page.evaluate(() => window.__k.startProcessing(['202']));
    await runSource('202');
    const now = await snapshot();
    assert.deepEqual(writeLabels(now), ['PUT /app/form/fields.json (拒否)']);
    assert.equal(now.deploys.length, 0);
    console.log('  書き込み:', writeLabels(now), '結果:', (await statusText()).replace(/\s+/g, ' '));
    await shot('source-while-processing');
  });
}

// ---------------------------------------------------------------------------
// 規模の検証用: フィールド 300（テーブル含む）・一覧 50 のアプリ
// ---------------------------------------------------------------------------
/**
 * variant 'prod' は反映先、'dev' は反映元（すべてのフィールドの表示名と必須などが違い、変更が 1000 件を超える）。
 * フィールド数は 300（テーブル 8 つ + テーブル内 12 × 8 + ほか 196）。一覧は 50（表形式 46・カレンダー 2・カスタマイズ 2）。
 */
function bigSettings(name, variant) {
  const dev = variant === 'dev';
  const fields = [...f.system()];
  const layout = [];
  const mk = (code, kind, i) => {
    const label = `${dev ? '【新】' : ''}項目${i}`;
    switch (kind % 6) {
      case 0: return f.text(code, label, { required: dev && i % 2 === 0, unique: dev && i % 3 === 0, maxLength: dev ? '100' : '64', minLength: dev ? '1' : '' });
      case 1: return f.number(code, label, { unit: dev ? '件' : '', displayScale: dev ? '1' : '0', minValue: dev ? '0' : '' });
      case 2: return f.choice('DROP_DOWN', code, label, dev ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'], dev ? 'D' : 'A', { required: dev });
      case 3: return f.choice('CHECK_BOX', code, label, ['X', 'Y', 'Z'], dev ? ['X', 'Y'] : ['X']);
      case 4: return f.date(code, label, { required: dev, defaultNowValue: dev });
      default: return f.memo(code, label, { required: dev && i % 2 === 1, defaultValue: dev ? 'メモ' : '' });
    }
  };
  const top = [];
  for (let i = 0; i < 196; i += 1) { const field = mk(`fld_${i}`, i, i); fields.push(field); top.push(field); }
  for (let i = 0; i < 98; i += 2) layout.push({ type: 'ROW', fields: [cell(top[i]), cell(top[i + 1])] });
  for (let t = 0; t < 8; t += 1) {
    const children = [];
    for (let i = 0; i < 12; i += 1) children.push(mk(`t${t}_c${i}`, i + t, i + 200));
    const table = f.table(`tbl_${t}`, children);
    fields.push(table);
    layout.push({ type: 'SUBTABLE', code: `tbl_${t}`, fields: children.map(child => cell(child, '120')) });
  }
  for (let i = 98; i < 196; i += 2) layout.push({ type: 'ROW', fields: [cell(top[i]), cell(top[i + 1])] });
  const views = {};
  for (let v = 0; v < 50; v += 1) {
    const name2 = `一覧${v + 1}`;
    const cols = [top[v % 196].code, top[(v + 7) % 196].code, top[(v + 13) % 196].code, ...(dev ? [top[(v + 21) % 196].code] : [])];
    if (v < 46) views[name2] = view.list(name2, v, ['record_no', ...cols], dev ? `${top[v % 196].code} != ""` : '', dev ? `${top[(v + 7) % 196].code} desc` : 'record_no desc');
    else if (v < 48) views[name2] = view.calendar(name2, v, 'fld_4', dev ? 'fld_0' : 'fld_6');
    else views[name2] = view.custom(name2, v, dev ? '<div class="v2"></div>' : '<div class="v1"></div>');
  }
  const settings = JSON.parse(JSON.stringify({ appSettings: businessSettings(name, variant).appSettings, fieldSettings: { properties: props(fields) }, layoutSettings: { layout }, viewSettings: { views } }));
  return settings;
}
const bigWorld = () => ({
  apps: [
    { id: '101', name: '大規模（開発）', prodRevision: 20, previewRevision: 20, production: bigSettings('大規模（開発）', 'dev') },
    { id: '202', name: '大規模', prodRevision: 10, previewRevision: 10, production: bigSettings('大規模', 'prod') }
  ],
  latency: 30
});

function registerScale(scenario, ctx) {
  const { page, button, tab, radio, chip, idle, statusText, dockText, panelText, shot, row, rowCheck, card, selectCount, snapshot, reset, extract, finding, ok, metrics, editCard, toEdit, toConfirm, selectNone, selectAll, assertOnlyAllowedWrites, writeLabels, runSource, setTargets, inspect, toPublishConfirm, armPublish, publishRunButton, K, skipScale, appInput, rowsOf, chooseDetail, resultItem } = ctx;
  const expectOr = (condition, id, severity, title, detail) => { if (!condition) finding(id, severity, title, detail); return !!condition; };
  const SCOPE_LABEL = { fieldSettings: 'フィールド設定', layoutSettings: 'レイアウト設定', viewSettings: 'ビュー設定' };
  const longTasks = () => page.evaluate(() => { const list = window.__long.splice(0); return { max: Math.max(0, ...list), total: list.reduce((a, b) => a + b, 0), count: list.length }; });
  /** 操作の所要時間（ms）と、その間にメインスレッドを塞いだ最長の時間（ms）を記録する。 */
  async function timed(label, fn) {
    await longTasks();
    const t0 = Date.now();
    const value = await fn();
    const ms = Date.now() - t0;
    const long = await longTasks();
    metrics[label] = `${ms} ms（最長の長時間処理 ${long.max} ms・合計 ${long.total} ms）`;
    return { ms, long, value };
  }
  const cardText = key => card(key).innerText();

  scenario('scale: フィールド 300・一覧 50 のアプリ同士（抽出・選択・操作の時間）', async () => {
    if (ctx.skipScale) return;
    await reset(bigWorld());
    const total = await page.evaluate(() => { const p = window.__k.apps['101'].prod.fieldSettings.properties; let n = 0; for (const d of Object.values(p)) { n += 1; if (d.type === 'SUBTABLE') n += Object.keys(d.fields).length; } return { fields: n, views: Object.keys(window.__k.apps['101'].prod.viewSettings.views).length }; });
    assert.equal(total.views, 50);
    assert.ok(total.fields >= 300, `フィールド数 ${total.fields}`);
    metrics['規模: 反映元のフィールド数（システム・テーブル・テーブル内を含む）'] = total.fields;
    const ex = await timed('抽出（フィールド 300・一覧 50 の 2 アプリ。応答 30 ms）', async () => { await extract({ scopes: [['レイアウト設定', true], ['ビュー設定', true]] }); });
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', await statusText());
    const status = await statusText();
    const count = Number(/変更 (\d+) 件/.exec(status)[1]);
    metrics['規模: 差分の変更件数（要約の表示）'] = count;
    assert.ok(count >= 1000, `変更が 1000 件を超える（${count}）`);
    await shot('scale-select');
    const counts = await page.locator('[data-select-count]').evaluateAll(list => Object.fromEntries(list.map(node => [node.getAttribute('data-select-count'), node.innerText])));
    metrics['規模: 選べる変更（項目ごと）'] = counts;
    const closedRows = await page.locator('.kus-ds-row').count();
    await timed('操作: 畳んだ「フィールド設定」の変更（995 件）を開く', async () => { await card('fieldSettings').locator('[data-action="toggle"]').first().click(); await page.waitForSelector('[data-select-section="fieldSettings"] .kus-ds-row'); });
    metrics['規模: 畳んだ状態の描画行数 / 開いた直後の描画行数（フィールド設定）'] = `${closedRows} / ${await card('fieldSettings').locator('.kus-ds-row').count()}`;
    await shot('scale-select-open');
    await timed('操作: フィールド設定の「すべて外す」', async () => { await selectNone('fieldSettings'); await page.waitForFunction(() => /^選んだ変更 0\//.test(document.querySelector('[data-select-count="fieldSettings"]').innerText)); });
    await timed('操作: フィールド設定の「すべて選ぶ」', async () => { await selectAll('fieldSettings'); await page.waitForFunction(() => { const m = /^選んだ変更 (\d+)\/(\d+)/.exec(document.querySelector('[data-select-count="fieldSettings"]').innerText); return m && m[1] === m[2]; }); });
    await timed('操作: ビュー設定の「すべて外す」→「すべて選ぶ」', async () => { await selectNone('viewSettings'); await selectAll('viewSettings'); });
    // 絞り込み
    const keyword = page.locator('[data-select-filter="keyword"]');
    await timed('操作: キーワードで絞り込み（項目123）', async () => { await keyword.fill('項目123'); await page.waitForFunction(() => /件/.test(document.querySelector('.kus-ds-filter__count')?.innerText || '') || true); await page.waitForTimeout(50); });
    const filtered = await page.locator('.kus-ds-filter__count').innerText();
    await timed('操作: 絞り込み中の「表示中をすべて外す」', async () => { await selectNone('fieldSettings'); });
    const afterNone = await selectCount('fieldSettings').innerText();
    await timed('操作: 種類「追加」へ絞り込み', async () => { await page.locator('[data-select-filter="kind"]').selectOption('追加'); await page.waitForTimeout(50); });
    await keyword.fill('');
    await page.locator('[data-select-filter="kind"]').selectOption('all');
    await page.waitForTimeout(100);
    metrics['規模: 絞り込み後の表示'] = `${filtered}／外した後 ${afterNone}`;
    await selectAll('fieldSettings');
    const rows = await page.locator('.kus-ds-row').count();
    metrics['規模: 選択画面の描画済みの行数（全変更に対して）'] = rows;
    expectOr(rows < count, 'scale-select-renders-all', 'medium', '変更 1000 件超の選択画面で、すべての行を一度に描画している', { repro: 'フィールド 300・一覧 50 のアプリ同士を抽出する。', expected: '件数が多い項目は畳むか、一部だけ描画する。', actual: `${rows} 行を描画（変更 ${count} 件）。` });
    // 修正・最終確認
    const edit = await timed('操作: 「内容の修正へ」（1000 件超を選んだまま）', async () => { await toEdit(); });
    await timed('操作: フィールド設定を「JSONで編集」', async () => { await editCard('fieldSettings').locator('[data-action="json-toggle"]').click(); await page.locator('[data-edit-section="fieldSettings"] [data-json-area] textarea').waitFor(); });
    const jsonSize = await page.locator('[data-edit-section="fieldSettings"] [data-json-area] textarea').evaluate(node => node.value.length);
    metrics['規模: フィールドの JSON の文字数'] = jsonSize;
    await editCard('fieldSettings').locator('[data-action="json-toggle"]').click();
    await shot('scale-edit');
    await timed('操作: 「最終確認に進む」', async () => { await toConfirm(); });
    await shot('scale-confirm');
    const run = await timed('実行: 反映先プレビューへ書き込み → 本番へ反映（応答 30 ms）', async () => { await runSource('202'); });
    const now = await assertOnlyAllowedWrites('規模: 実行');
    assert.equal(now.apps['202'].prodRev, now.apps['202'].previewRev);
    metrics['規模: 書き込み'] = writeLabels(now).join(', ');
    const body = JSON.stringify(now.writes.find(write => write.key === 'fieldSettings' && write.method === 'PUT')?.body || {});
    metrics['規模: フィールド PUT の本文の文字数'] = body.length;
    assert.equal(await statusTone2(), 'ok');
    await shot('scale-result');
    ok('scale: フィールド 300・一覧 50');
  });

  async function statusTone2() { return page.locator('.kus-lp__status').getAttribute('data-tone'); }

  scenario('scale: 「プレビューの変更を公開」1000 アプリ（確認と 1 アプリずつ反映）', async () => {
    if (ctx.skipScale) return;
    const N = Number(process.env.KUS_EXPLORE_APPS || 1000);
    await reset({ apps: [], bulk: { count: N, startId: 1001 }, latency: 25, processMs: 20, writableApps: [] }, { flow: 'publish' });
    // 反映の完了待ちの間隔（既定 1 秒〜）は 1/50 に縮めて計測する（応答の遅延 25 ms は縮めない）。
    await page.evaluate(() => window.__k.timeScale(50));
    const ids = Array.from({ length: N }, (_, i) => String(1001 + i));
    const set = await timed(`対象の入力（${N} 件をカンマ区切りで貼り付け）`, async () => { await setTargets(ids); });
    const rowCount = await rowsOf().count();
    metrics['規模: 対象アプリの行数'] = rowCount;
    assert.equal(rowCount, N);
    await shot('scale-publish-targets');
    const insp = await timed(`未公開の変更を確認（${N} アプリ・応答 25 ms）`, async () => { await inspect(); });
    assert.equal(await tab('変更を確認').getAttribute('aria-selected'), 'true', await statusText());
    const review = await panelText();
    assert.match(review, new RegExp(`変更あり ${N}`));
    const rendered = await page.locator('tr.kus-dp-row').count();
    metrics['規模: 確認の表の描画済みの行数'] = rendered;
    const getCount = await page.evaluate(() => window.__k.calls.filter(call => call.method === 'GET').length);
    metrics[`規模: 確認の GET の回数（${N} アプリ）`] = getCount;
    await shot('scale-publish-review');
    await timed('操作: 「選択を解除」→「変更ありをすべて選択」', async () => { await button('選択を解除').click(); await button('変更ありをすべて選択').click(); });
    await timed('操作: 「最終確認に進む」', async () => { await toPublishConfirm(); });
    // 1 アプリずつで件数が多いときは、所要時間の目安を最終確認に示す
    assert.match(await page.locator('[data-serial-estimate]').innerText(), new RegExp(`^1 アプリずつ反映すると、1 件あたり数秒、全体で約 ${Math.round(N * 3 / 60)} 分かかる見込みです。`));
    await shot('scale-publish-confirm');
    const heapBefore = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
    const run = await timed(`反映（${N} アプリ・1 アプリずつ・完了待ちの間隔は 1/50）`, async () => { await armPublish(N); await publishRunButton().click(); await idle(); });
    const now = await snapshot();
    assert.deepEqual(now.violations, []);
    const okApps = Object.values(now.apps).filter(app => app.prodRev === '12' && app.previewRev === '12').length;
    metrics[`規模: 反映できたアプリ（${N} 件中）`] = okApps;
    assert.equal(okApps, N);
    assert.equal(now.deploys.length, N, '1 アプリずつ依頼する');
    const perApp = run.ms / N;
    metrics['規模: 1 アプリあたりの所要時間（縮めた待ちの場合）'] = `${perApp.toFixed(1)} ms`;
    // 実際の待ち: 各アプリの完了待ちは最初の確認まで 0.3 秒（既定）かかる。実際の kintone の処理時間は含まない下限。
    metrics['規模: 実際の待ちでの下限の目安（1 アプリずつ）'] = `約 ${Math.round((perApp - 300 / 50 + 300) * N / 60000 * 10) / 10} 分（1 件 ${Math.round(perApp - 300 / 50 + 300)} ms 以上）`;
    metrics['規模: 反映後の JS ヒープ'] = `${Math.round((await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0)) / 1048576)} MB（反映前 ${Math.round(heapBefore / 1048576)} MB）`;
    metrics['規模: 確認（GET の回数 / 時間）'] = `${getCount} 回 / ${Math.round(insp.ms / 1000)} 秒`;
    assert.equal(await statusText(), `${N} アプリを本番へ反映しました。`);
    await shot('scale-publish-result');
    const resultRows = await page.locator('.kus-dp-result-item').count();
    metrics['規模: 結果の描画済みの行数'] = resultRows;
    expectOr(resultRows < N, 'scale-result-renders-all', 'medium', '1000 アプリの結果を全件描画している', { expected: '件数が多いときは要約と問題のあるアプリだけを描画する。', actual: `${resultRows} 行。` });
    ok(`scale: 公開 ${N} アプリ`);
  });
}

function registerUx(scenario, ctx) {
  const { page, button, tab, radio, idle, statusText, statusTone, panelText, shot, snapshot, reset, extract, finding, ok, metrics, rowCheck, card, selectNone, toEdit, toConfirm, runSource, arm, sourceRunButton, publishRunButton, setTargets, inspect, toPublishConfirm, armPublish, reviewRow, resultItem, assertOnlyAllowedWrites, ackBox, confirmBox, idBox, texts, toolScript } = ctx;
  const expectOr = (condition, id, severity, title, detail) => { if (!condition) finding(id, severity, title, detail); return !!condition; };
  const SCOPE_LABEL = { fieldSettings: 'フィールド設定', layoutSettings: 'レイアウト設定', viewSettings: 'ビュー設定', reportSettings: 'グラフ設定', categories: 'カテゴリ設定', appSettings: '一般設定', processSettings: 'プロセス管理', actionSettings: 'アクション設定', pluginSettings: 'プラグイン(※)', customizeSettings: 'JS/CSS設定', appAcl: 'アプリ権限', fieldAcl: 'フィールド権限', recordPermissions: 'レコード権限', notifications: '通知設定', perRecordNotifications: 'レコード条件通知', reminderNotifications: 'リマインダー通知' };
  const allScopes = () => ALL_SCOPES.map(key => [SCOPE_LABEL[key], true]);
  const WIDTHS = [320, 390, 768, 1024, 1440];

  /** 横はみ出し（ページ・パネル・パネル内の要素）を調べる。 */
  const overflow = () => page.evaluate(() => {
    const root = document.querySelector('#kus-deploy-lite');
    const vw = document.documentElement.clientWidth;
    const rect = root.getBoundingClientRect();
    const scrollable = root.scrollWidth - root.clientWidth;
    const wide = [...root.querySelectorAll('*')].filter(node => {
      const r = node.getBoundingClientRect();
      if (!r.width || getComputedStyle(node).position === 'fixed') return false;
      // 自分で横にスクロールする入れ物の中身は対象外
      for (let p = node.parentElement; p && p !== root; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return false; }
      return r.right > vw + 1;
    }).slice(0, 5).map(node => `${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]} (${Math.round(node.getBoundingClientRect().right)}px)`);
    // 自分で横にスクロール・切り取りをする入れ物のうち、中身が入りきらないもの（表の横スクロールは対象外）
    const clipped = [...root.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      if (!['auto', 'scroll', 'hidden'].includes(style.overflowX)) return false;
      // 「主な操作へ移動」は、フォーカスするまで見えないように切り取っている（意図した動作）
      if (node.classList.contains('kus-ds-skip')) return false;
      if (node.scrollWidth <= node.clientWidth + 1 || !node.clientWidth) return false;
      if (node.tagName === 'TABLE' || node.querySelector('table') || node.closest('table') || node.tagName === 'TEXTAREA' || node.tagName === 'INPUT' || node.tagName === 'PRE' || node.closest('pre')) return false;
      return true;
    }).slice(0, 4).map(node => `${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]} 「${(node.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 24)}」`);
    return { docOverflow: document.documentElement.scrollWidth - vw, panelRight: Math.round(rect.right), vw, panelScroll: scrollable, wide, clipped };
  });
  const overflowIssues = {}, clippedIssues = {};
  async function checkOverflow(label, width) {
    const o = await overflow();
    const hard = o.docOverflow > 1 || o.panelScroll > 1 || o.wide.length > 0 || o.panelRight > o.vw + 1;
    if (hard) (overflowIssues[width] = overflowIssues[width] || []).push(`${label}: ${JSON.stringify({ ...o, clipped: undefined })}`);
    if (o.clipped.length) (clippedIssues[width] = clippedIssues[width] || []).push(`${label}: ${o.clipped.join(', ')}`);
    return !hard;
  }

  scenario('ux: 画面幅 320 / 390 / 768 / 1024 / 1440px の横はみ出し（5 段階・4 段階）', async () => {
    for (const width of WIDTHS) {
      await reset(businessWorld(), { width, height: 900 });
      await checkOverflow('source 1 対象を選ぶ', width);
      if (width === 320 || width === 1440) await shot(`ux-w${width}-source-1`);
      await extract({ scopes: allScopes() });
      await checkOverflow('source 2 差分を選ぶ', width);
      if (width === 320) await shot('ux-w320-source-2');
      // 変更を開く（行が長い値を含む）
      const toggle = card('fieldSettings').locator('[data-action="toggle"]');
      if (await toggle.count()) await toggle.first().click();
      await checkOverflow('source 2 差分を選ぶ（フィールド設定を開く）', width);
      await toEdit();
      await checkOverflow('source 3 内容を修正', width);
      await editJson();
      await checkOverflow('source 3 内容を修正（JSON）', width);
      if (width === 320) await shot('ux-w320-source-3');
      await toConfirm();
      await checkOverflow('source 4 最終確認', width);
      if (width === 320) await shot('ux-w320-source-4');
      await runSource('202');
      await checkOverflow('source 5 結果', width);
      if (width === 320) await shot('ux-w320-source-5');

      await reset(publishWorld({ count: 3, extra: [cleanApp(150, '在庫'), changedApp(160, '権限なし', { deniedPreview: true })] }), { flow: 'publish', width, height: 900 });
      await checkOverflow('publish 1 対象を選ぶ', width);
      await setTargets(['101', '102', '103', '150', '160']);
      await checkOverflow('publish 1 対象を選ぶ（5 アプリ）', width);
      await inspect();
      await checkOverflow('publish 2 変更を確認', width);
      if (width === 320) await shot('ux-w320-publish-2');
      await reviewRow('101').getByRole('button', { name: '詳細を表示' }).click();
      await checkOverflow('publish 2 変更を確認（詳細）', width);
      await reviewRow('160').getByRole('button', { name: '対象から外す' }).click();
      await toPublishConfirm();
      await checkOverflow('publish 3 最終確認', width);
      if (width === 320) await shot('ux-w320-publish-3');
      await armPublish(3);
      await publishRunButton().click(); await idle();
      await checkOverflow('publish 4 結果', width);
      if (width === 320) await shot('ux-w320-publish-4');
    }
    const lines = Object.entries(overflowIssues).flatMap(([width, list]) => list.map(item => `${width}px ${item}`));
    const clipped = Object.entries(clippedIssues).flatMap(([width, list]) => list.map(item => `${width}px ${item}`));
    metrics['横はみ出し（5 サイズ × 画面）'] = lines.length ? lines : 'なし';
    metrics['切れて読めない入れ物（5 サイズ × 画面）'] = clipped.length ? [...new Set(clipped.map(item => item.replace(/^(\d+px) [^:]+: /, '$1 ')))] : 'なし';
    if (lines.length) finding('layout-overflow', 'medium', '画面幅によっては、パネルや中身が横にはみ出す', { repro: '画面幅 320 / 390 / 768 / 1024px で、各段階を表示する。', expected: '横はみ出しなし。', actual: lines.slice(0, 8).join(' / '), files: ['tools/統合ツール/src/entries/deploy-source-style.ts', 'tools/統合ツール/src/entries/litePanelTheme.ts'] });
    assert.deepEqual(clipped, [], '画面幅 320px でも「操作」の選択肢が切れずに折り返す');
    if (!lines.length && !clipped.length) ok('ux: 5 つの画面幅で横はみ出しなし');
  });
  async function editJson() {
    const t = page.locator('[data-edit-section="fieldSettings"] [data-action="json-toggle"]');
    if (await t.count()) await t.first().click();
  }

  // ---- キーボードだけの操作 ----
  async function active() {
    return page.evaluate(() => {
      const node = document.activeElement;
      if (!node || node === document.body) return { name: '', tag: 'body' };
      const label = node.getAttribute('aria-label') || node.closest('label')?.innerText || node.innerText || node.value || node.placeholder || '';
      const style = getComputedStyle(node);
      const visible = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 || style.boxShadow !== 'none';
      return { name: label.trim().replace(/\s+/g, ' ').slice(0, 60), tag: node.tagName.toLowerCase(), type: node.type || '', role: node.getAttribute('role') || '', visible };
    });
  }
  /** Tab で、条件に合う要素まで進む。押した回数を返す（見つからなければ -1）。フォーカスの見た目が無い要素を数える。 */
  async function tabTo(match, { max = 120, backwards = false } = {}) {
    for (let i = 1; i <= max; i += 1) {
      await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
      const now = await active();
      keyboardStats.seen += 1;
      if (!now.visible && now.tag !== 'body') keyboardStats.noFocusRing.add(`${now.tag}:${now.name}`);
      if (match(now)) return i;
    }
    return -1;
  }
  const keyboardStats = { seen: 0, noFocusRing: new Set() };
  /** 段階の先頭の「主な操作へ移動」へ Tab で届き、押すと下部の固定フッターの主な操作へフォーカスが移る。 */
  async function skipToPrimary(stageName, primaryName) {
    await tab(stageName).focus();
    await page.keyboard.press('Tab');
    const link = await page.evaluate(() => ({ skip: document.activeElement?.hasAttribute('data-skip-to-primary'), text: document.activeElement?.textContent }));
    assert.deepEqual(link, { skip: true, text: '主な操作へ移動' }, `${stageName}: 段階の先頭の次の Tab で「主な操作へ移動」に届く`);
    assert.equal((await active()).visible, true, 'スキップリンクはフォーカスしたとき見える');
    await page.keyboard.press('Enter');
    const now = await active();
    assert.ok(now.tag === 'button' && primaryName.test(now.name), `${stageName}: 押すと主な操作（${primaryName}）へフォーカスが移る: ${now.name}`);
    keyboardStats.seen += 2;
  }

  scenario('ux: キーボードだけの操作（反映元アプリから本番へ・5 段階）', async () => {
    await reset(businessWorld());
    await page.evaluate(() => document.activeElement?.blur());
    // 段階 1: 反映元・反映先のアプリID を入力 → 差分を抽出する
    let n = await tabTo(a => a.tag === 'input' && /反映元アプリID/.test(a.name));
    assert.ok(n > 0, '反映元アプリIDまで Tab で届く');
    metrics['キーボード: 先頭から「反映元アプリID」までの Tab の回数'] = n;
    await page.keyboard.type('101');
    n = await tabTo(a => a.tag === 'input' && /反映先アプリID/.test(a.name));
    assert.ok(n > 0, '反映先アプリIDまで Tab で届く');
    metrics['キーボード: 「反映元アプリID」から「反映先アプリID」までの Tab の回数'] = n;
    await page.keyboard.type('202');
    n = await tabTo(a => a.tag === 'button' && /差分を抽出する/.test(a.name));
    assert.ok(n > 0, '「差分を抽出する」まで Tab で届く');
    metrics['キーボード: 「反映先アプリID」から「差分を抽出する」までの Tab の回数'] = n;
    // 長い入力は、段階の先頭の「主な操作へ移動」で飛ばせる（Tab を押す回数ではなく、先頭のスキップリンクで主な操作へ移る）
    await skipToPrimary('対象を選ぶ', /差分を抽出する/);
    await page.keyboard.press('Enter');
    await idle();
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', await statusText());
    // 段階 2: 「顧客名（正式名称）/ 必須項目にする」だけをキーボードで選ぶ（まず全部外す）
    for (const key of ['fieldSettings', 'layoutSettings', 'appSettings', 'viewSettings', 'reportSettings', 'processSettings', 'pluginSettings', 'customizeSettings', 'actionSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'reminderNotifications', 'categories']) {
      const none = card(key).locator('[data-action="select-none"]');
      if (await none.count()) await none.focus().then(() => page.keyboard.press('Enter'));
    }
    const rowBox = row => page.locator(`.kus-ds-row[data-change-id="${row}"] input[type="checkbox"]`);
    await rowBox('fieldSettings:/properties/customer/required').focus();
    await page.keyboard.press('Space');
    assert.equal(await rowBox('fieldSettings:/properties/customer/required').isChecked(), true, 'Space で変更を選べる');
    n = await tabTo(a => a.tag === 'button' && /内容の修正へ/.test(a.name));
    assert.ok(n > 0, '「内容の修正へ」まで Tab で届く');
    metrics['キーボード: 段階 2 で選んだ行から「内容の修正へ」までの Tab の回数'] = n;
    await skipToPrimary('差分を選ぶ', /内容の修正へ/);
    await page.keyboard.press('Enter');
    assert.equal(await tab('内容を修正').getAttribute('aria-selected'), 'true');
    n = await tabTo(a => a.tag === 'button' && /最終確認に進む/.test(a.name), { max: 200 });
    assert.ok(n > 0, '「最終確認に進む」まで Tab で届く');
    metrics['キーボード: 段階 3 の「最終確認に進む」までの Tab の回数（先頭の修正欄から）'] = n;
    await page.keyboard.press('Enter');
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
    // 段階 4: 確認のチェック → ID 入力 → Enter では実行されない → 実行ボタン
    n = await tabTo(a => a.tag === 'input' && a.type === 'checkbox' && /上記の内容を確認しました/.test(a.name), { max: 200 });
    assert.ok(n > 0, '確認のチェックまで Tab で届く');
    await page.keyboard.press('Space');
    n = await tabTo(a => a.tag === 'input' && /確認用の反映先アプリID/.test(a.name));
    assert.ok(n > 0);
    await page.keyboard.type('202');
    await page.keyboard.press('Enter');
    assert.equal((await snapshot()).writes.length, 0, '確認入力の Enter では実行しない');
    n = await tabTo(a => a.tag === 'button' && /確認した内容を反映先/.test(a.name));
    assert.ok(n > 0, '実行ボタンまで Tab で届く');
    await page.keyboard.press('Enter');
    await idle();
    const done = await assertOnlyAllowedWrites('キーボードだけの実行');
    assert.deepEqual(done.writes.map(write => write.path), ['/app/form/fields.json']);
    assert.equal(done.apps['202'].prod.fieldSettings.properties.customer.required, true);
    assert.equal(await statusText(), '1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。');
    ok('ux: キーボードだけで 5 段階を完了（Enter で実行されないことも確認）');
  });

  scenario('ux: キーボードだけの操作（プレビューの変更を公開）とフォーカスの見た目', async () => {
    await reset(publishWorld({ count: 2 }), { flow: 'publish' });
    await page.evaluate(() => document.activeElement?.blur());
    let n = await tabTo(a => a.tag === 'input' && /アプリID/.test(a.name));
    assert.ok(n > 0);
    await page.keyboard.type('101,102');
    await page.keyboard.press('Tab');
    n = await tabTo(a => a.tag === 'button' && /未公開の変更を確認する/.test(a.name), { max: 80 });
    assert.ok(n > 0, '「未公開の変更を確認する」まで Tab で届く');
    metrics['キーボード: 公開の段階 1 で、アプリID から「未公開の変更を確認する」までの Tab の回数'] = n;
    await page.keyboard.press('Enter');
    await idle();
    assert.equal(await tab('変更を確認').getAttribute('aria-selected'), 'true', await statusText());
    n = await tabTo(a => a.tag === 'button' && /最終確認に進む/.test(a.name), { max: 200 });
    assert.ok(n > 0, '「最終確認に進む」まで Tab で届く');
    metrics['キーボード: 公開の段階 2 で「最終確認に進む」までの Tab の回数'] = n;
    await page.keyboard.press('Enter');
    n = await tabTo(a => a.tag === 'input' && a.type === 'checkbox' && /上記の内容を確認しました/.test(a.name), { max: 100 });
    await page.keyboard.press('Space');
    n = await tabTo(a => a.tag === 'input' && /確認用の対象アプリ/.test(a.name));
    await page.keyboard.type('2');
    await page.keyboard.press('Enter');
    assert.equal((await snapshot()).deploys.length, 0, '確認入力の Enter では実行しない');
    n = await tabTo(a => a.tag === 'button' && /確認した 2 アプリを本番へ反映/.test(a.name));
    assert.ok(n > 0);
    await page.keyboard.press('Enter');
    await idle();
    assert.equal((await snapshot()).deploys.length, 2);
    assert.equal(await statusText(), '2 アプリを本番へ反映しました。');
    const missing = [...keyboardStats.noFocusRing];
    metrics['キーボード: Tab で止まった要素 / フォーカスの見た目が無い要素'] = `${keyboardStats.seen} / ${missing.length}`;
    expectOr(missing.length === 0, 'keyboard-focus-ring', 'medium', 'Tab で止まる要素のうち、フォーカスの見た目（枠・影）が無いものがある', { repro: 'パネルを Tab だけで操作し、止まった要素の outline / box-shadow を調べる。', expected: 'すべての要素でフォーカスが見える。', actual: missing.slice(0, 8).join(' / '), files: ['tools/統合ツール/src/entries/litePanelTheme.ts'] });
    ok('ux: キーボードだけで公開を完了');
  });

  // ---- 二重クリック ----
  scenario('ux: 二重クリック（抽出・最終確認・実行）', async () => {
    await reset(businessWorld());
    await page.getByLabel('反映元アプリID', { exact: true }).fill('101');
    await page.getByLabel('反映先アプリID', { exact: true }).fill('202');
    const getsBefore = (await snapshot()).calls.length;
    await button('差分を抽出する').dblclick();
    await idle();
    const afterExtract = await snapshot();
    const extractGets = afterExtract.calls.filter(call => call.method === 'GET' && call.url === '/k/v1/preview/app/form/fields.json').length;
    expectOr(extractGets <= 2, 'double-click-extract', 'low', '「差分を抽出する」を二重クリックすると、抽出が二重に走る', { expected: '1 回分だけ。', actual: `反映先のフィールド設定の取得が ${extractGets} 回。` });
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/customer/required').check();
    for (const key of ['layoutSettings', 'appSettings', 'viewSettings', 'reportSettings', 'processSettings', 'pluginSettings', 'customizeSettings', 'actionSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'reminderNotifications', 'categories']) if (await card(key).locator('[data-action="select-none"]').count()) await selectNone(key);
    await button('内容の修正へ').dblclick();
    assert.equal(await tab('内容を修正').getAttribute('aria-selected'), 'true');
    await button('最終確認に進む').dblclick();
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
    await arm('202');
    await sourceRunButton().dblclick();
    await idle();
    const done = await assertOnlyAllowedWrites('二重クリックで実行');
    assert.equal(done.writes.length, 1, '書き込みは 1 回だけ');
    assert.equal(done.deploys.length, 1, '本番への依頼も 1 回だけ');
    assert.equal(done.downloads.length, 2);
    // 実行後に結果の「中止」「選び直す」などを二重クリックしても書き込みは増えない
    assert.equal((await snapshot()).writes.length, 1);
    // 公開側
    await reset(publishWorld({ count: 2 }), { flow: 'publish' });
    await setTargets(['101', '102']);
    await button('未公開の変更を確認する').dblclick(); await idle();
    await toPublishConfirm(); await armPublish(2);
    await publishRunButton().dblclick(); await idle();
    const pub = await assertOnlyAllowedWrites('二重クリックで公開', []);
    assert.deepEqual(pub.deploys.map(item => item.body.apps[0].app), ['101', '102'], '依頼は 1 アプリにつき 1 回');
    ok('ux: 二重クリックで二重に書き込まない');
  });

  // ---- 閉じて開き直したときの状態 ----
  scenario('ux: 閉じて開き直したときの状態（結果・途中・実行中）', async () => {
    // 公開: 結果を出したあと閉じて、もう一度開く（配布物をもう一度読み込む）
    await reset(publishWorld({ count: 1 }), { flow: 'publish' });
    await setTargets(['101']);
    await inspect(); await toPublishConfirm(); await armPublish(101);
    await publishRunButton().click(); await idle();
    await button('閉じる').click();
    assert.equal(await page.locator('#kus-deploy-lite').count(), 0, '閉じるとパネルが消える');
    await page.addScriptTag({ content: toolScript });
    await page.waitForSelector('#kus-deploy-lite');
    const reopened = await panelText();
    const state = {
      flow: await radio('プレビューの変更を公開').isChecked() ? 'publish' : 'source',
      resultShown: await tab('結果').getAttribute('aria-selected'),
      hasResult: /本番へ反映しました/.test(reopened)
    };
    metrics['開き直し: 公開の結果を出したあと'] = state;
    // 閉じて開き直したとき（同じページの間）は、直前の操作とその結果を表示する（メモリだけ。永続ストレージは使わない）
    assert.equal(state.flow, 'publish', '直前の操作（プレビューの変更を公開）で開く');
    assert.equal(state.resultShown, 'true', '結果の段階で開く');
    assert.equal(state.hasResult, true, '前回の結果（成功・失敗の一覧）を表示する');
    assert.match(reopened, /App 101/);
    assert.equal(await page.evaluate(() => Object.keys(document.documentElement.__kusDeployLiteMemory || {}).sort().join()), 'publish,source', '同じページの間だけ、メモリ（ページの要素）に持つ。永続ストレージは使わない');
    await shot('publish-ux-reopen-result');
    // 反映元アプリから本番へ: 差分を選んだ状態で閉じて開き直す → 抽出結果は残らない（再読み込みで消える）
    await reset(businessWorld());
    await extract({ scopes: allScopes() });
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/customer/required').check();
    await button('閉じる').click();
    await page.addScriptTag({ content: toolScript });
    await page.waitForSelector('#kus-deploy-lite');
    const reopenedSource = {
      stage1: await tab('対象を選ぶ').getAttribute('aria-selected'),
      sourceId: await page.getByLabel('反映元アプリID', { exact: true }).inputValue(),
      targetId: await page.getByLabel('反映先アプリID', { exact: true }).inputValue(),
      selectStageEnabled: !(await tab('差分を選ぶ').isDisabled())
    };
    metrics['開き直し: 差分を選んだ状態で閉じたあと'] = reopenedSource;
    assert.equal(reopenedSource.sourceId, '101', '入力した反映元は残る');
    assert.equal(reopenedSource.targetId, '202', '入力した反映先は残る');
    assert.match(await statusText(), /前回の入力を残しています。抽出した差分は引き継がないため、「差分を抽出する」で抽出し直してください。/, '抽出し直しを促す');
    assert.equal(reopenedSource.selectStageEnabled, false, '抽出結果は残らない（古い差分で書き込まない）');
    assert.equal((await snapshot()).writes.length, 0);
    // 反映元アプリから本番へ: 実行して結果を出したあと閉じて開き直す → 直前の操作とその結果を表示する
    await reset(businessWorld());
    await extract({ scopes: [['レイアウト設定', false], ['ビュー設定', false]] });
    await selectNone('fieldSettings');
    await rowCheck('fieldSettings:/properties/customer/required').check();
    await toEdit(); await toConfirm();
    await runSource('202');
    const resultStatus = await statusText();
    await button('閉じる').click();
    await page.addScriptTag({ content: toolScript });
    await page.waitForSelector('#kus-deploy-lite');
    assert.equal(await radio('反映元アプリから本番へ').isChecked(), true, '直前の操作（反映元アプリから本番へ）で開く');
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true', '結果の段階で開く');
    assert.equal(await statusText(), resultStatus, '前回の結果の状態を表示する');
    assert.match(await panelText(), /1 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。/);
    assert.equal((await snapshot()).writes.length, 1, '開き直しでは書き込まない');
    // 実行中に閉じる
    await reset({ ...publishWorld({ count: 1 }), processMs: 2500 }, { flow: 'publish' });
    await setTargets(['101']);
    await inspect(); await toPublishConfirm(); await armPublish(101);
    await publishRunButton().click();
    await page.waitForFunction(() => window.__k.deploys.length === 1);
    const closeButton = button('閉じる');
    const disabled = await closeButton.isDisabled().catch(() => 'none');
    metrics['開き直し: 実行中の「閉じる」'] = disabled === true ? '押せない（無効）' : disabled === 'none' ? 'ボタンなし' : '押せる';
    if (disabled === false) {
      await closeButton.click();
      const stillRunning = await page.locator('#kus-deploy-lite').count();
      await page.waitForTimeout(3500);
      const after = await snapshot();
      finding('close-while-running', stillRunning ? 'low' : 'medium', '反映の実行中に「閉じる」を押せてしまう', { repro: '公開の実行中（完了待ち）に「閉じる」を押す。', expected: '押せない、または閉じる前に確認する（実行は画面を閉じても続くため、結果が見えなくなる）。', actual: `パネルは${stillRunning ? '残る' : '消える'}。本番の反映は kintone 側で${after.apps['101'].prodRev === '12' ? '完了した' : '続いている'}。` });
    }
    ok('ux: 閉じて開き直したときの状態');
  });
}

function registerWording(scenario, ctx) {
  const { texts, finding, ok, metrics } = ctx;
  scenario('wording: 文言が docs/ui-writing-guide.md に沿っているか（これまでに撮った画面の文言）', async () => {
    const entries = Object.entries(texts);
    assert.ok(entries.length > 5, `文言を集めた画面の数 ${entries.length}`);
    metrics['文言: 調べた画面の数'] = entries.length;
    const lines = new Map();
    for (const [name, { visible, labels }] of entries) {
      const flow = /^publish-|^ux-w\d+-publish/.test(name) ? 'publish' : 'source';
      for (const raw of [...visible.split('\n'), ...labels]) {
        const line = raw.trim();
        if (!line || line.startsWith('[')) continue;
        const key = `${flow}\u0000${line}`;
        if (!lines.has(key)) lines.set(key, { flow, line, screens: new Set() });
        lines.get(key).screens.add(name);
      }
    }
    const rules = [
      { id: 'wording-terms', severity: 'low', title: '用語がガイドの表と違う語を使っている', test: ({ line }) => /ソース|\bsrc\b|比較先|ターゲット|運用環境|スキップ|キャンセル/.test(line.replace(/[#\w]*src[#\w]*/g, '')) },
      { id: 'wording-preview-english', severity: 'low', title: '「プレビュー」ではなく英語の preview が画面に出る', test: ({ line }) => /(?<![A-Za-z/_.-])preview(?![A-Za-z/_.-])/i.test(line) && !/GAIA|k\/v1|\.json|api/.test(line) },
      { id: 'wording-target-in-publish', severity: 'low', title: '「プレビューの変更を公開」の画面で、ガイドが使わないとしている「反映先」を使っている', test: ({ flow, line }) => flow === 'publish' && /反映先/.test(line) },
      { id: 'wording-target-app-in-source', severity: 'low', title: '「反映元アプリから本番へ」の画面で、ガイドが使わないとしている「対象アプリ」を使っている', test: ({ flow, line }) => flow === 'source' && /対象アプリ/.test(line) && !/反映する|対象アプリの/.test('') },
      // 直した問題（見つかったら失敗させる）
      { id: 'wording-guest-id', severity: 'low', strict: true, title: '「ゲストスペースID」ではなく「ゲストID」と表示している（入力欄の短い placeholder 以外）', test: ({ line }) => /ゲストID/.test(line) && !/（任意）/.test(line) },
      { id: 'wording-revision', severity: 'low', strict: true, title: '「revision」という語が、かみ砕いた語（設定の更新番号）なしで画面に出る（表の見出し・結果の行）', test: ({ line }) => /revision/i.test(line.replace(/更新番号\s*[（(]?\s*revision\s*[）)]?/gi, '')) && !/revision 競合|は最新ではありません/.test(line) },
      { id: 'wording-internal-id', severity: 'low', title: '内部の識別子・API 名が、かみ砕いた語なしで画面に出る', test: ({ line }) => /fileKey|_fetchError|customize\.json|\b(PUT|POST)\b|GAIA_|CB_[A-Z]{2}\d/.test(line) && !/（|\(/.test(line.slice(0, 0)) }
    ];
    for (const rule of rules) {
      const hits = [...lines.values()].filter(item => rule.test(item));
      if (!hits.length) continue;
      if (rule.strict) assert.fail(`${rule.title}: ${hits.slice(0, 6).map(item => `「${item.line.slice(0, 90)}」（${[...item.screens][0]}）`).join(' / ')}`);
      finding(rule.id, rule.severity, rule.title, {
        expected: 'docs/ui-writing-guide.md の用語・書き方に合わせる。',
        actual: hits.slice(0, 6).map(item => `「${item.line.slice(0, 90)}」（${[...item.screens][0]}）`).join(' / ') + (hits.length > 6 ? ` ほか ${hits.length - 6} 件` : ''),
        files: ['tools/統合ツール/src/entries/deploy-lite-ui.ts', 'tools/統合ツール/src/entries/deploy-source-ui.ts', 'tools/統合ツール/src/deploy/display.ts']
      });
    }
    // 取り消せない操作の言い方（ガイド 4）: 最終確認に「取り消せません」と戻し方がある
    const confirms = entries.filter(([name]) => /confirm/.test(name));
    assert.ok(confirms.length >= 2);
    for (const [name, { visible }] of confirms) assert.match(visible, /取り消せません/, `${name}: 本番への反映は取り消せないことを最終確認で言い切る`);
    // バッジは 1 つだけ（ガイド 2）
    for (const [name, { visible }] of entries.slice(0, 40)) assert.equal((visible.match(/本番の設定を変更(?!します)/g) || []).length, 1, `${name}: 見出しのバッジは「本番の設定を変更」の 1 つだけ`);
    ok('wording: 用語・取り消せない操作・バッジ');
  });
}

if (require.main === module) main().catch(error => { console.error(error); process.exit(1); });
