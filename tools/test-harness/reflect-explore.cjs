#!/usr/bin/env node
'use strict';

// プレビュー反映（tools/プレビュー反映.js）の通し検証。配布物をそのままページに読み込み（esbuild で作り直さない）、
// window.kintone.api と window.fetch を、状態を持つ合成 kintone に差し替えて、利用者と同じ操作で確かめる。
// 画面の表示と、合成 kintone が受け取った送信内容の両方を確認する。実際の kintone には通信しない。
//
// 合成 kintone は tools/test-harness/deploy-explore.cjs のものを写して、プレビュー反映向けに調整している（そのファイルは変更しない）。
//   - アプリ単位の revision（本番・プレビュー別。プレビューへの書き込みで +1）。書き込みの revision 照合は GAIA_CO02。
//   - フィールドの種類の変更、選択肢に無い初期値、存在しないフィールドを参照する一覧・レイアウト・計算式などは、kintone と同じようにエラー。
//   - ルックアップ・関連レコード一覧・アクションの参照先アプリが存在しないとエラー。JS/CSS のファイルの取得・アップロード（fileKey は 1 回しか使えない）。
//   - 本番・反映元への設定の書き込みと、プレビューの deploy.json の呼び出しは違反として記録する（プレビュー反映は呼ばない）。
//
// 直した問題は通常の検査（失敗させるもの）にしてある。まだ直していない製品の不具合・使いにくさ・文言の問題だけを「既知の問題（findings）」として記録する。
// 既知の問題は失敗させずに一覧で出し（severity が critical のものだけ失敗にする）、.iter-shots/reflect-explore/results.json に保存する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const TOOL_FILE = path.join(ROOT, 'tools/プレビュー反映.js');
const OUT = path.join(ROOT, '.iter-shots/reflect-explore');

function printHelp() {
  console.log(`Usage: node tools/test-harness/reflect-explore.cjs [options]

プレビュー反映（tools/プレビュー反映.js をそのまま読み込み）を、状態を持つ合成 kintone につないで、利用者と同じ操作で通しに検証します。
実際の kintone には通信しません。先に npm run build で配布物を作り直してください。

Options:
  --browser <name>      chrome または chromium（既定: chrome）
  --executable <path>   ブラウザの実行ファイル（環境変数 KUS_PLAYWRIGHT_EXECUTABLE でも指定できます）
  --only <text>         名前に <text> を含むシナリオだけ実行します（例: --only lookup）
  --skip-scale          規模のシナリオ（1000 件の反映先の一括確認など、時間がかかるもの）を省きます
  --help                このヘルプを表示

日本語のダウンロード名を扱うため、ロケールが C/POSIX の環境では LANG=C.UTF-8 LC_ALL=C.UTF-8 を付けて実行してください。
結果と画面: .iter-shots/reflect-explore/（results.json に計測値と既知の問題）`);
}

const argValue = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);

// ---------------------------------------------------------------------------
// 合成 kintone（ページ内で動く）。page.evaluate に関数として渡すため、外側の変数は参照しない。
// ---------------------------------------------------------------------------

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
    failWrites: config.failWrites || {}, bumpAfterWrite: null,
    failGets: config.failGets || {}, holdGets: false, getResolvers: []
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
  S.release = () => { S.hold = false; S.holdWrites = false; S.holdGets = false; S.writeResolvers.splice(0).forEach(resolve => resolve()); S.getResolvers.splice(0).forEach(resolve => resolve()); };

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
        throw violation(`プレビュー反映が deploy.json を呼んだ: ${url}`);
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
      if (S.holdGets) { S.heldGets = (S.heldGets || 0) + 1; await new Promise(resolve => S.getResolvers.push(resolve)); }
      const failure = S.failGets[`${app.id}:${preview ? 'preview' : 'production'}:${key}`];
      if (failure) { if (failure.times !== undefined) { if (failure.times <= 0) delete S.failGets[`${app.id}:${preview ? 'preview' : 'production'}:${key}`]; else failure.times -= 1; } if (failure.times === undefined || failure.times >= 0) throw kerr(failure.code, failure.message); }
      return { ...clone((preview ? app.preview : app.prod)[key]), revision: String(preview ? app.previewRev : app.prodRev) };
    }
    // ---- 書き込み ----
    if (method === 'POST' && preview && p === '/app/deploy.json') {
      throw violation(`プレビュー反映が deploy.json を依頼した: ${url}`);
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
      if (S.failWrites[key] && (S.failWrites[key].times === undefined || S.failWrites[key].times > 0)) { if (S.failWrites[key].times !== undefined) S.failWrites[key].times -= 1; throw fail(kerr(S.failWrites[key].code, S.failWrites[key].message)); }
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
function businessSettings(name, variant, masterId = 301) {
  const dev = variant === 'dev';
  const status = f.choice('DROP_DOWN', 'status', 'ステータス', dev ? ['未対応', '対応中', '保留', '完了'] : ['未対応', '対応中', '完了'], dev ? '保留' : '未対応', { required: true });
  const priority = f.choice('RADIO_BUTTON', 'priority', '優先度', dev ? ['緊急', '高', '中', '低'] : ['高', '中', '低'], '中');
  const tags = f.choice('CHECK_BOX', 'tags', 'タグ', ['新規', '既存', '要注意'], dev ? ['新規', '要注意'] : ['新規']);
  const customer = f.text('customer', dev ? '顧客名（正式名称）' : '顧客名', { required: dev, unique: dev, maxLength: dev ? '100' : '64' });
  const custCode = f.lookup('customer_code', '取引先コード', masterId);
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
  const rel = f.reference('rel', '取引先の関連レコード', masterId);
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
    actionSettings: { actions: { '受注コピー': { name: '受注コピー', index: '0', destApp: { app: String(masterId), code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'customer', dstField: 'name' }, ...(dev ? [{ srcType: 'FIELD', srcField: 'cust_name', dstField: 'name' }] : [])], entities: [{ type: 'USER', code: 'admin' }], filterCond: '' } } },
    appAcl: { rights: appRights },
    fieldAcl: { rights: [{ code: 'amount', entities: [{ accessibility: dev ? 'READ' : 'WRITE', entity: entity('GROUP', 'everyone'), includeSubs: false }, { accessibility: 'WRITE', entity: entity('USER', 'admin'), includeSubs: false }] }, ...(dev ? [{ code: 'shipping', entities: [{ accessibility: 'READ', entity: entity('GROUP', 'everyone'), includeSubs: false }] }] : [])] },
    recordPermissions: { rights: [{ filterCond: dev ? 'region = "東日本"' : '', entities: [{ entity: entity('GROUP', 'everyone'), viewable: true, editable: !dev, deletable: false, includeSubs: false }] }] },
    notifications: { notifications: [{ entity: entity('USER', 'admin'), includeSubs: false, recordAdded: true, recordEdited: false, commentAdded: true, statusChanged: true, fileImported: false }, ...(dev ? [{ entity: entity('GROUP', 'everyone'), includeSubs: false, recordAdded: true, recordEdited: true, commentAdded: false, statusChanged: false, fileImported: false }] : [])], notifyToCommenter: dev },
    perRecordNotifications: { notifications: [{ filterCond: 'amount > 1000000', title: '高額案件です', targets: [{ entity: entity('USER', 'admin'), includeSubs: false }] }] },
    reminderNotifications: { notifications: [{ filterCond: 'status != "完了"', title: '期限が近づいています', timing: { code: 'due', daysLater: dev ? '-3' : '-1', hoursLater: '0', time: '09:00' }, targets: [{ entity: entity('FIELD_ENTITY', 'owner'), includeSubs: false }] }], timezone: 'Asia/Tokyo' },
    categories: { enabled: dev, categories: dev ? { '東日本': { label: '東日本', index: '0', parent: null }, '西日本': { label: '西日本', index: '1', parent: null } } : {} }
  }));
}


const BUSINESS_FILES = {
  'dev-main-js': '(function(){ console.log("dev main"); })();', 'dev-style-css': '.dev { color: red; }', 'tgt-legacy-js': '(function(){ console.log("legacy"); })();',
  'e204-main-js': '(function(){ console.log("dev main"); })();', 'e204-style-css': '.dev { color: red; }'
};

/** 反映先に残す、反映元には無い設定（保持の確認用）。 */
function withTargetOnly(settings) {
  const next = clone(settings);
  next.viewSettings.views['営業所専用'] = view.list('営業所専用', 9, ['record_no', 'customer'], '', 'record_no desc');
  next.reportSettings.reports['営業所別'] = { chartType: 'PIE', chartMode: 'NORMAL', name: '営業所別', index: '9', groups: [{ code: 'status' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sort: 'TOTAL_DESC', periodicReport: null };
  next.actionSettings.actions['営業所専用コピー'] = { name: '営業所専用コピー', index: '9', destApp: { app: '301', code: '' }, mappings: [{ srcType: 'FIELD', srcField: 'customer', dstField: 'name' }], entities: [{ type: 'USER', code: 'admin' }], filterCond: '' };
  return next;
}
/** 開発版と同じ設定で、ファイルの fileKey だけが違う反映先（本番の master #301 を参照）。 */
function sameAsDev(name) {
  const settings = businessSettings(name, 'dev', 301);
  const rekey = { 'dev-main-js': 'e204-main-js', 'dev-style-css': 'e204-style-css' };
  for (const kind of ['js', 'css']) for (const item of settings.customizeSettings.desktop[kind]) if (item.type === 'FILE') item.file.fileKey = rekey[item.file.fileKey];
  return settings;
}

/** 反映元 #101（開発版。開発用マスタ #401 を参照）・反映先 #202（本番。マスタ #301 を参照）・#203（本番と同じ作り）・#204（反映元と同じ）。 */
const reflectWorld = (config = {}) => ({
  apps: [
    { id: '101', name: '営業管理（開発）', prodRevision: 20, previewRevision: 20, production: businessSettings('営業管理（開発）', 'dev', 401) },
    { id: '202', name: '営業管理', prodRevision: 10, previewRevision: 10, production: config.targetOnly ? withTargetOnly(businessSettings('営業管理', 'prod', 301)) : businessSettings('営業管理', 'prod', 301) },
    { id: '203', name: '営業管理（大阪）', prodRevision: 7, previewRevision: 7, production: businessSettings('営業管理（大阪）', 'prod', 301) },
    { id: '204', name: '営業管理（東北）', prodRevision: 5, previewRevision: 5, production: sameAsDev('営業管理（東北）') },
    masterApp(), masterApp({ id: '401', name: '取引先マスタ（開発）' }),
    ...(config.extraApps || [])
  ],
  files: BUSINESS_FILES,
  writableApps: ['202'],
  ...config.engine
});
const ALL_SCOPES = ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings', 'categories', 'appSettings', 'processSettings', 'actionSettings', 'pluginSettings', 'customizeSettings', 'appAcl', 'fieldAcl', 'recordPermissions', 'notifications', 'perRecordNotifications', 'reminderNotifications'];
const SCOPE_LABEL = { fieldSettings: 'フィールド設定', layoutSettings: 'レイアウト設定', viewSettings: 'ビュー設定', reportSettings: 'グラフ設定', categories: 'カテゴリ設定', appSettings: '一般設定', processSettings: 'プロセス管理', actionSettings: 'アクション設定', pluginSettings: 'プラグイン(※)', customizeSettings: 'JS/CSS設定', appAcl: 'アプリ権限', fieldAcl: 'フィールド権限', recordPermissions: 'レコード権限', notifications: '通知設定', perRecordNotifications: 'レコード条件通知', reminderNotifications: 'リマインダー通知' };

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
  const idle = () => page.waitForFunction(() => document.querySelector('#kus-reflect-lite')?.getAttribute('aria-busy') !== 'true', null, { timeout: 600000 });
  const statusText = () => page.locator('.kus-lp__status-text').innerText();
  const statusTone = () => page.locator('.kus-lp__status').getAttribute('data-tone');
  const panelText = () => page.locator('#kus-reflect-lite').innerText();
  const sourceBox = () => page.getByRole('textbox', { name: '反映元アプリID', exact: true });
  const targetBox = () => page.getByRole('textbox', { name: '反映先アプリID', exact: true });
  const chip = key => page.getByRole('checkbox', { name: SCOPE_LABEL[key], exact: true });
  const ackBox = () => page.getByRole('checkbox', { name: '反映内容の確認', exact: true });
  const idBox = () => page.getByRole('textbox', { name: '確認用の反映先アプリID', exact: true });
  const runButton = () => page.getByRole('button', { name: /^確認した .* 項目を反映先プレビューへ反映/ });
  const detailDialog = () => page.locator('#kus-rl-detail');
  const texts = {};
  const collectTexts = () => page.evaluate(() => {
    const root = document.querySelector('#kus-reflect-lite');
    if (!root) return null;
    const labels = [...root.querySelectorAll('[aria-label],[placeholder],[title]')].map(node => node.getAttribute('aria-label') || node.getAttribute('placeholder') || node.getAttribute('title')).filter(Boolean);
    const visible = [...root.querySelectorAll('.kus-rl-stage:not([hidden]),.kus-rl-action-dock,.kus-lp__hero,.kus-lp__hint')].map(node => node.innerText).join('\n');
    return { visible: visible.length > 60000 ? visible.slice(0, 60000) : visible, labels: [...new Set(labels)].slice(0, 400) };
  });
  const shot = async name => {
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    if (!name.startsWith('scale-')) { const collected = await collectTexts(); if (collected) texts[name] = collected; }
  };
  const K = fn => page.evaluate(fn);

  /** ページを作り直し、合成 kintone を入れ、配布物を読み込む（配布物は読み込み時に自動で起動する）。 */
  async function reset(config, { width = 1440, height = 1000 } = {}) {
    await page.setViewportSize({ width, height });
    await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
    await page.evaluate(installSyntheticKintone, config);
    pageErrors.length = 0;
    await page.evaluate(() => {
      window.__long = [];
      try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__long.push(Math.round(entry.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (error) { /* 非対応 */ }
    });
    await page.addScriptTag({ content: toolScript });
    await page.waitForSelector('#kus-reflect-lite');
  }
  const snapshot = () => page.evaluate(() => {
    const s = window.__k;
    return {
      calls: s.calls.map(({ seq, at, url, method, params, fetch }) => ({ seq, at, url, method, params, fetch })),
      writes: s.writes, violations: s.violations, downloads: s.downloads.map(({ seq, name }) => ({ seq, name })),
      uploads: s.uploads, fileFetches: s.fileFetches,
      apps: Object.fromEntries(Object.values(s.apps).map(app => [app.id, { prodRev: String(app.prodRev), previewRev: String(app.previewRev), prod: app.prod, preview: app.preview }]))
    };
  });
  const backupJson = index => page.evaluate(async i => JSON.parse(await window.__k.downloads[i].blob.text()), index);
  const WRITE_URL = /^\/k(\/guest\/\d+)?\/v1\/preview\/(app\/(form\/fields|form\/layout|views|settings|reports|status|plugins|customize|actions|acl|categories|notifications\/[a-zA-Z]+)|field\/acl|record\/acl)\.json$/;
  /** 書き込みは「反映先プレビューへの設定の書き込み」だけ。本番・反映元・レコードへの書き込みと想定外の通信は無い。 */
  async function assertOnlyAllowedWrites(where, allowedApps = ['202']) {
    const now = await snapshot();
    assert.deepEqual(now.violations, [], `${where}: 合成 kintone が想定外の通信を受けた`);
    for (const call of now.calls.filter(item => item.method !== 'GET' && !item.fetch)) assert.match(call.url, WRITE_URL, `${where}: 想定外の書き込み先 ${call.method} ${call.url}`);
    assert.ok(now.writes.every(write => allowedApps.includes(String(write.body.app))), `${where}: 設定の書き込みは ${allowedApps.join('・')} だけ`);
    return now;
  }
  /** 書き込みの revision が、直前の書き込みの結果（最初は確認時の revision）につながっているか。 */
  const revisionChain = now => now.writes.filter(write => !write.rejected).every((write, index, list) => index === 0 || write.revisionBefore === list[index - 1].revisionAfter);
  const okWrites = now => now.writes.filter(write => !write.rejected);
  const writeLabels = now => now.writes.map(write => `${write.method} ${write.path}${write.rejected ? ' (拒否)' : ''}`);

  // ---- 利用者の操作 ----
  async function inDetail(action) {
    const selected = await page.locator('[role="tab"][aria-selected="true"]').getAttribute('id');
    if (!(await button('詳細設定…').isVisible())) await tab('対象を選ぶ').click();
    await button('詳細設定…').click();
    try { return await action(); } finally {
      await button('詳細設定を閉じる').click();
      if (selected && selected !== 'kus-rl-tab-setup') await page.locator(`#${selected}`).click();
    }
  }
  const lookupBox = () => page.locator('textarea[aria-label="ルックアップの参照アプリID変換"]');
  const rolloutBox = () => page.locator('textarea[aria-label="続けて反映する反映先"]');
  const preserveBox = () => page.locator('label.kus-lp__check', { hasText: '反映先だけの一覧・グラフ・アクションを保持する' }).locator('input');
  const setLookup = text => inDetail(() => lookupBox().fill(text));
  const setRollout = text => inDetail(() => rolloutBox().fill(text));
  const setPreserve = checked => inDetail(() => (checked ? preserveBox().check() : preserveBox().uncheck()));
  /** 反映元・反映先と反映する項目を指定する（scopes: null なら初期値、'all' なら全項目、配列ならそのキーだけ）。 */
  async function setup({ source = '101', target = '202', scopes = null } = {}) {
    await tab('対象を選ぶ').click();
    await sourceBox().fill(source);
    await targetBox().fill(target);
    if (scopes === 'all') await button('全選択').click();
    else if (scopes) {
      await button('全解除').click();
      for (const key of scopes) await chip(key).check();
    }
  }
  const compare = async () => { await button('差分を確認する').click(); await idle(); };
  const summaryRows = () => page.locator('.kus-rl-summary tbody tr').evaluateAll(rows => rows.map(tr => { const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim()); return { label: cells[0], status: cells[1], changes: cells[2], removals: cells[3] }; }));
  const entryStatus = async label => (await summaryRows()).find(item => item.label === label)?.status;
  /** 最終確認に進み、確認のチェックと（必要なら）反映先IDを入れて、実行できる状態にする。 */
  async function arm(id = '202') {
    await button('最終確認に進む').click();
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
    assert.equal(await runButton().isDisabled(), true, '確認前は反映できない');
    await ackBox().check();
    if (await idBox().isVisible()) {
      await idBox().fill(id);
      await idBox().press('Enter');
      assert.equal((await snapshot()).writes.length >= 0, true);
    }
    assert.equal(await runButton().isEnabled(), true, '確認後は反映できる');
  }
  async function run(id = '202') { await arm(id); await runButton().click(); await idle(); }
  const resultText = () => page.locator('#kus-rl-stage-result').innerText();

  const ctx = {
    page, browser, context, button, tab, idle, statusText, statusTone, panelText, sourceBox, targetBox, chip, ackBox, idBox, runButton, detailDialog, shot, K, reset, snapshot, backupJson,
    assertOnlyAllowedWrites, revisionChain, okWrites, writeLabels, inDetail, lookupBox, rolloutBox, preserveBox, setLookup, setRollout, setPreserve, setup, compare, summaryRows, entryStatus, arm, run, resultText,
    pageErrors, only, skipScale, toolScript, finding, ok, metrics, texts
  };

  const scenarios = [];
  const scenario = (name, fn) => scenarios.push({ name, fn });
  for (const register of [registerScenarios, registerRollout, registerUx, registerWording]) register(scenario, ctx);

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

// ---------------------------------------------------------------------------
// シナリオ：反映の通し
// ---------------------------------------------------------------------------
function registerScenarios(scenario, ctx) {
  const { page, button, tab, idle, statusText, statusTone, panelText, targetBox, sourceBox, chip, ackBox, idBox, runButton, shot, reset, snapshot, backupJson, assertOnlyAllowedWrites, revisionChain, okWrites, writeLabels, setLookup, setPreserve, setup, compare, summaryRows, entryStatus, arm, run, resultText, finding, ok, metrics, K } = ctx;
  const expectOr = (condition, id, severity, title, detail) => { if (!condition) finding(id, severity, title, detail); return !!condition; };
  const deepSubset = (small, big) => JSON.stringify(small) === JSON.stringify(Object.fromEntries(Object.keys(small).map(key => [key, big[key]])));
  const planOf = async () => (await summaryRows()).map(item => `${item.label}:${item.status}`).join(' / ');

  scenario('reflect: 全項目を選んだ反映（開発→本番）と、反映後の再確認で差分が残らないこと', async () => {
    await reset(reflectWorld());
    const before = await snapshot();
    await setup({ scopes: 'all' });
    await setLookup('401 → 301');
    await compare();
    await shot('all-review');
    const rows = await summaryRows();
    metrics['全項目: 差分取得の結果'] = rows.map(item => `${item.label}:${item.status}`).join(' / ');
    assert.equal(rows.length, 16, '反映できる 16 項目すべてを比べる');
    const failed = rows.filter(item => !/差分あり|一致/.test(item.status));
    assert.deepEqual(failed, [], `取得失敗・確認が必要な項目が無い: ${JSON.stringify(failed)}`);
    assert.equal((await snapshot()).writes.length, 0, '差分の確認では書き込まない');
    await run();
    await shot('all-result');
    const now = await assertOnlyAllowedWrites('全項目の反映');
    assert.match(await resultText(), /16 項目を反映しました|項目を反映しました/, '結果を成功として示す');
    assert.equal(now.downloads.length, 1, '反映前のバックアップを 1 つ保存する');
    const firstWrite = now.writes[0].seq;
    assert.ok(now.downloads[0].seq < firstWrite, 'バックアップの保存が最初の書き込みより前');
    assert.equal(revisionChain(now), true, '書き込みの revision が直前の書き込みの結果につながっている');
    assert.equal(now.writes[0].revisionBefore, '10', '最初の書き込みは確認時の revision（10）を送る');
    metrics['全項目: 書き込み'] = writeLabels(now);
    assert.ok(okWrites(now).length >= 14, `書き込み ${okWrites(now).length} 件`);
    // 反映元・他のアプリは変わらない
    for (const id of ['101', '203', '204', '301', '401']) assert.deepEqual(now.apps[id].preview, before.apps[id].preview, `#${id} は変わらない`);
    assert.deepEqual(now.apps['202'].prod, before.apps['202'].prod, '本番は変わらない');
    // 反映後の差分を再確認する：差分が残るなら、エンジンが送っていない設定がある
    await button('反映後の差分を再確認').click();
    await idle();
    const after = await summaryRows();
    const remaining = after.filter(item => !/一致/.test(item.status));
    metrics['全項目: 再確認で残った差分'] = remaining.map(item => `${item.label}:${item.status}`).join(' / ') || 'なし';
    await shot('all-postcheck');
    assert.deepEqual(remaining, [], `反映後の再確認で差分が残っている: ${JSON.stringify(remaining)}`);
    assert.match(await statusText(), /すべて反映元と一致しています/);
    ok('reflect: 全項目の反映と再確認');
  });

  scenario('reflect: 項目を絞った反映（フィールド・レイアウト・一覧だけ）', async () => {
    await reset(reflectWorld());
    const before = await snapshot();
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] });
    await setLookup('401 → 301');
    await compare();
    await run();
    const now = await assertOnlyAllowedWrites('絞った反映');
    const touched = [...new Set(okWrites(now).map(write => write.key))];
    assert.deepEqual(touched.sort(), ['fieldSettings', 'layoutSettings', 'viewSettings'], '選んだ項目だけを書き込む');
    for (const key of ['reportSettings', 'processSettings', 'appAcl', 'customizeSettings', 'appSettings', 'actionSettings']) assert.deepEqual(now.apps['202'].preview[key], before.apps['202'].preview[key], `選ばなかった ${key} は変わらない`);
    assert.equal(revisionChain(now), true);
    // 反映した項目の内容が反映元と合う（反映先だけのフィールドは保持）
    const dev = now.apps['101'].prod.viewSettings.views, got = now.apps['202'].preview.viewSettings.views;
    assert.ok(got['担当別'] && got['担当別'].fields.join() === dev['担当別'].fields.join(), '反映元の一覧が反映先にある');
    ok('reflect: 項目を絞った反映');
  });

  scenario('reflect: 保持 ON/OFF（反映先だけの一覧・グラフ・アクション）', async () => {
    // 保持 ON（既定）: 反映先だけの設定は残る
    await reset(reflectWorld({ targetOnly: true }));
    await setup({ scopes: ['viewSettings', 'reportSettings', 'actionSettings', 'fieldSettings'] });
    await setLookup('401 → 301');
    await compare();
    await run();
    let now = await assertOnlyAllowedWrites('保持 ON');
    assert.ok(now.apps['202'].preview.viewSettings.views['営業所専用'], '保持 ON: 反映先だけの一覧が残る');
    assert.ok(now.apps['202'].preview.reportSettings.reports['営業所別'], '保持 ON: 反映先だけのグラフが残る');
    assert.ok(now.apps['202'].preview.actionSettings.actions['営業所専用コピー'], '保持 ON: 反映先だけのアクションが残る');
    assert.ok(now.apps['202'].preview.fieldSettings.properties.cust_name, '反映先のフィールドは常に残る');
    // 保持 OFF: 削除する。最終確認で削除件数を示し、反映先IDの入力を求める
    await reset(reflectWorld({ targetOnly: true }));
    await setup({ scopes: ['viewSettings', 'reportSettings', 'actionSettings', 'fieldSettings'] });
    await setLookup('401 → 301');
    await setPreserve(false);
    await compare();
    await button('最終確認に進む').click();
    const confirmText = await page.locator('#kus-rl-stage-confirm').innerText();
    assert.match(confirmText, /削除・置換される設定（\d+ 件）/, '削除する設定を件数つきで示す');
    assert.match(confirmText, /営業所専用/, '削除する一覧の名前を示す');
    assert.equal(await idBox().isVisible(), true, '削除を含むときは反映先IDの入力を求める');
    await ackBox().check();
    assert.equal(await runButton().isDisabled(), true, 'IDを入れるまで反映できない');
    await idBox().fill('202');
    await runButton().click();
    await idle();
    now = await assertOnlyAllowedWrites('保持 OFF');
    assert.equal(now.apps['202'].preview.viewSettings.views['営業所専用'], undefined, '保持 OFF: 反映先だけの一覧を削除する');
    assert.equal(now.apps['202'].preview.reportSettings.reports['営業所別'], undefined, '保持 OFF: 反映先だけのグラフを削除する');
    assert.equal(now.apps['202'].preview.actionSettings.actions['営業所専用コピー'], undefined, '保持 OFF: 反映先だけのアクションを削除する');
    assert.ok(now.apps['202'].preview.fieldSettings.properties.cust_name, '保持 OFF でも、フィールドは削除しない');
    ok('reflect: 保持 ON/OFF');
  });

  scenario('lookup: 参照先変換（入れ忘れ・候補の追加・変換先が無いとき）', async () => {
    // (a) 参照先変換が空のまま：差分確認で候補を示す。入れずに反映すると、開発用マスタ（#401）が本番に書き込まれる
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'actionSettings'] });
    await compare();
    const box = page.locator('#kus-rl-stage-review [data-lookup-candidates]');
    assert.equal(await box.count(), 1, '参照先変換の入れ忘れを差分確認で示す');
    const boxText = await box.innerText();
    assert.match(boxText, /401（取引先マスタ（開発）） → 301（取引先マスタ）/, '候補に、分かる範囲でアプリ名を添える');
    await shot('lookup-candidates');
    metrics['参照先変換: 候補の表示'] = boxText.replace(/\n+/g, ' / ');
    // 候補を入れずに反映すると、最終確認で反映先IDの入力を求める
    await button('最終確認に進む').click();
    assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /参照先変換に入れていない、参照先アプリの違いがあります/);
    assert.equal(await idBox().isVisible(), true, '候補を入れていないときは反映先IDの入力を求める');
    await button('差分に戻る').click();
    // (b) 候補を参照先変換に追加して差分を取り直す → 参照先は本番のマスタ（#301）のまま、反映元との差分は出ない
    await box.getByRole('button', { name: '候補を参照先変換に追加して差分を取り直す', exact: true }).click();
    await idle();
    assert.equal(await page.locator('#kus-rl-stage-review [data-lookup-candidates]').count(), 0, '追加すると候補は出ない');
    await tab('対象を選ぶ').click();
    assert.equal(await page.locator('.kus-rl-detail-summary').innerText().then(text => /参照先変換 1 件/.test(text)), true, '追加した参照先変換の件数を第1画面に示す');
    await tab('差分を確認').click();
    await run();
    let now = await assertOnlyAllowedWrites('参照先変換の候補を入れた反映');
    const target = now.apps['202'].preview;
    assert.equal(target.fieldSettings.properties.customer_code.lookup.relatedApp.app, '301', 'ルックアップの参照先は本番のマスタのまま');
    assert.equal(target.fieldSettings.properties.rel.referenceTable.relatedApp.app, '301', '関連レコード一覧の参照先も本番のマスタのまま');
    assert.equal(target.actionSettings.actions['受注コピー'].destApp.app, '301', 'アクションのコピー先も本番のマスタのまま');
    // (c) 変換先のアプリが無いとき：書き込む前に止まる
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings'] });
    await setLookup('401 → 999');
    await compare();
    assert.equal(await page.getByRole('button', { name: '最終確認に進む', exact: true }).isDisabled(), true, '変換先を確認できないときは最終確認へ進めない');
    assert.match(await panelText(), /ルックアップ変換先を確認できません: 401 → 999/);
    assert.equal((await snapshot()).writes.length, 0);
    ok('lookup: 参照先変換');
  });

  scenario('lookup: 参照先変換が空のまま反映したときの現状（開発用マスタが本番に書き込まれる）', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings'] });
    await compare();
    await run();
    const now = await assertOnlyAllowedWrites('入れ忘れたまま反映');
    const written = now.apps['202'].preview.fieldSettings.properties.customer_code.lookup.relatedApp.app;
    metrics['参照先変換: 入れ忘れたまま反映したときの参照先'] = `#${written}（開発用マスタ #401 / 本番のマスタ #301）`;
    // 利用者が最終確認で反映先IDを入力して進めた場合の結果。以前は何も言わずに書き込まれていた。
    assert.equal(written, '401', '利用者が確認して進めたときは、そのとおり反映する（自動では書き換えない）');
    ok('lookup: 入れ忘れの現状');
  });

  scenario('failure: 取得失敗（差分確認）と、取得し直し・対象から外す', async () => {
    await reset(reflectWorld({ engine: { failGets: { '202:preview:viewSettings': { code: 'GAIA_NO01', message: 'この操作を実行する権限がありません。', times: 4 } } } }));
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] });
    await setLookup('401 → 301');
    await compare();
    await shot('failure-fetch');
    assert.match(await entryStatus('ビュー設定'), /確認が必要|取得失敗/, '取得できなかった項目を差分ありとも一致とも言わない');
    assert.equal(await button('最終確認に進む').isDisabled(), true, '取得失敗の項目を選んだままでは最終確認へ進めない');
    assert.match(await panelText(), /取得失敗|取得し直す/);
    assert.equal((await snapshot()).writes.length, 0);
    // 対象から外せば進める
    await page.getByRole('checkbox', { name: 'ビュー設定を反映候補に含める', exact: true }).uncheck();
    assert.equal(await button('最終確認に進む').isEnabled(), true, '取得失敗の項目を外すと進める');
    await page.getByRole('checkbox', { name: 'ビュー設定を反映候補に含める', exact: true }).check();
    // 時間がたって取得できるようになったら、差分を再取得して続けられる
    await K(() => { delete window.__k.failGets['202:preview:viewSettings']; });
    await button('差分を再取得').click();
    await idle();
    assert.match(await entryStatus('ビュー設定'), /差分あり/);
    assert.equal(await button('最終確認に進む').isEnabled(), true);
    await run();
    await assertOnlyAllowedWrites('取得失敗からの復帰');
    ok('failure: 取得失敗');
  });

  scenario('failure: 参照するフィールドが反映先に無いとき、フィールド設定も含めて再取得する', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['viewSettings'] });
    await compare();
    await shot('missing-field');
    assert.equal(await button('最終確認に進む').isDisabled(), true, '参照するフィールドが無いので進めない');
    assert.match(await panelText(), /参照するフィールド「region」が反映先にありません/);
    assert.equal((await snapshot()).writes.length, 0);
    await page.getByRole('button', { name: 'フィールド設定も反映対象に含めて再取得', exact: true }).click();
    await idle();
    assert.equal(await button('最終確認に進む').isEnabled(), true, '再取得すると進める');
    assert.match(await panelText(), /フィールド設定/);
    await run();
    const now = await assertOnlyAllowedWrites('参照不足からの再取得');
    assert.ok(now.apps['202'].preview.fieldSettings.properties.region, '先に追加したフィールドを参照する一覧が書き込める');
    assert.ok(now.apps['202'].preview.viewSettings.views['担当別'], '一覧も書き込める');
    assert.equal(writeLabels(now).filter(label => /fields/.test(label)).length > 0 && writeLabels(now).findIndex(label => /fields/.test(label)) < writeLabels(now).findIndex(label => /views/.test(label)), true, 'フィールドの追加が一覧より先');
    ok('failure: 参照フィールド不足からの再取得');
  });

  scenario('conflict: 確認後に外部で更新されたとき、書き込む前に止まる', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] });
    await setLookup('401 → 301');
    await compare();
    await arm();
    await K(() => window.__k.bumpPreview('202'));
    await runButton().click();
    await idle();
    const now = await snapshot();
    await shot('conflict-stop');
    assert.equal(okWrites(now).length, 0, '外部の更新があったら何も書き込まない');
    assert.match(await statusText(), /反映前の検査で停止しました|確認後|更新されました/, '止まった理由を示す');
    assert.equal(now.downloads.length, 0, '書き込まないのでバックアップも作らない');
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true', '差分を取り直せる確認の画面へ戻す');
    assert.equal(await button('最終確認に進む').isDisabled() || await button('差分を再取得').isVisible(), true);
    // 差分を取り直せば続けられる
    await button('差分を再取得').click();
    await idle();
    await run();
    const after = await assertOnlyAllowedWrites('外部更新のあとの再実行');
    assert.ok(okWrites(after).length > 0);
    assert.equal(revisionChain(after), true);
    ok('conflict: 外部更新での停止');
  });

  scenario('failure: 書き込みの途中の失敗（以降は未実行）と、失敗・未実行だけの再実行', async () => {
    await reset(reflectWorld({ engine: { failWrites: { viewSettings: { code: 'GAIA_IL26', message: '指定したフィールドが存在しません。', times: 1 } } } }));
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings'] });
    await setLookup('401 → 301');
    await compare();
    await run();
    await shot('midway-failure');
    let now = await assertOnlyAllowedWrites('途中の失敗');
    const text = await resultText();
    assert.match(text, /失敗/, '失敗した項目を示す');
    assert.match(text, /未実行/, '以降の項目は未実行');
    assert.match(await statusText(), /項目中 \d+ 項目を反映しました。失敗 1 項目.*「失敗・未実行だけ選択」で再実行してください/);
    assert.equal(await statusTone(), 'warn');
    const fieldsDone = now.writes.filter(write => !write.rejected && write.key === 'fieldSettings').length;
    assert.ok(fieldsDone > 0, '失敗する前の項目は書き込み済み');
    assert.equal(now.writes.filter(write => write.key === 'reportSettings').length, 0, '失敗した後の項目には書き込まない（中断）');
    assert.equal(revisionChain(now), true);
    // 失敗・未実行だけを選び直して差分を取り直し、再実行する
    await button('失敗・未実行だけ選択').click();
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');
    await compare();
    const planned = await summaryRows();
    assert.deepEqual(planned.map(item => item.label), ['ビュー設定', 'グラフ設定'], '失敗・未実行の 2 項目だけを比べる');
    await run();
    now = await assertOnlyAllowedWrites('途中の失敗の再実行');
    assert.match(await resultText(), /2 項目を反映しました/);
    assert.ok(now.apps['202'].preview.viewSettings.views['担当別'] && now.apps['202'].preview.reportSettings.reports['地域別'], '失敗した一覧と未実行のグラフが反映される');
    await button('反映後の差分を再確認').click();
    await idle();
    assert.match(await statusText(), /すべて反映元と一致しています/);
    ok('failure: 途中の失敗と再実行');
  });

  scenario('cancel: 反映の中止（途中で止まった項目と未実行を示す）', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings', 'reportSettings'] });
    await setLookup('401 → 301');
    await compare();
    await arm();
    await K(() => { window.__k.holdWrites = true; });
    await runButton().click();
    await page.waitForFunction(() => window.__k.heldWrites >= 1);
    await page.locator('.kus-lp__cancel').click();
    await K(() => window.__k.release());
    await idle();
    await shot('cancel-result');
    const now = await assertOnlyAllowedWrites('中止');
    const text = await resultText();
    assert.match(text, /中止|途中で停止|未実行/, '中止を結果に示す');
    assert.doesNotMatch(text, /失敗 [1-9]/, '中止を失敗として数えない');
    assert.match(await statusText(), /中止しました/);
    assert.ok(okWrites(now).length <= 2, `中止の要求後に書き込みを続けない（書き込み ${okWrites(now).length} 件）`);
    metrics['中止: 書き込み'] = writeLabels(now);
    // 続きは差分を取り直して再実行できる
    await button('失敗・未実行だけ選択').click();
    await K(() => { window.__k.holdWrites = false; });
    await compare();
    await run();
    await assertOnlyAllowedWrites('中止のあとの再実行');
    await button('反映後の差分を再確認').click();
    await idle();
    assert.match(await statusText(), /すべて反映元と一致しています|項目に差分が残っています/);
    ok('cancel: 中止');
  });

  scenario('restore: バックアップから戻す（反映 → 戻す → 元の内容に戻るか）', async () => {
    await reset(reflectWorld({ targetOnly: true }));
    const original = (await snapshot()).apps['202'].preview;
    await setup({ scopes: ['layoutSettings', 'viewSettings', 'reportSettings', 'appSettings', 'actionSettings', 'fieldSettings', 'customizeSettings'] });
    await setLookup('401 → 301');
    await compare();
    await run();
    const reflected = await assertOnlyAllowedWrites('戻す前の反映');
    assert.notDeepEqual(reflected.apps['202'].preview.viewSettings, original.viewSettings, '反映で変わっている');
    await button('バックアップから戻す（差分を確認）').click();
    await idle();
    await shot('restore-review');
    assert.match(await panelText(), /バックアップ/, '反映前のバックアップから戻すことを示す');
    assert.match(await statusText(), /バックアップから戻す内容の差分を取得しました/);
    // 差分確認では書き込まない。戻す内容に、取得失敗・確認が必要な項目が無い
    const rows = await summaryRows();
    metrics['戻す: 差分取得の結果'] = rows.map(item => `${item.label}:${item.status}`).join(' / ');
    assert.deepEqual(rows.filter(item => !/差分あり|一致/.test(item.status)), [], `戻す差分に確認が必要な項目がある: ${JSON.stringify(rows)}`);
    await run();
    const now = await assertOnlyAllowedWrites('バックアップから戻す');
    const restored = now.apps['202'].preview;
    // 元の内容に戻るか：追加したフィールドは削除されない（仕様）。それ以外は一致する
    const differing = [];
    // 一覧・グラフ・アクションの表示順（index）は、反映のたびに 0 からの連番へ振り直される。順序が同じなら同じ内容として比べる。
    const normalize = (key, settings) => {
      const named = { viewSettings: 'views', reportSettings: 'reports', actionSettings: 'actions' }[key];
      if (!named) return settings;
      const entries = Object.entries(settings[named]).sort((a, b) => Number(a[1].index) - Number(b[1].index));
      return { order: entries.map(([name]) => name), items: Object.fromEntries(entries.map(([name, item]) => { const { index: _index, ...rest } = item; return [name, rest]; })) };
    };
    const firstDifference = (a, b, where = '') => {
      if (JSON.stringify(a) === JSON.stringify(b)) return '';
      if (a && b && typeof a === 'object' && typeof b === 'object') for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) { const found = firstDifference(a[key], b[key], `${where}/${key}`); if (found) return found; }
      return `${where}: ${JSON.stringify(b)?.slice(0, 80)} → ${JSON.stringify(a)?.slice(0, 80)}`;
    };
    const details = {};
    for (const key of ['viewSettings', 'reportSettings', 'actionSettings', 'customizeSettings', 'appSettings']) {
      const difference = firstDifference(normalize(key, restored[key]), normalize(key, original[key]));
      if (difference) { differing.push(key); details[key] = difference; }
    }
    if (details.customizeSettings) {
      // JS/CSS はアップロードで fileKey が変わるため、名前と本体で比べる
      const names = settings => ['desktop', 'mobile'].flatMap(p => ['js', 'css'].flatMap(k => (settings[p]?.[k] || []).map(item => item.type === 'URL' ? item.url : item.file.name))).join();
      if (names(restored.customizeSettings) === names(original.customizeSettings)) { differing.splice(differing.indexOf('customizeSettings'), 1); delete details.customizeSettings; }
    }
    metrics['戻す: 元と違う内容（最初の 1 件）'] = Object.keys(details).length ? details : 'なし（JS/CSS は fileKey が変わるだけ）';
    // 追加したフィールドは削除されない（仕様）。元のフィールド（テーブルの中も）の定義だけを比べる。
    const withoutAdded = (definition, reference) => definition && reference?.fields ? { ...definition, fields: Object.fromEntries(Object.keys(reference.fields).map(code => [code, definition.fields?.[code]])) } : definition;
    const fieldDifferences = Object.keys(original.fieldSettings.properties).map(code => [code, firstDifference(withoutAdded(restored.fieldSettings.properties[code], original.fieldSettings.properties[code]), original.fieldSettings.properties[code])]).filter(([, difference]) => difference);
    const sameFields = fieldDifferences.length === 0;
    metrics['戻す: 元のフィールド定義と違うもの'] = fieldDifferences.slice(0, 6).map(([code, difference]) => `${code}${difference}`);
    metrics['戻す: 元と違う項目'] = differing.join('、') || 'なし';
    metrics['戻す: 元のフィールド定義が一致'] = sameFields;
    assert.deepEqual(differing, [], `バックアップから戻しても元の内容に戻らない項目がある: ${differing.join('、')}`);
    assert.equal(sameFields, true, '元のフィールドの定義が戻る');
    assert.deepEqual(restored.layoutSettings.layout.length >= 1, true);
    ok('restore: バックアップから戻す');
  });

  scenario('ux: 二重クリックで 1 回だけ反映する', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'layoutSettings'] });
    await setLookup('401 → 301');
    await compare();
    await arm();
    await runButton().evaluate(b => { b.click(); b.click(); b.click(); });
    await idle();
    const now = await assertOnlyAllowedWrites('二重クリック');
    assert.equal(now.downloads.length, 1, 'バックアップは 1 つ');
    const fieldWrites = now.writes.filter(write => write.key === 'fieldSettings' && !write.rejected).length;
    assert.ok(fieldWrites >= 1 && fieldWrites <= 2, `フィールドの書き込みが重ならない（${fieldWrites}）`);
    assert.equal(now.writes.filter(write => write.rejected).length, 0, '拒否された書き込みが無い（同じ revision で 2 回送っていない）');
    ok('ux: 二重クリック');
  });

  scenario('pending: 反映先プレビューに以前からの未公開の変更があるとき（実エンジン）', async () => {
    await reset(reflectWorld());
    await K(() => window.__k.bumpPreview('202'));
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] });
    await setLookup('401 → 301');
    await compare();
    await shot('pending-review');
    const reviewText = await page.locator('#kus-rl-stage-review').innerText();
    assert.match(reviewText, /反映先に以前からの未公開の変更があります/, '以前からの未公開の変更を差分確認で示す');
    await button('最終確認に進む').click();
    assert.equal(await idBox().isVisible(), true, '未公開の変更があるときは反映先IDの入力を求める');
    assert.match(await page.locator('#kus-rl-stage-confirm').innerText(), /変更を中止/, '取り消し方（未公開の変更も破棄される）を示す');
    await ackBox().check();
    assert.equal(await runButton().isDisabled(), true);
    await idBox().fill('202');
    await runButton().click();
    await idle();
    await assertOnlyAllowedWrites('未公開の変更があるときの反映');
    const result = await resultText();
    assert.match(result, /バックアップから戻す/, '今回の反映だけを戻す方法を示す');
    assert.match(result, /未公開の変更/, '「変更を中止」ではそれらも破棄されることを示す');
    ok('pending: 未公開の変更');
  });

  scenario('pending: 直前にこのツールで反映した分は「以前からの未公開の変更」にしない', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'layoutSettings'] });
    await setLookup('401 → 301');
    await compare();
    await run();
    await button('反映後の差分を再確認').click();
    await idle();
    const text = await page.locator('#kus-rl-stage-review').innerText();
    assert.match(text, /未公開の変更はこのツールの反映分だけ/, '自分の反映分は以前からの変更にしない');
    assert.doesNotMatch(text, /反映先に以前からの未公開の変更があります/);
    ok('pending: 自分の反映分');
  });

  scenario('source: 反映元の取得環境をプレビュー（未公開）にしたとき、未公開の変更を反映元にする', async () => {
    await reset(reflectWorld());
    await K(() => window.__k.bumpPreview('101'));
    await setup({ scopes: ['fieldSettings'] });
    await setLookup('401 → 301');
    await compare();
    assert.doesNotMatch(await page.locator('#kus-rl-stage-review').innerText(), /late_added/, '本番の設定を取得するときは、反映元の未公開の変更を含めない');
    await tab('対象を選ぶ').click();
    await page.getByRole('combobox', { name: '反映元の取得環境' }).selectOption('preview');
    await compare();
    assert.match(await page.locator('#kus-rl-stage-review').innerText(), /late_added/, 'プレビューの設定を取得すると、反映元の未公開の変更を含める');
    await run();
    const now = await assertOnlyAllowedWrites('プレビューを反映元にした反映');
    assert.ok(now.apps['202'].preview.fieldSettings.properties.late_added, '反映元のプレビューにだけあるフィールドが反映される');
    assert.deepEqual(now.apps['101'].prod, (await snapshot()).apps['101'].prod, '反映元は変わらない');
    ok('source: プレビューを反映元に');
  });
}

// ---------------------------------------------------------------------------
// シナリオ：続けて反映する反映先（一括事前確認）
// ---------------------------------------------------------------------------
function registerRollout(scenario, ctx) {
  const { page, button, tab, idle, statusText, shot, reset, snapshot, K, setup, setLookup, setRollout, compare, summaryRows, assertOnlyAllowedWrites, run, finding, ok, metrics, skipScale } = ctx;
  const card = () => page.locator('[data-precheck="card"]');
  const rowStates = () => page.locator('[data-precheck-row]').evaluateAll(nodes => nodes.map(node => [node.dataset.precheckRow, node.dataset.state]));
  const runPrecheck = async () => { await page.locator('[data-precheck-run]').click(); await idle(); };

  scenario('rollout: 全反映先の事前確認（実エンジン）', async () => {
    await reset(reflectWorld({ engine: { writableApps: ['202', '203', '204'] } }));
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings', 'customizeSettings'] });
    await setLookup('401 → 301');
    await setRollout('203\n204\n205');
    await runPrecheck();
    await shot('precheck-1');
    let now = await snapshot();
    assert.equal(now.writes.length, 0, '一括確認では書き込まない');
    assert.deepEqual(await rowStates(), [['202', 'diff'], ['203', 'diff'], ['204', 'same'], ['205', 'error']], '差分あり・差分なし・取得失敗（存在しないアプリ）を示す');
    assert.match(await page.locator('[data-precheck-row="205"]').innerText(), /取得失敗[\s\S]*反映先 #205/, '存在しない反映先は取得失敗（差分なしと言わない）');
    assert.match(await page.locator('[data-precheck-row="202"]').innerText(), /差分のある項目: フィールド設定、レイアウト設定、ビュー設定/);
    assert.match(await page.locator('[data-precheck-row="204"]').innerText(), /一致しています/, '反映元と同じ作りの反映先（JS/CSS は fileKey が違っても内容が同じ）は差分なし');
    // 反映元は 1 回だけ取得する
    const sourceGets = now.calls.filter(call => call.method === 'GET' && call.params?.app === '101');
    metrics['一括確認: 反映元の取得回数（項目 4 + 反映先ごとに増えない）'] = sourceGets.length;
    assert.ok(sourceGets.length <= 4 + 1, `反映元の設定を反映先ごとに取得し直している: ${sourceGets.length}`);
    // 差分のない反映先を外す。取得失敗だけ確認し直す
    await page.locator('[data-precheck-drop]').click();
    await page.locator('textarea[aria-label="続けて反映する反映先"]').inputValue().then(value => assert.equal(value, '203\n205'));
    await K(() => { window.__k.apps['205'] = { id: '205', guest: '', name: '営業管理（九州）', code: 'app205', spaceId: null, prodRev: 3, previewRev: 3, prod: JSON.parse(JSON.stringify(window.__k.apps['203'].prod)), preview: JSON.parse(JSON.stringify(window.__k.apps['203'].prod)), group: null, status: null, deniedPreview: false }; });
    await page.locator('[data-precheck-retry]').click();
    await idle();
    assert.deepEqual(await rowStates(), [['202', 'diff'], ['203', 'diff'], ['205', 'diff']], '取得失敗だった反映先だけを確認し直す');
    // 行から、その反映先の差分確認へ進む（反映先ごとの差分確認と最終確認は今までどおり）
    await page.locator('[data-precheck-open="203"]').click();
    await idle();
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('input[aria-label="反映先アプリID"]').inputValue(), '203');
    now = await snapshot();
    assert.equal(now.writes.length, 0, '行から差分確認へ進んでも書き込まない');
    assert.equal(await button('最終確認に進む').isEnabled(), true);
    await shot('precheck-open-target');
    ok('rollout: 全反映先の事前確認');
  });

  scenario('rollout: 入力を変えたら一括確認の結果は古い扱い／参照先変換の候補', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'actionSettings'] });
    await setRollout('203');
    await runPrecheck();
    assert.match(await page.locator('[data-precheck-row="202"]').innerText(), /参照先変換の候補があります/, '参照先変換の入れ忘れを一括確認の行にも示す');
    await setLookup('401 → 301');
    assert.equal(await page.locator('[data-precheck-stale]').isVisible(), true, '参照先変換を変えると古い結果として示す');
    assert.equal(await page.locator('[data-precheck-drop]').isDisabled(), true);
    await runPrecheck();
    assert.equal(await page.locator('[data-precheck-stale]').isHidden(), true);
    assert.doesNotMatch(await page.locator('[data-precheck-row="202"]').innerText(), /参照先変換の候補があります/, '入れたあとは候補を示さない');
    ok('rollout: 古い結果の扱い');
  });

  scenario('rollout: 一括確認の中止（未実行（中止）と取得失敗を混ぜない）', async () => {
    await reset(reflectWorld({ engine: { latency: 40 } }));
    await setup({ scopes: ['fieldSettings', 'layoutSettings'] });
    await setRollout('203\n204\n205\n206\n207\n208');
    await page.locator('[data-precheck-run]').click();
    await page.waitForFunction(() => /全反映先の差分を確認中… [1-9]\/7 件/.test(document.querySelector('.kus-lp__status').textContent));
    await page.locator('.kus-lp__cancel').click();
    await idle();
    const states = (await rowStates()).map(item => item[1]);
    assert.ok(states.includes('notrun'), `未実行（中止）を示す: ${states}`);
    assert.equal(states.filter(state => state === 'error').length, states.filter(state => state === 'error').length);
    const notRunIds = (await rowStates()).filter(item => item[1] === 'notrun').map(item => item[0]);
    const errors = (await rowStates()).filter(item => item[1] === 'error').map(item => item[0]);
    // 存在しないアプリ（205 以降）は取得失敗、中止で確認しなかった反映先は未実行（中止）
    assert.ok(notRunIds.every(id => !errors.includes(id)));
    assert.match(await statusText(), /中止しました（\d\/7 件を確認、\d 件は未実行（中止））/);
    const now = await snapshot();
    assert.equal(now.writes.length, 0);
    ok('rollout: 一括確認の中止');
  });

  scenario('rollout: 続けて反映（実エンジンで 202 → 203 の順に、反映先ごとの差分確認と最終確認を経て反映）', async () => {
    await reset(reflectWorld({ engine: { writableApps: ['202', '203'] } }));
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] });
    await setLookup('401 → 301');
    await setRollout('203');
    await runPrecheck();
    assert.deepEqual(await rowStates(), [['202', 'diff'], ['203', 'diff']]);
    assert.equal((await snapshot()).writes.length, 0, '一括確認では書き込まない');
    await compare();
    await run('202');
    let now = await assertOnlyAllowedWrites('1 件目の反映', ['202']);
    assert.ok(now.writes.length > 0 && now.writes.every(write => write.body.app === '202'), '1 件目の反映は 202 だけに書き込む');
    const firstCount = now.writes.length;
    assert.equal(await page.locator('[data-rollout-next]').innerText(), '次の反映先 #203 の差分を確認');
    await page.locator('[data-rollout-next]').click();
    await idle();
    now = await snapshot();
    assert.equal(now.writes.length, firstCount, '次の反映先へ進んでも、差分確認までは書き込まない');
    assert.equal(await page.locator('input[aria-label="反映先アプリID"]').inputValue(), '203');
    await run('203');
    now = await assertOnlyAllowedWrites('2 件目の反映', ['202', '203']);
    const second = now.writes.slice(firstCount);
    assert.ok(second.length > 0 && second.every(write => write.body.app === '203'), '2 件目の反映は 203 だけに書き込む');
    assert.equal(second[0].revisionBefore, '7', '2 件目は 203 の確認時の revision から始まる');
    assert.deepEqual(await page.locator('[data-rollout-entry]').evaluateAll(nodes => nodes.map(node => node.dataset.rolloutEntry)), ['202', '203'], 'これまでの反映先を記録する');
    assert.equal(await card().isVisible(), false, '続けて反映する反映先が無くなったら、事前確認は出さない');
    await shot('rollout-done');
    ok('rollout: 続けて反映');
  });

  scenario('scale: 1000 件の反映先の一括確認（固まらない）', async () => {
    if (skipScale) { console.log('  （--skip-scale のため省略）'); return; }
    await reset({ apps: [
      { id: '101', name: '反映元', prodRevision: 20, previewRevision: 20, production: businessSettings('反映元', 'dev', 401) },
      { id: '202', name: '反映先', prodRevision: 10, previewRevision: 10, production: businessSettings('反映先', 'prod', 301) },
      masterApp(), masterApp({ id: '401', name: '取引先マスタ（開発）' })
    ], bulk: { count: 1000, startId: 1000, changedEvery: 3 }, files: BUSINESS_FILES, writableApps: [], latency: 1 });
    // 規模の確認が目的なので、反映元は 2 項目だけにする（bulk のアプリは name・memo の 2 フィールドとレイアウトだけを持つ）
    await setup({ source: '1000', scopes: ['fieldSettings', 'layoutSettings'] });
    await setRollout(Array.from({ length: 1000 }, (_, i) => String(1000 + i)).join('\n'));
    await K(() => { window.__long.length = 0; });
    const t0 = Date.now();
    await runPrecheck();
    const elapsed = Date.now() - t0;
    metrics['規模: 1000 反映先の一括確認の所要時間'] = `${(elapsed / 1000).toFixed(1)} 秒`;
    const snap = await snapshot();
    metrics['規模: 一括確認の通信件数'] = snap.calls.length;
    assert.equal(snap.writes.length, 0);
    assert.equal(await page.locator('[data-precheck-row]').count(), 50, '一覧は 50 件ずつ描画する');
    assert.match(await page.locator('[data-precheck-note]').innerText(), /^1001 件を確認しました/);
    const long = await page.evaluate(() => Math.max(0, ...window.__long));
    metrics['規模: 最長の処理（ms）'] = long;
    assert.ok(long < 1500, `画面が固まった: 最長 ${long}ms`);
    await shot('scale-precheck');
    ok('scale: 1000 件の一括確認');
  });
}

// ---------------------------------------------------------------------------
// シナリオ：画面・操作
// ---------------------------------------------------------------------------
function registerUx(scenario, ctx) {
  const { page, button, tab, idle, statusText, panelText, sourceBox, targetBox, runButton, ackBox, idBox, shot, reset, snapshot, K, setup, setLookup, setRollout, compare, summaryRows, arm, run, resultText, finding, ok, metrics, assertOnlyAllowedWrites, lookupBox, rolloutBox, chip } = ctx;

  scenario('ux: 閉じて開き直したときの状態（入力・結果・差分の取得結果）', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] });
    await setLookup('401 → 301');
    await setRollout('203\n204');
    await compare();
    await button('閉じる').click();
    assert.equal(await page.locator('#kus-reflect-lite').count(), 0, '閉じるとパネルが消える');
    await page.addScriptTag({ content: ctx.toolScript });
    await page.waitForSelector('#kus-reflect-lite');
    const stage = await page.locator('[role="tab"][aria-selected="true"]').innerText();
    await tab('対象を選ぶ').click();
    const reopened = {
      source: await sourceBox().inputValue(), target: await targetBox().inputValue(),
      scopes: await page.locator('.kus-rl-scope-group input:checked').evaluateAll(list => list.map(node => node.getAttribute('aria-label'))),
      stage: stage.replace(/\n/g, ' ')
    };
    metrics['開き直し: 差分を取得したあと'] = reopened;
    assert.equal(reopened.source, '101', '反映元の入力を引き継ぐ');
    assert.equal(reopened.target, '202', '反映先の入力を引き継ぐ');
    assert.deepEqual(reopened.scopes.sort(), ['ビュー設定', 'フィールド設定', 'レイアウト設定'].sort(), '選んだ項目を引き継ぐ');
    await tab('対象を選ぶ').click();
    await page.getByRole('button', { name: '詳細設定…', exact: true }).click();
    assert.equal(await lookupBox().inputValue(), '401 → 301', '参照先変換を引き継ぐ');
    assert.equal(await rolloutBox().inputValue(), '203\n204', '続けて反映する反映先を引き継ぐ');
    await button('詳細設定を閉じる').click();
    // 反映して結果を出したあと、閉じて開き直す → 結果とバックアップの導線を表示する
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'layoutSettings'] });
    await setLookup('401 → 301');
    await compare();
    await run();
    await button('閉じる').click();
    await page.addScriptTag({ content: ctx.toolScript });
    await page.waitForSelector('#kus-reflect-lite');
    const text = await panelText();
    metrics['開き直し: 反映したあと'] = { stage: await page.locator('[role="tab"][aria-selected="true"]').innerText(), hasResult: /項目を反映しました/.test(text), hasRestore: /バックアップから戻す/.test(text) };
    assert.match(text, /項目を反映しました/, '前回の結果を表示する');
    assert.match(text, /バックアップから戻す/, 'バックアップから戻す導線を残す');
    assert.equal((await snapshot()).writes.length, okWriteCount(await snapshot()), '開き直しでは書き込まない');
    ok('ux: 閉じて開き直し');
  });
  const okWriteCount = now => now.writes.length;

  scenario('ux: 画面幅 320〜1440px（反映の各段階）で横にはみ出さない', async () => {
    await reset(reflectWorld());
    const sizes = [[1440, 1000], [1024, 768], [720, 450], [390, 844], [320, 640]];
    await setup({ scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'] });
    await setLookup('401 → 301');
    const overflow = () => page.evaluate(() => { const canvas = document.querySelector('.kus-rl-canvas'), root = document.querySelector('#kus-reflect-lite').getBoundingClientRect(); return { overflow: canvas.scrollWidth - canvas.clientWidth, right: root.right, left: root.left }; });
    const widths = {};
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await tab('対象を選ぶ').click();
      widths[`setup-${width}`] = await overflow();
      await shot(`ux-w${width}-setup`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await compare();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      widths[`review-${width}`] = await overflow();
      await shot(`ux-w${width}-review`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await arm();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      widths[`confirm-${width}`] = await overflow();
      await shot(`ux-w${width}-confirm`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await runButton().click();
    await idle();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      widths[`result-${width}`] = await overflow();
      await shot(`ux-w${width}-result`);
    }
    metrics['画面幅: 横にはみ出した画面'] = Object.entries(widths).filter(([, value]) => value.overflow > 1).map(([name]) => name).join('、') || 'なし';
    for (const [name, value] of Object.entries(widths)) {
      assert.ok(value.overflow <= 1, `${name}: 横にはみ出す ${JSON.stringify(value)}`);
      assert.ok(value.left >= -1 && value.right <= Number(name.split('-')[1]) + 1, `${name}: パネルが画面外にはみ出す ${JSON.stringify(value)}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    ok('ux: 画面幅');
  });

  scenario('ux: キーボードだけで、差分確認から反映まで進める（Enter では書き込まない）', async () => {
    await reset(reflectWorld());
    await setup({ scopes: ['fieldSettings', 'layoutSettings'] });
    await setLookup('401 → 301');
    await button('差分を確認する').focus();
    await page.keyboard.press('Enter');
    await idle();
    assert.equal(await tab('差分を確認').getAttribute('aria-selected'), 'true');
    await button('最終確認に進む').focus();
    await page.keyboard.press('Enter');
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
    await ackBox().focus();
    await page.keyboard.press('Space');
    assert.equal(await ackBox().isChecked(), true, 'Space で確認のチェックを入れられる');
    if (await idBox().isVisible()) {
      await idBox().focus();
      await page.keyboard.type('202');
      await page.keyboard.press('Enter');
      assert.equal((await snapshot()).writes.length, 0, 'IDの入力中の Enter では書き込まない');
    }
    await runButton().focus();
    await page.keyboard.press('Enter');
    await idle();
    await assertOnlyAllowedWrites('キーボードだけの操作');
    assert.match(await resultText(), /項目を反映しました/);
    ok('ux: キーボードだけの操作');
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
      for (const raw of [...visible.split('\n'), ...labels]) {
        const line = raw.trim();
        if (!line || line.startsWith('[')) continue;
        if (!lines.has(line)) lines.set(line, { line, screens: new Set() });
        lines.get(line).screens.add(name);
      }
    }
    const rules = [
      { id: 'wording-terms', strict: true, title: '用語がガイドの表と違う語を使っている（比較元・比較先・ソース・ターゲット・運用環境・キャンセル・スキップ）', test: ({ line }) => /比較元|比較先|ソース|ターゲット|運用環境|キャンセル|スキップ/.test(line) },
      { id: 'wording-api-context', strict: true, title: '内部の通信情報（[API] …）が画面に出る（取得失敗の理由は利用者向けの 1 行目だけ示す）', test: ({ line }) => /\[API\]/.test(line) },
      { id: 'wording-guest-id', strict: true, title: '「ゲストスペースID」ではなく「ゲストID」と表示している（入力欄の短い placeholder 以外）', test: ({ line }) => /ゲストID/.test(line) && !/（任意）/.test(line) && line !== 'ゲストID' },
      { id: 'wording-preview-english', severity: 'low', title: '「プレビュー」ではなく英語の preview が画面に出る', test: ({ line }) => /(?<![A-Za-z/_.-])preview(?![A-Za-z/_.-])/i.test(line) && !/GAIA|k\/v1|\.json|api/.test(line) },
      { id: 'wording-internal-id', severity: 'low', title: '内部の識別子・API 名が、かみ砕いた語なしで画面に出る', test: ({ line }) => /fileKey|_fetchError|customize\.json|\b(PUT|POST)\b|GAIA_|CB_[A-Z]{2}\d/.test(line) }
    ];
    for (const rule of rules) {
      const hits = [...lines.values()].filter(item => rule.test(item));
      if (!hits.length) continue;
      const shown = hits.slice(0, 6).map(item => `「${item.line.slice(0, 90)}」（${[...item.screens][0]}）`).join(' / ');
      if (rule.strict) assert.fail(`${rule.title}: ${shown}`);
      finding(rule.id, rule.severity, rule.title, { expected: 'docs/ui-writing-guide.md の用語・書き方に合わせる。', actual: shown + (hits.length > 6 ? ` ほか ${hits.length - 6} 件` : '') });
    }
    // 見出しのバッジは「プレビューへ書き込み」の 1 つだけ（ガイド 2）。プレビューへの書き込みの注意書き（ガイド 4）
    for (const [name, { visible }] of entries.slice(0, 40)) {
      // 幅 720px 以下ではバッジの行を畳む（実装の仕様）。それ以外の画面では 1 つだけ出す
      const badges = (visible.match(/プレビューへ書き込み(?!ます)/g) || []).length;
      assert.ok(/-w(720|390|320)-/.test(name) ? badges <= 1 : badges === 1, `${name}: 見出しのバッジは「プレビューへ書き込み」の 1 つだけ（${badges}）`);
      assert.match(visible, /反映先のプレビューだけを変更します。本番への公開は kintone の設定画面で行います。/, `${name}: プレビューへの書き込みの注意書きが決まった言い回し`);
    }
    ok('wording: 用語・バッジ・書き込みの注意書き');
  });
}

if (require.main === module) main().catch(error => { console.error(error); process.exit(1); });
