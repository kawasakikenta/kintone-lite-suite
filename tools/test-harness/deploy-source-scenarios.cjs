'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 本番反映の「反映元アプリから本番へ」の画面と操作契約を、エンジンだけを合成エンジンに差し替えて検証する。
// 合成するのは tabs/reflect-standalone.ts（previewReflectStandalone・composeReflectSelectionStandalone・resolveReflectAppsStandalone・reflectConnectionError）、
// reflect/selection.ts（buildSectionSelectionModel・defaultSelectionState）、tabs/deploy-source-standalone.ts（runSourceToProductionStandalone）。
// 実エンジンとの結合は、エンジン側のテストと結合ハーネスで確かめる（ここでは画面が取り決めの型だけでエンジンを使うことを確かめる）。
// 実アプリ・外部 API への通信や書き込みは行わない。

const TOOL = path.resolve(__dirname, '../統合ツール');

// ---------------------------------------------------------------------------
// 合成エンジン（ページ内で動く ES モジュール）
// ---------------------------------------------------------------------------
const reflectModule = `
  import { isCancelRequested, RunCancelledError } from ${JSON.stringify(path.join(TOOL, 'src/runControl.ts'))};
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function setPointer(root, pointer, value) {
    var parts = pointer.split('/').slice(1).map(function (p) { return p.replace(/~1/g, '/').replace(/~0/g, '~'); });
    var node = root;
    for (var i = 0; i < parts.length - 1; i++) { if (node[parts[i]] === undefined || node[parts[i]] === null) node[parts[i]] = {}; node = node[parts[i]]; }
    if (value === undefined) delete node[parts[parts.length - 1]]; else node[parts[parts.length - 1]] = clone(value);
  }
  export function reflectConnectionError(o) {
    var items = [['反映元アプリID', o.sourceAppId, !!o.sourceBundle], ['反映先アプリID', o.targetAppId, false], ['反映元ゲストスペースID', o.sourceGuestId, true], ['反映先ゲストスペースID', o.targetGuestId, true]];
    for (var i = 0; i < items.length; i++) {
      if (items[i][2] && !items[i][1]) continue;
      if (!/^[1-9]\\d*$/.test(String(items[i][1] || ''))) return items[i][0] + 'には正の整数を入力してください。';
    }
    if (!o.sourceBundle && o.sourcePreview && o.sourceAppId === o.targetAppId && (o.sourceGuestId || '') === (o.targetGuestId || '')) return '反映元と反映先が同じプレビューです。別のアプリ、または反映元の本番設定を選んでください。';
    return '';
  }
  export async function resolveReflectAppsStandalone(o) {
    var mock = window.__src;
    mock.resolveCalls.push(clone({ sourceAppId: o.sourceAppId, targetAppId: o.targetAppId }));
    var invalid = reflectConnectionError(o);
    if (invalid) throw new Error(invalid);
    var find = function (role, id) { var app = mock.apps[id]; if (!app) throw new Error(role + ' #' + id + ': アプリが見つかりません（GAIA_AP01）'); return { appId: id, name: app.name, code: app.code || '', guestId: '' }; };
    var target = find('反映先', o.targetAppId);
    var source = o.sourceBundle ? { appId: o.sourceAppId, guestId: '', name: '設定JSON（' + (o.sourceBundle.name || '') + '）', code: '' } : find('反映元', o.sourceAppId);
    return { source: source, target: target };
  }
  export async function previewReflectStandalone(o, setStatus) {
    var mock = window.__src;
    mock.previewCalls.push(clone({ sourceAppId: o.sourceAppId, sourceGuestId: o.sourceGuestId, sourcePreview: o.sourcePreview, hasBundle: !!o.sourceBundle, targetAppId: o.targetAppId, targetGuestId: o.targetGuestId, scopes: o.scopes, lookupMap: o.lookupMap, preserveTargetOnly: o.preserveTargetOnly }));
    setStatus('反映元の設定を取得中...');
    if (mock.previewStep) await new Promise(function (resolve) { mock.previewWaiting = resolve; }); else await delay(mock.delay || 0);
    if (isCancelRequested()) throw new RunCancelledError();
    if (mock.previewFails) throw new Error(mock.previewFails);
    var entries = o.scopes.map(function (key) { return clone(mock.entries[key]); }).filter(Boolean);
    return {
      totalSections: entries.length, changedSections: entries.filter(function (e) { return e.status === 'change'; }).length, sameSections: entries.filter(function (e) { return e.status === 'same'; }).length,
      errorSections: entries.filter(function (e) { return e.status !== 'change' && e.status !== 'same'; }).length,
      entries: entries, baseline: { token: 'baseline-' + mock.previewCalls.length }, sourceFieldCodes: [], targetFieldCodes: [], sourceSystemFieldCodes: [],
      targetPending: clone(mock.targetPending), fieldLabels: { name: '顧客名', memo: '備考' }
    };
  }
  export function composeReflectSelectionStandalone(preview, states) {
    var mock = window.__src;
    mock.composeCalls.push(clone({ scopes: preview.entries.map(function (e) { return e.sectionKey; }), states: states }));
    var blockers = [];
    var all = {};
    Object.keys(states).forEach(function (k) { (states[k].selected || []).forEach(function (id) { all[id] = true; }); });
    var sections = [];
    preview.entries.forEach(function (entry) {
      var model = mock.models[entry.sectionKey];
      if (!model) return;
      var state = states[entry.sectionKey] || { selected: model.changes.map(function (c) { return c.id; }), overrides: {} };
      var chosen = {};
      (state.selected || []).forEach(function (id) { chosen[id] = true; });
      var errors = [], edited = 0, after;
      if (state.json !== undefined) {
        after = clone(state.json); edited = 1;
        if (after && after.bad) errors.push('JSONに許可されない項目「bad」があります。');
      } else {
        after = clone(model.before);
        model.changes.forEach(function (c) {
          if (!chosen[c.id]) return;
          setPointer(after, c.pointer, c.after);
          (c.editables || []).forEach(function (e) {
            if (Object.prototype.hasOwnProperty.call(state.overrides || {}, e.pointer)) { setPointer(after, e.pointer, state.overrides[e.pointer]); edited += 1; }
            else if (c.whole) setPointer(after, e.pointer, e.value);
          });
        });
      }
      var items = [];
      var selectedChanges = model.changes.filter(function (c) { return chosen[c.id]; });
      selectedChanges.forEach(function (c) {
        items.push({ kind: c.kind, name: c.labelPath.join(' / '), details: c.whole ? [] : [c.beforeText + ' → ' + (Object.prototype.hasOwnProperty.call(state.overrides || {}, c.pointer) ? String(state.overrides[c.pointer]) : c.afterText)] });
        if (c.needsField && !all['fieldSettings:/properties/' + c.needsField] && !mock.targetHasFields[c.needsField]) blockers.push(model.label + ': 参照するフィールド「' + c.needsField + '」が反映先にありません。フィールド設定も反映対象に含めるか、この項目を除外してください。');
      });
      sections.push({
        sectionKey: entry.sectionKey, label: model.label, after: after,
        plan: { sectionKey: entry.sectionKey, label: model.label, status: selectedChanges.length ? 'change' : 'same', message: '', behavior: '', changes: [], changeCount: selectedChanges.length, removalCount: items.filter(function (i) { return i.kind === '削除'; }).length, warnings: [], blockers: [], operations: [], items: items },
        selectedCount: selectedChanges.length, totalCount: model.changes.length, editedCount: edited, errors: errors
      });
    });
    return { sections: sections, blockers: Array.from(new Set(blockers)) };
  }
`;

const selectionModule = `
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  export function buildSectionSelectionModel(plan) {
    var model = window.__src.models[plan.sectionKey];
    window.__src.modelCalls.push(plan.sectionKey);
    return model ? clone(model) : null;
  }
  export function defaultSelectionState(model) { return { selected: model.changes.map(function (c) { return c.id; }), overrides: {} }; }
  export function composeSectionSelection() { throw new Error('画面は composeReflectSelectionStandalone を使う'); }
  export function buildPlanFromComposedAfter() { throw new Error('画面からは呼ばない'); }
  // 項目をまたぐ requires は、固定のモデルに最初から含める（単体テストで検証済み）
  export function attachFieldAdditionRequires() {}
`;

const sourceDeployModule = `
  import { isCancelRequested } from ${JSON.stringify(path.join(TOOL, 'src/runControl.ts'))};
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  async function step() { var mock = window.__src; if (mock.stepMode) await new Promise(function (resolve) { mock.waiting = resolve; }); else await delay(mock.delay || 0); }
  export async function runSourceToProductionStandalone(opts) {
    var mock = window.__src, cfg = mock.run || {};
    mock.runs.push({ reflect: clone({ sourceAppId: opts.reflect.sourceAppId, targetAppId: opts.reflect.targetAppId, scopes: opts.reflect.scopes, preserveTargetOnly: opts.reflect.preserveTargetOnly, lookupMap: opts.reflect.lookupMap }), composed: clone(opts.composed), goal: opts.goal, allowPendingChanges: opts.allowPendingChanges, targetPending: clone(opts.targetPending), reviewBaseline: clone(opts.reviewBaseline) });
    if (cfg.throwsBefore) throw new Error(cfg.throwsBefore);
    var startedAt = new Date().toISOString();
    opts.setStatus && opts.setStatus('反映前の反映先プレビューをバックアップ中…');
    var sections = [], cancelled = false, stopped = false;
    var label = function (key) { return mock.models[key] ? mock.models[key].label : key; };
    var scopes = opts.reflect.scopes;
    for (var i = 0; i < scopes.length; i++) {
      var key = scopes[i];
      if (stopped) { var why = cancelled ? '中止のため未実行' : '中断のため未実行'; sections.push({ sectionKey: key, label: label(key), status: 'pending', message: why }); opts.onSectionUpdate({ sectionKey: key, label: label(key), status: 'pending', message: why }); continue; }
      opts.onSectionUpdate({ sectionKey: key, label: label(key), status: 'running' });
      await step();
      if (isCancelRequested()) { cancelled = true; stopped = true; sections.push({ sectionKey: key, label: label(key), status: 'pending', message: '中止のため未実行' }); opts.onSectionUpdate({ sectionKey: key, label: label(key), status: 'pending', message: '中止のため未実行' }); continue; }
      if (cfg.throwsAfter && i === 0) throw new Error(cfg.throwsAfter);
      var plan = (cfg.plan || {})[key] || 'ok';
      if (plan === 'ng') { var msg = '権限がありません（CB_NO02）\\n[API] PUT /k/v1/preview/app/form/fields.json'; sections.push({ sectionKey: key, label: label(key), status: 'ng', message: msg }); opts.onSectionUpdate({ sectionKey: key, label: label(key), status: 'ng', message: msg }); stopped = true; }
      else { sections.push({ sectionKey: key, label: label(key), status: 'ok' }); opts.onSectionUpdate({ sectionKey: key, label: label(key), status: 'ok' }); }
    }
    // バックアップの設定本体（「バックアップから戻す」でそのまま反映元になる形）。cfg.backupApp で、バックアップに含まれるアプリを変えられる。
    var bundleOf = function (appId, preview) { return { appId: appId, guestId: '', preview: preview, fetchedAt: new Date().toISOString(), meta: { sectionRevisions: {} }, sections: { fieldSettings: { properties: {} }, layoutSettings: { layout: [] }, viewSettings: { views: {} }, customizeSettings: { scope: 'ALL' } } }; };
    var backupApp = cfg.backupApp || opts.reflect.targetAppId;
    var apply = { logs: ['[mock] 合成エンジンのログです。実アプリには通信していません。'], sections: sections, finalRevision: '15', backup: { generatedAt: new Date().toISOString(), scopes: scopes, bundle: Object.assign({ secret: 'BUNDLE-BODY' }, bundleOf(backupApp, true)) } };
    if (cancelled) apply.cancelled = true;
    var result = { goal: opts.goal, apply: apply };
    if (opts.goal !== 'production') return result;
    if (sections.some(function (s) { return s.status !== 'ok'; })) { result.deploySkipped = cancelled ? '中止したため、本番へは反映しませんでした。' : '反映先プレビューへの書き込みに失敗した項目があるため、本番へは反映しませんでした。'; return result; }
    if (opts.targetPending && opts.targetPending.state === 'pending' && !opts.allowPendingChanges) { result.deploySkipped = '反映先プレビューの以前からの未公開の変更が了承されていないため、本番へは反映しませんでした。'; return result; }
    if (cfg.deploySkip) { result.deploySkipped = cfg.deploySkip; return result; }
    var target = mock.apps[opts.reflect.targetAppId];
    var update = function (status, message) { opts.onDeployUpdate && opts.onDeployUpdate({ appId: opts.reflect.targetAppId, guestId: '', status: status, message: message }); };
    update('checking'); await step(); update('deploying'); await step();
    var app = { appId: opts.reflect.targetAppId, guestId: '', name: target.name, status: cfg.deployFails ? 'failed' : 'success', productionRevisionBefore: '12', previewRevision: '15' };
    if (cfg.deployFails) { app.message = '権限がありません（GAIA_NO01）'; }
    else { app.productionRevisionAfter = cfg.unverified ? '12' : '16'; app.verified = !cfg.unverified; }
    update(app.status, app.message);
    result.deploy = { mode: 'deploy', batchMode: 'sequential', startedAt: startedAt, finishedAt: new Date().toISOString(), apps: [app], logs: ['[mock] POST /k/v1/preview/app/deploy.json'],
      backup: { fileName: '本番反映前バックアップ_' + target.name + '(app' + opts.reflect.targetAppId + ')_20260101_000009.json', appCount: 1, generatedAt: new Date().toISOString(), environment: 'production', unavailableFiles: [],
        content: { kind: 'kintone-deploy-backup', version: 1, generatedAt: new Date().toISOString(), mode: 'deploy', environment: 'production', scopes: ['fieldSettings', 'layoutSettings', 'viewSettings', 'customizeSettings'], bundles: [bundleOf(backupApp, false)], secret: 'CONTENT-BODY' } } };
    return result;
  }
`;

async function bundle({ esbuild, deployMock }) {
  const result = await esbuild.build({
    absWorkingDir: TOOL, entryPoints: ['src/entries/deploy-lite-ui.ts'], bundle: true, write: false,
    format: 'iife', globalName: 'DeployHarness', platform: 'browser', target: ['chrome110'], logLevel: 'silent',
    plugins: [{ name: 'deploy-source-fixtures', setup(build) {
      const files = { 'deploy-standalone': deployMock, 'reflect-standalone': reflectModule, 'reflect/selection': selectionModule, 'deploy-source-standalone': sourceDeployModule };
      build.onResolve({ filter: /(\/|^)(deploy-standalone|reflect-standalone|deploy-source-standalone)\.js$|reflect\/selection\.js$/ }, args => {
        const name = /deploy-source-standalone/.test(args.path) ? 'deploy-source-standalone' : /reflect-standalone/.test(args.path) ? 'reflect-standalone' : /reflect\/selection/.test(args.path) ? 'reflect/selection' : 'deploy-standalone';
        return { path: name, namespace: 'source-fixture' };
      });
      build.onLoad({ filter: /.*/, namespace: 'source-fixture' }, args => ({ contents: files[args.path], loader: 'js', resolveDir: TOOL }));
    } }]
  });
  return result.outputFiles[0].text;
}

// ---------------------------------------------------------------------------
// 設定の組み立て（Node 側）
// ---------------------------------------------------------------------------
const FIELD_BEFORE = { properties: { name: { type: 'SINGLE_LINE_TEXT', code: 'name', label: '取引先', required: false }, old: { type: 'SINGLE_LINE_TEXT', code: 'old', label: '旧項目' } } };

function leaf(section, pointer, group, name, before, after, extra = {}) {
  return {
    id: `${section}:${pointer}`, sectionKey: section, pointer, labelPath: [group, name], groupId: `${section}:${group}`, groupLabel: group, kind: '変更',
    before, after, beforeText: typeof before === 'object' ? JSON.stringify(before) : String(before), afterText: typeof after === 'object' ? JSON.stringify(after) : String(after), whole: false, editables: [], ...extra
  };
}

function models({ big = false } = {}) {
  const result = {
    fieldSettings: {
      sectionKey: 'fieldSettings', label: 'フィールド設定', before: FIELD_BEFORE, after: {}, jsonEditable: true, note: undefined,
      changes: [
        leaf('fieldSettings', '/properties/name/label', '顧客名（name）', '表示名', '取引先', '顧客名', { editables: [{ pointer: '/properties/name/label', label: '表示名', value: '顧客名', editor: { type: 'text' } }] }),
        leaf('fieldSettings', '/properties/name/required', '顧客名（name）', '必須', false, true, { beforeText: 'いいえ', afterText: 'はい', editables: [{ pointer: '/properties/name/required', label: '必須', value: true, editor: { type: 'boolean' } }] }),
        leaf('fieldSettings', '/properties/name/unique', '顧客名（name）', '重複禁止', false, true, { beforeText: 'いいえ', afterText: 'はい', editables: [{ pointer: '/properties/name/unique', label: '重複禁止', value: true, editor: { type: 'select', options: [['true', 'はい'], ['false', 'いいえ']] } }] }),
        leaf('fieldSettings', '/properties/memo', '備考（memo）', '備考（memo）', undefined, { type: 'MULTI_LINE_TEXT', code: 'memo', label: '備考', required: false }, {
          kind: '追加', whole: true, beforeText: '（なし）', afterText: '{"type":"MULTI_LINE_TEXT","code":"memo","label":"備考"}', labelPath: ['備考（memo）'],
          editables: [{ pointer: '/properties/memo/label', label: '表示名', value: '備考', editor: { type: 'text' } }, { pointer: '/properties/memo/required', label: '必須', value: false, editor: { type: 'boolean' } }]
        }),
        leaf('fieldSettings', '/properties/ref', '参照（ref）', '参照（ref）', undefined, { type: 'NUMBER', code: 'ref', label: '参照' }, { kind: '追加', whole: true, labelPath: ['参照（ref）'], requires: ['fieldSettings:/properties/memo'], editables: [] }),
        leaf('fieldSettings', '/properties/old', '旧項目（old）', '旧項目（old）', FIELD_BEFORE.properties.old, undefined, { kind: '削除', whole: true, labelPath: ['旧項目（old）'], beforeText: '{"type":"SINGLE_LINE_TEXT","code":"old","label":"旧項目"}', afterText: '（なし）' })
      ]
    },
    layoutSettings: {
      sectionKey: 'layoutSettings', label: 'レイアウト設定', before: { layout: [] }, after: {}, jsonEditable: true, note: 'レイアウトは全体で選びます',
      changes: [leaf('layoutSettings', '/layout', 'レイアウト', 'レイアウト全体', [], [{ type: 'ROW', fields: [] }], { whole: true, labelPath: ['レイアウト全体'], beforeText: '[]', afterText: '[{"type":"ROW"}]' })]
    },
    viewSettings: {
      sectionKey: 'viewSettings', label: 'ビュー設定', before: { views: { 全件: { sort: 'レコード番号 asc' } } }, after: {}, jsonEditable: true,
      changes: [
        leaf('viewSettings', '/views/全件/sort', '一覧「全件」', '並び順', 'レコード番号 asc', '更新日時 desc', { editables: [{ pointer: '/views/全件/sort', label: '並び順', value: '更新日時 desc', editor: { type: 'text' } }] }),
        leaf('viewSettings', '/views/メモ一覧', '一覧「メモ一覧」', '一覧「メモ一覧」', undefined, { type: 'LIST', fields: ['memo'] }, { kind: '追加', whole: true, labelPath: ['一覧「メモ一覧」'], needsField: 'memo' })
      ]
    },
    customizeSettings: {
      sectionKey: 'customizeSettings', label: 'JS/CSS設定', before: { scope: 'ALL' }, after: {}, jsonEditable: false,
      changes: [leaf('customizeSettings', '/scope', '適用範囲', '適用範囲', 'ALL', 'ADMIN', { editables: [{ pointer: '/scope', label: '適用範囲', value: 'ADMIN', editor: { type: 'select', options: [['ALL', '全員'], ['ADMIN', '管理者のみ']] } }] })]
    }
  };
  if (big) {
    const changes = [];
    for (let i = 0; i < 1500; i += 1) {
      changes.push(leaf('actionSettings', `/actions/a${i}/name`, `アクション a${i}`, '名前', `旧${i}`, `新${i}`, { editables: [{ pointer: `/actions/a${i}/name`, label: '名前', value: `新${i}`, editor: { type: 'text' } }] }));
      changes.push(leaf('actionSettings', `/actions/a${i}/index`, `アクション a${i}`, '有効', 'false', 'true'));
    }
    result.actionSettings = { sectionKey: 'actionSettings', label: 'アクション設定', before: { actions: {} }, after: {}, jsonEditable: true, changes };
  }
  return result;
}

function entry(key, label, status, extra = {}) {
  return { sectionKey: key, label, status, message: status === 'same' ? '書き込み不要（一致）' : '', behavior: '', changes: [], changeCount: status === 'change' ? 3 : 0, removalCount: 0, warnings: [], blockers: [], operations: [], ...extra };
}

function entries({ big = false } = {}) {
  const list = {
    fieldSettings: entry('fieldSettings', 'フィールド設定', 'change', { changeCount: 6 }),
    layoutSettings: entry('layoutSettings', 'レイアウト設定', 'change', { changeCount: 1 }),
    viewSettings: entry('viewSettings', 'ビュー設定', 'change', { changeCount: 2 }),
    customizeSettings: entry('customizeSettings', 'JS/CSS設定', 'change', { changeCount: 1 }),
    reportSettings: entry('reportSettings', 'グラフ設定', 'error', { message: 'グラフの設定を取得できませんでした（GAIA_NO01: 権限がありません）', blockers: ['グラフの設定を取得できませんでした（GAIA_NO01: 権限がありません）'] }),
    categories: entry('categories', 'カテゴリ設定', 'same')
  };
  if (big) list.actionSettings = entry('actionSettings', 'アクション設定', 'change', { changeCount: 3000 });
  return list;
}

module.exports = {
  bundle,
  async run({ page, script, out }) {
    const checks = [];
    const ok = name => { checks.push(name); };
    const ROOT_SEL = '#kus-deploy-lite';
    const button = name => page.getByRole('button', { name, exact: true });
    const tab = name => page.getByRole('tab', { name: new RegExp(name) });
    const flowRadio = name => page.getByRole('radio', { name, exact: true });
    const idle = () => page.waitForFunction(() => document.querySelector('#kus-deploy-lite').getAttribute('aria-busy') !== 'true');
    const dockText = () => page.locator('.kus-dp-dock-copy').innerText();
    const statusText = () => page.locator('.kus-lp__status-text').innerText();
    const src = () => page.evaluate(() => JSON.parse(JSON.stringify({ previewCalls: window.__src.previewCalls, composeCalls: window.__src.composeCalls, runs: window.__src.runs, resolveCalls: window.__src.resolveCalls, modelCalls: window.__src.modelCalls })));
    const lastCompose = async () => (await src()).composeCalls.at(-1);
    const card = key => page.locator(`[data-select-section="${key}"]`);
    const row = id => page.locator(`.kus-ds-row[data-change-id="${id}"]`);
    const rowCheck = id => row(id).locator('input[type="checkbox"]');
    const editCard = key => page.locator(`[data-edit-section="${key}"]`);
    const editRow = (key, pointer) => editCard(key).locator(`.kus-ds-edit[data-edit-pointer="${pointer}"]`);
    const fact = key => page.locator(`[data-confirm="${key}"]`);
    const ackBox = () => page.getByRole('checkbox', { name: '上記の内容を確認しました', exact: true });
    const pendingBox = () => page.getByRole('checkbox', { name: '未公開の変更も一緒に本番へ反映されることを了承する', exact: true });
    const idBox = () => page.locator('input[aria-label="確認用の反映先アプリID"]');
    const runButton = () => page.getByRole('button', { name: /^確認した内容を反映先(へ書き込み、本番へ反映|プレビューへ反映)$/ });
    const selectCount = key => page.locator(`[data-select-count="${key}"]`);
    const editCount = key => page.locator(`[data-edit-count="${key}"]`);

    const pending = { state: 'pending', productionRevision: '12', previewRevision: '14', sectionKeys: ['layoutSettings'], message: '反映先プレビューに未公開の変更があります（設定の更新番号 revision は 本番 12 / プレビュー 14）。' };
    const clean = { state: 'clean', productionRevision: '12', previewRevision: '12', sectionKeys: [], message: '反映先プレビューに未公開の変更はありません。' };

    async function reset(config = {}) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.setContent('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#e8edf3"></body></html>');
      await page.evaluate(({ cfg, models: modelList, entries: entryList }) => {
        window.__src = Object.assign({
          apps: { '10': { name: '営業テンプレート（開発）', code: 'tpl' }, '20': { name: '営業管理', code: 'sales' }, '30': { name: '受注管理', code: 'orders' } },
          models: modelList, entries: entryList, targetPending: cfg.targetPending === undefined ? null : cfg.targetPending, targetHasFields: { },
          previewCalls: [], composeCalls: [], runs: [], resolveCalls: [], modelCalls: [], opened: [], delay: 0, run: {}
        }, cfg);
        window.kintone = { app: { getId: () => 20 }, api: Object.assign(async (url, method, params) => {
          const match = /\/app\.json$/.exec(url);
          if (match) {
            const app = window.__src.apps[String(params.id)];
            if (!app) { const error = new Error('指定したアプリが見つかりません。'); error.code = 'GAIA_AP01'; throw error; }
            return { appId: String(params.id), name: app.name, code: app.code };
          }
          return {};
        }, { url: p => p }) };
        window.open = function (url) { window.__src.opened.push(String(url)); return null; };
      }, { cfg: config.cfg || {}, models: models({ big: !!config.big }), entries: entries({ big: !!config.big }) });
      await page.addScriptTag({ content: script });
      await page.evaluate(() => DeployHarness.mountDeployLitePanel());
    }

    /** 反映元 10 → 反映先 20 を入れ、項目を追加で選んで、差分を抽出する。 */
    async function setIds(sourceId = '10', targetId = '20') {
      await page.getByLabel('反映元アプリID', { exact: true }).fill(sourceId);
      await page.getByLabel('反映先アプリID', { exact: true }).fill(targetId);
    }
    const chip = label => page.getByRole('checkbox', { name: label, exact: true });
    async function extract(scopes = []) {
      await setIds();
      for (const label of scopes) await chip(label).check();
      await button('差分を抽出する').click();
      await idle();
    }
    async function toEdit() { await button('内容の修正へ').click(); }
    async function toConfirm() { await button('最終確認に進む').click(); }
    async function overflowOf(where) {
      const geometry = await page.evaluate(() => {
        const canvas = document.querySelector('.kus-dp-canvas'); const root = document.querySelector('#kus-deploy-lite').getBoundingClientRect();
        const dock = document.querySelector('.kus-dp-action-dock').getBoundingClientRect();
        return { overflow: canvas.scrollWidth - canvas.clientWidth, left: root.left, right: root.right, bottom: root.bottom, vw: window.innerWidth, vh: window.innerHeight,
          canvasBottom: canvas.getBoundingClientRect().bottom, dockTop: dock.top, canvasHeight: canvas.clientHeight, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.ok(geometry.overflow <= 1, `${where}: 本文が横にはみ出す ${JSON.stringify(geometry)}`);
      assert.ok(geometry.left >= -1 && geometry.right <= geometry.vw + 1 && geometry.bottom <= geometry.vh + 1, `${where}: パネルが画面外 ${JSON.stringify(geometry)}`);
      assert.ok(geometry.canvasBottom <= geometry.dockTop + 1 && geometry.canvasHeight > 60, `${where}: 固定フッターが本文を覆う ${JSON.stringify(geometry)}`);
      assert.ok(geometry.docOverflow <= 1, `${where}: ページが横にはみ出す ${JSON.stringify(geometry)}`);
    }
    const downloadOf = async name => {
      const promise = page.waitForEvent('download');
      await button(name).click();
      const file = await promise;
      return { name: file.suggestedFilename(), text: await fs.promises.readFile(await file.path(), 'utf8') };
    };
    const sourceTerms = () => page.evaluate(() => {
      const root = document.querySelector('#kus-deploy-lite').cloneNode(true);
      root.querySelectorAll('.kus-ds-flowbar').forEach(node => node.remove());
      const texts = [root.textContent];
      root.querySelectorAll('[aria-label],[placeholder],[title]').forEach(el => texts.push(el.getAttribute('aria-label') || '', el.getAttribute('placeholder') || '', el.getAttribute('title') || ''));
      return texts.join('\n').match(/比較[元先]|ソース|ターゲット|スキップ|キャンセル|運用環境|preview|src\b/g) || [];
    });

    // =======================================================================
    // 1. 操作の切り替え（既定は反映元アプリから本番へ）
    // =======================================================================
    await reset();
    assert.equal(await page.locator('.kus-lp__title').innerText(), '本番反映');
    assert.equal(await flowRadio('反映元アプリから本番へ').isChecked(), true, '既定は反映元アプリから本番へ');
    assert.equal(await flowRadio('プレビューの変更を公開').isChecked(), false);
    assert.equal(await page.locator('.kus-lp__badge').allInnerTexts().then(list => list.join('|')), '本番の設定を変更', 'バッジは 1 つ');
    assert.match(await page.locator('.kus-lp__subtitle').innerText(), /反映元アプリとの差分を選んで、反映先のプレビューへ書き込み、続けて本番へ反映します。/);
    const tabNames = await page.getByRole('tab').allInnerTexts();
    assert.equal(tabNames.length, 5, '5 段階のタブ');
    ['対象を選ぶ', '差分を選ぶ', '内容を修正', '最終確認', '結果'].forEach((label, index) => assert.ok(tabNames[index].includes(label), `タブ ${index + 1}: ${label}`));
    // 従来の流れへ切り替える
    await flowRadio('プレビューの変更を公開').check();
    assert.equal((await page.getByRole('tab').allInnerTexts()).length, 4, '従来の流れは 4 段階');
    assert.equal(await page.locator('.kus-lp__subtitle').innerText(), 'プレビューの未公開の変更を確認してから、本番へ反映します。');
    assert.equal(await button('未公開の変更を確認する').isVisible(), true);
    assert.equal(await page.locator('.kus-ds-select').count(), 0, '見えない流れの要素は DOM に残さない');
    assert.equal(await page.locator('.kus-lp__status').count(), 1, 'ステータス欄は 1 つだけ');
    await flowRadio('反映元アプリから本番へ').check();
    assert.equal((await page.getByRole('tab').allInnerTexts()).length, 5);
    assert.equal(await page.locator('.kus-lp__status').count(), 1);
    ok('flow switch');

    // =======================================================================
    // 2. 対象を選ぶ・進めない理由
    // =======================================================================
    await reset({ cfg: { targetPending: pending } });
    assert.equal(await tab('差分を選ぶ').isDisabled(), true);
    assert.equal(await tab('最終確認').isDisabled(), true);
    assert.equal(await button('差分を抽出する').isDisabled(), true);
    assert.match(await dockText(), /次に進むには：反映元アプリIDには正の整数を入力してください。/);
    await page.getByLabel('反映元アプリID', { exact: true }).fill('10');
    // 反映先は開いているアプリ（20）が既定で入る
    assert.equal(await page.getByLabel('反映先アプリID', { exact: true }).inputValue(), '20', '反映先の既定は開いているアプリ');
    assert.equal(await button('差分を抽出する').isEnabled(), true);
    assert.match(await dockText(), /反映元と反映先の差分を抽出します。書き込みは行いません。/);
    // 既定の項目・目標
    const checked = await page.locator('.kus-ds-scope-group input:checked').evaluateAll(list => list.map(el => el.getAttribute('aria-label')));
    assert.deepEqual(checked, ['フィールド設定', 'レイアウト設定', 'ビュー設定'], '既定の項目はフィールド・レイアウト・一覧');
    assert.equal(await page.getByRole('radio', { name: '本番まで反映', exact: true }).isChecked(), true, '既定の目標は本番まで反映');
    assert.equal(await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).isChecked(), false);
    assert.match(await page.locator('.kus-dp-dock-copy strong').innerText(), /^反映元 #10 → 反映先 #20 · 本番まで反映$/);
    // 項目を全部外す
    for (const label of checked) await chip(label).uncheck();
    assert.match(await dockText(), /次に進むには：反映する項目を選んでください。/);
    assert.equal(await button('差分を抽出する').isDisabled(), true);
    await chip('フィールド設定').check();
    await chip('ビュー設定').check();
    await chip('レイアウト設定').check();
    // フィールド設定を外してビューだけにすると注意
    await chip('フィールド設定').uncheck();
    assert.equal(await page.locator('.kus-ds-scope-groups ~ .kus-ds-note').isVisible(), true, 'フィールド設定を含めないときの注意');
    await chip('フィールド設定').check();
    // 設定JSON
    await page.locator('select[data-source-kind]').selectOption('json');
    assert.match(await dockText(), /次に進むには：反映元の設定JSONを読み込んでください。/);
    await page.locator('select[data-source-kind]').selectOption('preview');
    // 同じプレビュー
    await page.getByLabel('反映元アプリID', { exact: true }).fill('20');
    assert.match(await dockText(), /次に進むには：反映元と反映先が同じプレビューです。/);
    await page.locator('select[data-source-kind]').selectOption('production');
    // URL の貼り付け
    await page.getByLabel('反映元アプリID', { exact: true }).fill('https://example.cybozu.com/k/guest/7/10/?view=3');
    await page.getByLabel('反映元アプリID', { exact: true }).press('Tab');
    assert.equal(await page.getByLabel('反映元アプリID', { exact: true }).inputValue(), '10');
    assert.equal(await page.getByLabel('反映元ゲストスペースID', { exact: true }).inputValue(), '7');
    await page.getByLabel('反映元ゲストスペースID', { exact: true }).fill('');
    // アプリ名の確認（入力中）
    await page.waitForFunction(() => /✓ 営業テンプレート（開発）（コード: tpl）/.test(document.querySelector('.kus-ds-app-note').textContent));
    assert.match(await page.locator('.kus-ds-endpoint--target .kus-ds-app-note').innerText(), /✓ 営業管理（コード: sales）/);
    await page.getByLabel('反映先アプリID', { exact: true }).fill('99');
    await page.waitForFunction(() => /アプリを確認できません/.test(document.querySelector('.kus-ds-endpoint--target .kus-ds-app-note').textContent));
    assert.equal(await button('差分を抽出する').isEnabled(), true, 'アプリ名の確認の失敗では進行を止めない');
    await page.getByLabel('反映先アプリID', { exact: true }).fill('20');
    // 詳細設定
    assert.match(await page.locator('.kus-dp-detail-summary').innerText(), /^詳細設定: 反映先だけの一覧・グラフ・アクションを保持 \/ 参照先変換なし$/);
    await button('詳細設定…').click();
    assert.equal(await page.locator('#kus-ds-detail').evaluate(el => el.matches(':modal')), true);
    assert.equal(await page.getByRole('checkbox', { name: '反映先だけの一覧・グラフ・アクションを保持する', exact: true }).isChecked(), true, '保持は既定でON');
    await page.getByLabel('参照先変換（旧AppID → 新AppID）').fill('abc');
    assert.match(await page.locator('#kus-ds-detail .kus-ds-json__error').innerText(), /参照先変換の 1 行目を読み取れません/);
    await page.keyboard.press('Escape');
    assert.match(await dockText(), /次に進むには：参照先変換の 1 行目を読み取れません/);
    assert.ok(await page.locator('.kus-dp-detail-summary--warn').count(), '誤りは目立たせる');
    await button('詳細設定…').click();
    await page.getByLabel('参照先変換（旧AppID → 新AppID）').fill('3 → 30');
    await page.getByRole('checkbox', { name: '反映先だけの一覧・グラフ・アクションを保持する', exact: true }).uncheck();
    await page.keyboard.press('Escape');
    assert.match(await page.locator('.kus-dp-detail-summary').innerText(), /^詳細設定: 反映先だけの一覧・グラフ・アクションを削除 \/ 参照先変換 1 件$/);
    assert.deepEqual(await sourceTerms(), [], '使わない用語が残っていない');
    ok('setup stage');

    // =======================================================================
    // 3. 差分の抽出（呼び出し内容・要約・未公開の変更）
    // =======================================================================
    await button('差分を抽出する').click();
    await idle();
    const firstCall = (await src()).previewCalls[0];
    assert.deepEqual(firstCall, { sourceAppId: '10', sourceGuestId: '', sourcePreview: false, hasBundle: false, targetAppId: '20', targetGuestId: '', scopes: ['fieldSettings', 'layoutSettings', 'viewSettings'], lookupMap: { 3: '30' }, preserveTargetOnly: false }, 'previewReflectStandalone に渡る入力');
    assert.equal((await src()).resolveCalls.length, 1, '抽出の前にアプリ名と閲覧権限を確認する');
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', '抽出に成功すると差分を選ぶ段階へ');
    assert.match(await statusText(), /差分のある項目 3・差分なし 0（変更 9 件）。反映する変更を選んでください。まだ書き込んでいません。/);
    assert.match(await page.locator('[data-extract-summary]').innerText(), /差分のある項目 3/);
    assert.equal(await page.locator('[data-target-pending="pending"]').count(), 1, '反映先の未公開の変更を表示する');
    assert.match(await page.locator('[data-target-pending="pending"]').innerText(), /反映先に以前からの未公開の変更があります/);
    assert.deepEqual(await page.locator('.kus-ds-select > .kus-ds-cards > .kus-ds-card .kus-ds-card__title').allInnerTexts(), ['フィールド設定', 'レイアウト設定', 'ビュー設定']);
    assert.match(await dockText(), /6 件の変更を選んでいます|9 件の変更を選んでいます/, '既定はすべて選択');
    // 入力を変えると抽出し直しを求める
    await tab('対象を選ぶ').click();
    await page.getByLabel('反映先アプリID', { exact: true }).fill('30');
    assert.equal(await tab('差分を選ぶ').isDisabled(), true, '入力を変えたら抽出し直しを求める');
    await page.getByLabel('反映先アプリID', { exact: true }).fill('20');
    assert.equal(await tab('差分を選ぶ').isDisabled(), false, '元に戻せば抽出結果をまた使える');
    ok('extract');

    // 失敗（アプリが存在しない）
    await reset();
    await setIds('10', '99');
    await button('差分を抽出する').click(); await idle();
    assert.match(await statusText(), /^エラー: 反映先 #99: アプリが見つかりません/);
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');
    assert.equal((await src()).previewCalls.length, 0, 'アプリを確認できないときは差分を取得しない');
    await reset({ cfg: { previewFails: '反映元 #10: 権限がありません（CB_NO02）' } });
    await extract();
    assert.match(await statusText(), /^エラー: 反映元 #10: 権限がありません/);
    assert.equal(await tab('差分を選ぶ').isDisabled(), true);
    ok('extract failures');

    // =======================================================================
    // 4. 差分の選択
    // =======================================================================
    await reset({ cfg: { targetPending: clean } });
    await extract(['JS/CSS設定', 'グラフ設定', 'カテゴリ設定']);
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('[data-extract-summary]').innerText(), /差分のある項目 4・差分なし 1・取得失敗 1/);
    assert.equal(await page.locator('[data-target-pending="clean"]').count(), 1);
    // カード: 項目名、選んだ数/全体、note、すべて選ぶ/外す
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 6\/6$/);
    assert.match(await card('layoutSettings').innerText(), /レイアウトは全体で選びます/, 'note を示す');
    assert.equal(await card('fieldSettings').locator('[data-action="select-all"]').isVisible(), true);
    // グループ・行
    assert.match(await row('fieldSettings:/properties/name/required').innerText(), /変更[\s\S]*顧客名（name） \/ 必須[\s\S]*いいえ[\s\S]*→[\s\S]*はい/, '場所・種類・前 → 後');
    assert.match(await row('fieldSettings:/properties/memo').innerText(), /追加[\s\S]*備考（memo）[\s\S]*この要素を追加します/, 'whole は要素ごとの追加');
    assert.match(await row('fieldSettings:/properties/old').innerText(), /削除[\s\S]*旧項目（old）[\s\S]*この要素を削除します/, 'whole は要素ごとの削除');
    // 行のチェック
    await rowCheck('fieldSettings:/properties/name/required').uncheck();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 5\/6$/);
    const groupCheck = card('fieldSettings').locator('input[data-group-check="fieldSettings:顧客名（name）"]');
    assert.equal(await groupCheck.getAttribute('data-check-state'), 'some', '一部選択を示す');
    assert.equal(await groupCheck.evaluate(el => el.indeterminate), true);
    let compose = await lastCompose();
    assert.equal(compose.states.fieldSettings.selected.includes('fieldSettings:/properties/name/required'), false, '作り直しに渡る選択');
    assert.equal(compose.states.fieldSettings.selected.length, 5);
    // グループのチェック
    await groupCheck.click();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 6\/6$/, '一部選択のグループを押すと残りも選ぶ');
    assert.equal(await groupCheck.getAttribute('data-check-state'), 'all');
    await groupCheck.click();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 3\/6$/);
    assert.equal(await groupCheck.getAttribute('data-check-state'), 'none');
    await groupCheck.click();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 6\/6$/);
    // すべて外す・すべて選ぶ
    await card('fieldSettings').locator('[data-action="select-none"]').click();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 0\/6$/);
    await card('fieldSettings').locator('[data-action="select-all"]').click();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 6\/6$/);
    ok('selection basics');

    // requires の連動
    await card('fieldSettings').locator('[data-action="select-none"]').click();
    assert.match(await row('fieldSettings:/properties/ref').innerText(), /選ぶと一緒に選ばれる変更: 備考（memo）/, 'requires を表示する');
    await rowCheck('fieldSettings:/properties/ref').check();
    assert.equal(await rowCheck('fieldSettings:/properties/memo').isChecked(), true, '選ぶと requires も一緒に選ぶ');
    assert.match(await statusText(), /「備考（memo）」は、選んだ変更に必要なため一緒に選びました。/);
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 2\/6$/);
    await rowCheck('fieldSettings:/properties/memo').uncheck();
    assert.equal(await rowCheck('fieldSettings:/properties/ref').isChecked(), false, '外すと、それを必要とする変更も外す');
    assert.match(await statusText(), /「参照（ref）」は、外した変更を必要とするため一緒に外しました。/);
    await card('fieldSettings').locator('[data-action="select-all"]').click();
    ok('requires');

    // 絞り込み
    await page.locator('[data-select-filter="keyword"]').fill('備考');
    await page.waitForFunction(() => document.querySelectorAll('[data-select-section="fieldSettings"] .kus-ds-row').length === 1);
    assert.equal(await row('fieldSettings:/properties/memo').isVisible(), true);
    assert.equal(await card('fieldSettings').locator('[data-action="select-none"]').innerText(), '表示中をすべて外す');
    await card('fieldSettings').locator('[data-action="select-none"]').click();
    assert.match(await selectCount('fieldSettings').innerText(), /^選んだ変更 4\/6$/, '絞り込み中は表示中だけを外す（参照（ref）は備考（memo）を必要とするため一緒に外れる）');
    await card('fieldSettings').locator('[data-action="select-all"]').click();
    await page.locator('[data-select-filter="keyword"]').fill('');
    await page.locator('[data-select-filter="kind"]').selectOption('削除');
    await page.waitForFunction(() => document.querySelectorAll('[data-select-section="fieldSettings"] .kus-ds-row').length === 1);
    assert.equal(await row('fieldSettings:/properties/old').isVisible(), true);
    await page.locator('[data-select-filter="kind"]').selectOption('all');
    await page.waitForFunction(() => document.querySelectorAll('[data-select-section="fieldSettings"] .kus-ds-row').length === 6);
    ok('filter');

    // 取得失敗の項目: 選んだままでは進めない
    assert.match(await card('reportSettings').innerText(), /取得失敗[\s\S]*グラフの設定を取得できませんでした/, '取得失敗の項目');
    assert.match(await card('categories').innerText(), /差分なし/);
    assert.equal(await button('内容の修正へ').isDisabled(), true);
    assert.match(await dockText(), /次に進むには：取得失敗の項目（グラフ設定）は、反映しない項目から外すか、差分を抽出し直してください。/);
    assert.match(await page.locator('[data-select-blockers]').innerText(), /グラフ設定: 取得失敗/, '画面下にも示す');
    assert.equal(await tab('内容を修正').isDisabled(), true);
    await card('reportSettings').locator('[data-action="drop-scope"]').click();
    assert.equal(await card('reportSettings').count(), 0, '外した項目のカードは消える');
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true', '外しても抽出結果は有効のまま');
    assert.equal(await button('内容の修正へ').isEnabled(), true);
    assert.equal((await src()).previewCalls.length, 1, '項目を外しても抽出し直さない');
    await tab('対象を選ぶ').click();
    assert.equal(await chip('グラフ設定').isChecked(), false, '段階 1 の項目からも外れる');
    await chip('グラフ設定').check();
    assert.equal(await tab('差分を選ぶ').isDisabled(), false, '抽出時の項目に含まれていた項目を戻しても抽出結果を使える');
    await tab('差分を選ぶ').click();
    assert.equal(await button('内容の修正へ').isDisabled(), true, '戻すとまた進めない');
    await card('reportSettings').locator('[data-action="drop-scope"]').click();
    // 抽出時に含めなかった項目を足すと、抽出し直しを求める
    await tab('対象を選ぶ').click();
    await chip('アクション設定').check();
    assert.equal(await tab('差分を選ぶ').isDisabled(), true, '抽出していない項目を足したら抽出し直し');
    await chip('アクション設定').uncheck();
    await tab('差分を選ぶ').click();
    ok('failed section blocks');

    // blockers（選ばなかったフィールドを参照する一覧）
    await rowCheck('fieldSettings:/properties/memo').uncheck();
    assert.match(await page.locator('[data-select-blockers]').innerText(), /ビュー設定: 参照するフィールド「memo」が反映先にありません。/);
    assert.equal(await button('内容の修正へ').isDisabled(), true);
    assert.match(await dockText(), /次に進むには：ビュー設定: 参照するフィールド「memo」が反映先にありません。/);
    await rowCheck('viewSettings:/views/メモ一覧').uncheck();
    assert.equal(await page.locator('[data-select-blockers]').isHidden(), true, '解消すると消える');
    assert.equal(await button('内容の修正へ').isEnabled(), true);
    await rowCheck('fieldSettings:/properties/memo').check();
    await rowCheck('viewSettings:/views/メモ一覧').check();
    // 何も選ばない
    for (const key of ['fieldSettings', 'layoutSettings', 'viewSettings', 'customizeSettings']) await card(key).locator('[data-action="select-none"]').click();
    assert.match(await dockText(), /次に進むには：反映する差分を選んでください。/);
    assert.equal(await button('内容の修正へ').isDisabled(), true);
    for (const key of ['fieldSettings', 'layoutSettings', 'viewSettings', 'customizeSettings']) await card(key).locator('[data-action="select-all"]').click();
    ok('blockers');

    // 件数が多い項目は畳み、開いたときに描画する
    await reset({ big: true, cfg: { targetPending: clean } });
    await setIds();
    await chip('アクション設定').check();
    await button('差分を抽出する').click();
    const t0 = Date.now();
    await idle();
    assert.match(await selectCount('actionSettings').innerText(), /^選んだ変更 3000\/3000$/);
    assert.equal(await card('actionSettings').locator('.kus-ds-row').count(), 0, '件数が多い項目は畳んでおく');
    assert.equal(await card('actionSettings').locator('[data-action="toggle"]').getAttribute('aria-expanded'), 'false');
    await card('actionSettings').locator('[data-action="toggle"]').click();
    const rendered = await card('actionSettings').locator('.kus-ds-row').count();
    assert.ok(rendered > 0 && rendered <= 120, `開いたときに先頭だけ描画する（${rendered} 行）`);
    assert.match(await button('さらに表示（残り 1460 グループ）').innerText(), /残り 1460 グループ/);
    await button('さらに表示（残り 1460 グループ）').click();
    assert.ok(await card('actionSettings').locator('.kus-ds-row').count() > rendered);
    // 数千件でも固まらない（全解除・全選択・グループの選択）
    const t1 = Date.now();
    await card('actionSettings').locator('[data-action="select-none"]').click();
    assert.match(await selectCount('actionSettings').innerText(), /^選んだ変更 0\/3000$/);
    await card('actionSettings').locator('[data-action="select-all"]').click();
    assert.match(await selectCount('actionSettings').innerText(), /^選んだ変更 3000\/3000$/);
    assert.ok(Date.now() - t1 < 15000, `全解除・全選択が長すぎる: ${Date.now() - t1}ms`);
    assert.ok(Date.now() - t0 < 60000, '3000 件の抽出から選択までが長すぎる');
    // 内容の修正の入力欄も畳んで描画する
    await toEdit();
    assert.equal(await editCard('actionSettings').locator('.kus-ds-edit').count(), 0, '入力欄の多い項目は畳んでおく');
    await editCard('actionSettings').locator('[data-action="toggle"]').click();
    const editRendered = await editCard('actionSettings').locator('.kus-ds-edit').count();
    assert.ok(editRendered > 0 && editRendered <= 60, `入力欄は先頭だけ描画する（${editRendered} 行）`);
    ok('3000 changes');

    // =======================================================================
    // 5. 内容の修正
    // =======================================================================
    await reset({ cfg: { targetPending: clean } });
    await extract(['JS/CSS設定']);
    await rowCheck('fieldSettings:/properties/name/unique').uncheck();
    await toEdit();
    assert.equal(await tab('内容を修正').getAttribute('aria-selected'), 'true');
    assert.deepEqual(await page.locator('[data-edit-section]').evaluateAll(list => list.map(el => el.dataset.editSection)), ['fieldSettings', 'layoutSettings', 'viewSettings', 'customizeSettings']);
    assert.equal(await editRow('fieldSettings', '/properties/name/unique').count(), 0, '選ばなかった変更の入力欄は出さない');
    assert.equal(await editRow('fieldSettings', '/properties/name/label').locator('input').inputValue(), '顧客名');
    assert.match(await editCount('fieldSettings').innerText(), /^選んだ変更 5\/6・修正した値 0$/);
    assert.match(await editCard('fieldSettings').locator('[data-edit-plan]').innerText(), /反映される内容[\s\S]*変更の要約/, '作り直した計画の変更の要約');
    // text
    const labelRow = editRow('fieldSettings', '/properties/name/label');
    await labelRow.locator('input').fill('お客様名');
    await page.waitForFunction(() => window.__src.composeCalls.at(-1).states.fieldSettings.overrides['/properties/name/label'] === 'お客様名');
    assert.equal(await labelRow.getAttribute('data-changed'), 'true', '既定との違いを強調する');
    assert.match(await labelRow.innerText(), /既定: 顧客名/);
    assert.match(await editCount('fieldSettings').innerText(), /修正した値 1$/);
    // boolean
    const requiredRow = editRow('fieldSettings', '/properties/name/required');
    assert.equal(await requiredRow.locator('input[type="checkbox"]').isChecked(), true);
    assert.equal(await requiredRow.locator('.kus-ds-edit__default').innerText(), '既定: はい', '真偽値の既定は「true / false」ではなく「はい / いいえ」で示す');
    await requiredRow.locator('input[type="checkbox"]').uncheck();
    assert.equal((await lastCompose()).states.fieldSettings.overrides['/properties/name/required'], false);
    assert.equal(await requiredRow.getAttribute('data-changed'), 'true');
    // select
    const rowSelect = editRow('customizeSettings', '/scope');
    assert.equal(await rowSelect.locator('.kus-ds-edit__default').innerText(), '既定: 管理者のみ', '選択肢の既定は選択肢の表示名で示す');
    await rowSelect.locator('select').selectOption('ALL');
    assert.equal((await lastCompose()).states.customizeSettings.overrides['/scope'], 'ALL');
    // whole の追加は要素の主な値を並べる
    assert.equal(await editRow('fieldSettings', '/properties/memo/label').locator('input').inputValue(), '備考');
    // 元に戻す
    await labelRow.getByRole('button', { name: /既定の値に戻す/ }).click();
    assert.equal(await labelRow.locator('input').inputValue(), '顧客名');
    assert.equal(await labelRow.getAttribute('data-changed'), 'false');
    assert.equal(Object.hasOwn((await lastCompose()).states.fieldSettings.overrides, '/properties/name/label'), false, '元に戻すと修正を送らない');
    assert.equal(await labelRow.getByRole('button', { name: /既定の値に戻す/ }).isHidden(), true);
    // 既定と同じ値に入力し直しても修正にしない
    await labelRow.locator('input').fill('別');
    await labelRow.locator('input').fill('顧客名');
    await page.waitForFunction(() => !('/properties/name/label' in window.__src.composeCalls.at(-1).states.fieldSettings.overrides));
    // 項目の修正をすべて戻す
    await editCard('fieldSettings').locator('[data-action="edit-reset-all"]').click();
    assert.equal(await requiredRow.locator('input[type="checkbox"]').isChecked(), true);
    assert.match(await editCount('fieldSettings').innerText(), /修正した値 0$/);
    ok('edit inputs');

    // JSON
    assert.equal(await editCard('customizeSettings').locator('[data-action="json-toggle"]').count(), 0, 'jsonEditable でない項目には JSON 編集を出さない');
    const jsonToggle = editCard('fieldSettings').locator('[data-action="json-toggle"]');
    await jsonToggle.click();
    const jsonText = editCard('fieldSettings').locator('textarea');
    const initialJson = JSON.parse(await jsonText.inputValue());
    assert.equal(initialJson.properties.name.label, '顧客名', '送る設定を整形して表示する');
    assert.match(await jsonText.inputValue(), /\n  "properties": \{/, '整形して表示');
    await jsonText.fill('{ "properties": ');
    await editCard('fieldSettings').locator('[data-action="json-apply"]').click();
    assert.match(await editCard('fieldSettings').locator('.kus-ds-json__error').innerText(), /^JSONの形式が正しくありません/);
    const composeCountBefore = (await src()).composeCalls.length;
    assert.equal((await src()).composeCalls.length, composeCountBefore, '誤った JSON は適用しない');
    await jsonText.fill('"文字列"');
    await editCard('fieldSettings').locator('[data-action="json-apply"]').click();
    assert.match(await editCard('fieldSettings').locator('.kus-ds-json__error').innerText(), /オブジェクトまたは配列/);
    await jsonText.fill('{"properties":{"name":{"label":"JSONで直した名前"}},"bad":true}');
    await editCard('fieldSettings').locator('[data-action="json-apply"]').click();
    assert.deepEqual((await lastCompose()).states.fieldSettings.json, { properties: { name: { label: 'JSONで直した名前' } }, bad: true }, 'JSON を状態に持つ');
    assert.equal(await editCard('fieldSettings').locator('[data-json-active]').isVisible(), true, 'JSON を優先する旨を表示');
    assert.match(await editCard('fieldSettings').locator('[data-json-active]').innerText(), /選択・入力欄より JSON の内容を優先します/);
    assert.equal(await editRow('fieldSettings', '/properties/name/label').locator('input').isDisabled(), true, 'JSON で直している間は入力欄を使えない');
    assert.match(await editCard('fieldSettings').locator('[data-edit-errors]').innerText(), /JSONに許可されない項目「bad」があります。/, '作り直しの errors を表示');
    assert.equal(await button('最終確認に進む').isDisabled(), true, 'errors があると進めない');
    assert.match(await dockText(), /次に進むには：フィールド設定: JSONに許可されない項目「bad」があります。/);
    assert.match(await page.locator('[data-edit-blockers]').innerText(), /JSONに許可されない項目/, '画面下にも示す');
    // 差分の選択の画面にも JSON で修正中を示す
    await tab('差分を選ぶ').click();
    assert.equal(await card('fieldSettings').locator('[data-json-active]').isVisible(), true);
    await tab('内容を修正').click();
    await editCard('fieldSettings').locator('[data-action="json-toggle"]').click();
    await editCard('fieldSettings').locator('textarea').fill('{"properties":{"name":{"label":"JSONで直した名前"}}}');
    await editCard('fieldSettings').locator('[data-action="json-apply"]').click();
    assert.equal(await editCard('fieldSettings').locator('[data-edit-errors]').isHidden(), true);
    assert.equal(await button('最終確認に進む').isEnabled(), true);
    assert.match(await editCount('fieldSettings').innerText(), /修正した値 1$/);
    // 取り消し
    await editCard('fieldSettings').locator('[data-action="json-cancel"]').click();
    assert.equal((await lastCompose()).states.fieldSettings.json, undefined, '取り消すと JSON を送らない');
    assert.equal(await editCard('fieldSettings').locator('[data-json-active]').isHidden(), true);
    assert.equal(await editRow('fieldSettings', '/properties/name/label').locator('input').isDisabled(), false);
    assert.match(await statusText(), /フィールド設定のJSONでの修正を取り消しました。選択と入力欄の内容に戻しました。/);
    // 適用していない JSON の変更があるうちは進めない（適用しないまま進むと、直した内容が送られない）。編集を閉じると捨てて進める
    await jsonToggle.click();
    await editCard('fieldSettings').locator('textarea').fill('{"properties":{"name":{"label":"未適用の変更"}}}');
    assert.equal(await button('最終確認に進む').isDisabled(), true, '適用していない JSON の変更があると進めない');
    assert.equal(await tab('最終確認').isDisabled(), true);
    assert.match(await dockText(), /次に進むには：フィールド設定のJSONの変更がまだ適用されていません。「JSONを適用」を押すか、「JSONの編集を閉じる」で取り消してください。/);
    await jsonToggle.click();
    assert.equal(await button('最終確認に進む').isEnabled(), true, '編集を閉じると、適用していない変更は捨てて進める');
    ok('edit json');

    // 修正しない場合はそのまま次へ進める
    await reset({ cfg: { targetPending: clean } });
    await extract();
    await toEdit();
    await toConfirm();
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
    ok('edit skipped');

    // =======================================================================
    // 6. 最終確認
    // =======================================================================
    await reset({ cfg: { targetPending: pending } });
    await extract();
    await rowCheck('fieldSettings:/properties/old').uncheck();
    await toEdit();
    await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名');
    await toConfirm();
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
    assert.match(await fact('route').innerText(), /営業テンプレート（開発）（#10・本番設定） → 営業管理（#20）のプレビュー → 営業管理（#20）の本番/, '経路');
    assert.match(await fact('goal').innerText(), /本番まで反映/);
    const sectionsText = await fact('sections').innerText();
    assert.match(sectionsText, /反映する項目（3 項目）/);
    assert.match(sectionsText, /フィールド設定[\s\S]*選んだ変更 5\/6[\s\S]*修正した値 1/);
    assert.match(sectionsText, /レイアウト設定[\s\S]*選んだ変更 1\/1[\s\S]*修正した値 0/);
    assert.match(await page.locator('[data-confirm-section="fieldSettings"]').innerText(), /変更 3・追加 2/, '変更の要約（種類ごとの数）');
    await page.locator('[data-confirm-section="fieldSettings"] summary').click();
    await page.waitForFunction(() => document.querySelector('[data-confirm-section="fieldSettings"] [data-reflect-items]'));
    assert.match(await page.locator('[data-confirm-section="fieldSettings"]').innerText(), /変更の要約[\s\S]*顧客名（name） \/ 表示名/);
    assert.match(await fact('removed').innerText(), /削除される設定はありません。/);
    assert.match(await fact('pending').innerText(), /反映先に以前からの未公開の変更があります[\s\S]*一緒に本番へ反映されます/, '未公開の変更は一緒に本番へ反映される旨');
    const backupItems = await fact('backup').locator('li').allInnerTexts();
    assert.equal(backupItems.length, 2, 'バックアップは反映前のプレビューと本番へ反映する前の本番の 2 つ');
    assert.match(backupItems[0], /反映前の反映先プレビューの設定/);
    assert.match(backupItems[1], /本番へ反映する前の本番設定/);
    assert.match(await fact('undo').innerText(), /^取り消し方\n?本番への反映は取り消せません。戻すときは、結果画面の「バックアップから戻す」で、反映前のバックアップとの差分を確認してから、本番へ反映します。削除したフィールドの値は戻りません。$/);
    assert.equal(await runButton().innerText(), '確認した内容を反映先へ書き込み、本番へ反映');
    assert.equal(await runButton().isDisabled(), true);
    assert.match(await page.locator('.kus-dp-confirm-label').innerText(), /^反映先アプリID（20 と入力）$/);
    // 了承と ID がそろうまで実行できない
    await ackBox().check();
    await idBox().fill('20');
    assert.equal(await runButton().isDisabled(), true, '未公開の変更の了承が必要');
    assert.match(await page.locator('.kus-dp-confirm-input ~ .kus-dp-quiet, .kus-dp-quiet[aria-live]').last().innerText(), /未公開の変更の了承が必要です。/);
    await pendingBox().check();
    assert.equal(await runButton().isEnabled(), true);
    await idBox().fill('21');
    assert.equal(await runButton().isDisabled(), true, 'ID が違うと実行できない');
    assert.match(await page.locator('.kus-dp-quiet[aria-live]').last().innerText(), /反映先アプリIDの入力が必要です。/);
    // Enter では実行しない
    await idBox().fill('20');
    await idBox().press('Enter');
    await page.waitForTimeout(150);
    assert.equal((await src()).runs.length, 0, '入力中の Enter では実行しない');
    assert.equal(await tab('最終確認').getAttribute('aria-selected'), 'true');
    ok('confirm stage');

    // 段階 1〜3 のどこかを変えたら確認は解除
    for (const [name, change] of [
      ['目標', async () => { await tab('対象を選ぶ').click(); await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).check(); await page.getByRole('radio', { name: '本番まで反映', exact: true }).check(); }],
      ['差分の選択', async () => { await tab('差分を選ぶ').click(); await rowCheck('viewSettings:/views/全件/sort').uncheck(); await rowCheck('viewSettings:/views/全件/sort').check(); }],
      ['入力欄の修正', async () => { await tab('内容を修正').click(); await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名2'); await page.waitForTimeout(300); }]
    ]) {
      assert.equal(await tab('最終確認').isEnabled(), true, `${name}の前: 最終確認へ移れる`);
      await change();
      await page.waitForFunction(() => document.querySelector('#kus-ds-tab-edit') !== null);
      await tab('内容を修正').click();
      await toConfirm();
      assert.equal(await ackBox().isChecked(), false, `${name}を変えたら確認のチェックを解除する`);
      assert.equal(await idBox().inputValue(), '', `${name}を変えたら入力を解除する`);
      assert.equal(await runButton().isDisabled(), true);
      await ackBox().check(); await idBox().fill('20'); await pendingBox().check();
    }
    // 確認画面のまま入力を変えた（段階 1）場合は、最終確認に戻れない
    await tab('対象を選ぶ').click();
    await page.getByLabel('反映先アプリID', { exact: true }).fill('30');
    assert.equal(await tab('最終確認').isDisabled(), true);
    await page.getByLabel('反映先アプリID', { exact: true }).fill('20');
    ok('confirm reset');

    // 目標がプレビューまで
    await reset({ cfg: { targetPending: pending } });
    await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).check();
    await extract();
    await toEdit(); await toConfirm();
    assert.match(await fact('route').innerText(), /営業管理（#20）のプレビュー（本番へは反映しません）$/);
    assert.equal(await runButton().innerText(), '確認した内容を反映先プレビューへ反映');
    assert.equal((await fact('backup').locator('li').allInnerTexts()).length, 1, 'プレビューまでのときはバックアップは 1 つ');
    assert.match(await fact('undo').innerText(), /変更を中止/);
    assert.equal(await pendingBox().count(), 0, 'プレビューまでのときは未公開の変更の了承は不要');
    await ackBox().check(); await idBox().fill('20');
    assert.equal(await runButton().isEnabled(), true);
    ok('confirm preview goal');

    // 削除される設定
    await reset({ cfg: { targetPending: clean } });
    await extract();
    await toEdit(); await toConfirm();
    assert.match(await fact('removed').innerText(), /1 件の設定が削除されます。[\s\S]*旧項目（old）[\s\S]*削除されるフィールド（1 件）は、本番へ反映すると、レコードの値も削除され、元に戻せません。/);
    assert.ok(await fact('removed').evaluate(el => getComputedStyle(el.querySelector('dd')).color !== getComputedStyle(document.body).color), '削除は警告色');
    assert.equal(await pendingBox().count(), 0, '以前からの未公開の変更が無ければ了承は不要');
    assert.match(await fact('pending').innerText(), /未公開の変更なし/);
    ok('confirm removals');

    // 未公開の変更を確認できなかった（unknown・未指定）ときも、了承が必要
    for (const [name, value, expectState] of [['unknown', { state: 'unknown', productionRevision: '', previewRevision: '', sectionKeys: [], message: '反映先プレビューに未公開の変更があるか確認できませんでした（反映先プレビューのフィールド設定を取得できません）。' }, 'unknown'], ['未指定', null, undefined]]) {
      await reset({ cfg: { targetPending: value } });
      await extract();
      await toEdit(); await toConfirm();
      assert.match(await fact('pending').innerText(), /反映先に以前からの未公開の変更があるか確認できませんでした。本番へ反映すると、プレビューの内容がすべて本番へ反映されます。/, `${name}: 確認できなかった旨を示す`);
      assert.equal(await pendingBox().count(), 1, `${name}: 了承のチェックを出す`);
      await ackBox().check(); await idBox().fill('20');
      assert.equal(await runButton().isDisabled(), true, `${name}: 了承がないと実行できない`);
      await pendingBox().check();
      assert.equal(await runButton().isEnabled(), true);
      await runButton().click(); await idle();
      const unknownRun = (await src()).runs[0];
      assert.equal(unknownRun.allowPendingChanges, true, `${name}: 了承は allowPendingChanges に渡る`);
      assert.equal(unknownRun.targetPending?.state, expectState);
    }
    ok('confirm unknown pending');

    // =======================================================================
    // 7. 実行・結果
    // =======================================================================
    await reset({ cfg: { targetPending: pending } });
    await extract();
    await rowCheck('fieldSettings:/properties/old').uncheck();
    await card('layoutSettings').locator('[data-action="select-none"]').click();
    await toEdit();
    await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名');
    await toConfirm();
    await ackBox().check(); await idBox().fill('20'); await pendingBox().check();
    await runButton().click();
    await idle();
    const run = (await src()).runs[0];
    assert.equal(run.goal, 'production');
    assert.equal(run.allowPendingChanges, true, 'allowPendingChanges に了承が渡る');
    assert.deepEqual(run.reflect.scopes, ['fieldSettings', 'viewSettings'], '選んだ変更がある項目だけを書き込む');
    assert.deepEqual(Object.keys(run.composed).sort(), ['fieldSettings', 'viewSettings'], '送る設定は書き込む項目すべてに渡す');
    assert.equal(run.composed.fieldSettings.properties.name.label, 'お客様名', '修正した値を含む composed');
    assert.ok(run.composed.fieldSettings.properties.old, '選ばなかった削除は送る設定に残る');
    assert.deepEqual(run.reviewBaseline, { token: 'baseline-1' }, '差分の抽出時の baseline を渡す');
    assert.equal(run.targetPending.state, 'pending');
    assert.equal(run.reflect.targetAppId, '20');
    assert.equal(run.reflect.preserveTargetOnly, true);
    assert.equal((await src()).runs.length, 1, '実行は 1 回だけ');
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true');
    assert.match(await statusText(), /^2 項目を反映先プレビューへ反映し、1 アプリを本番へ反映しました。$/, '完了メッセージは結果の動詞で終える');
    assert.deepEqual(await page.locator('[data-progress-section]').evaluateAll(list => list.map(el => el.dataset.progressSection)), ['fieldSettings', 'viewSettings'], '書き込みの進捗は項目ごと');
    assert.match(await page.locator('[data-progress-section="fieldSettings"]').innerText(), /成功/);
    assert.match(await page.locator('.kus-dp-result-item[data-deploy-app="20"]').innerText(), /成功[\s\S]*営業管理[\s\S]*本番の設定の更新番号: 12 → 16[\s\S]*本番とプレビューが一致/, '本番への反映の状態は本番反映と同じ表示');
    assert.match(await page.locator('[data-backup-preview]').innerText(), /バックアップ（反映前のプレビュー）: 保存しました/);
    assert.match(await page.locator('[data-backup-production]').innerText(), /バックアップ（本番へ反映する前の本番）: 本番反映前バックアップ_営業管理\(app20\)/);
    assert.match(await page.locator('#kus-ds-stage-result').innerText(), /本番への反映は取り消せません/);
    assert.equal(await tab('差分を選ぶ').isDisabled(), true, '実行後は実行前の抽出結果を使えない');
    // 保存・コピー
    await page.evaluate(() => { window.__copied = []; document.execCommand = () => false; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied.push(text); } } }); });
    const json = await downloadOf('結果JSONを保存');
    assert.match(json.name, /^反映元から本番反映結果_営業管理\(app20\)_\d{8}_\d{6}\.json$/);
    const parsed = JSON.parse(json.text);
    assert.equal(parsed.kind, 'kintone-source-deploy-result');
    assert.equal(parsed.apply.summary.ok, 2);
    assert.equal(parsed.deploy.apps[0].status, 'success');
    assert.deepEqual(parsed.selection.map(item => [item.sectionKey, item.selectedCount, item.totalCount, item.editedCount]), [['fieldSettings', 5, 6, 1], ['viewSettings', 2, 2, 0]]);
    assert.doesNotMatch(json.text, /BUNDLE-BODY/, 'バックアップ本体は含めない');
    const md = await downloadOf('記録をMarkdownで保存');
    assert.match(md.name, /^反映元から本番反映記録_営業管理\(app20\)_/);
    assert.match(md.text, /^# 反映元アプリから本番への反映の記録/);
    assert.match(md.text, /本番へ一緒に反映されることを了承して実行/);
    assert.match(md.text, /\| フィールド設定 \| 5\/6 \| 1 \| 成功 \|/);
    await button('記録をコピー').click();
    await page.waitForFunction(() => window.__copied.length === 1);
    assert.equal(await page.evaluate(() => window.__copied[0].startsWith('# 反映元アプリから本番への反映の記録')), true);
    await button('反映先アプリの設定画面を開く').click();
    assert.match(await page.evaluate(() => window.__src.opened[0]), /\/k\/admin\/app\/flow\?app=20$/);
    await page.screenshot({ path: path.join(out, 'source-result-1440.png') });
    ok('run success');

    // 開き直すと、直近の結果を残す
    await page.evaluate(() => DeployHarness.mountDeployLitePanel());
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true');
    assert.equal(await flowRadio('反映元アプリから本番へ').isChecked(), true);
    assert.equal(await button('結果JSONを保存').isEnabled(), true);
    ok('remount keeps result');

    // 目標がプレビューまで
    await reset({ cfg: { targetPending: clean } });
    await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).check();
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    const previewRun = (await src()).runs[0];
    assert.equal(previewRun.goal, 'preview');
    assert.equal(previewRun.allowPendingChanges, false);
    assert.match(await statusText(), /^3 項目を反映先プレビューへ反映しました。本番へは反映していません。$/);
    assert.equal(await page.locator('[data-deploy-skipped]').count(), 0, 'プレビューまでのときは本番の欄を出さない');
    assert.equal(await page.getByText('本番への反映', { exact: true }).isVisible(), false, 'プレビューまでのときは本番の欄を隠す');
    ok('run preview goal');

    // 本番へ反映しなかった（deploySkipped）
    await reset({ cfg: { targetPending: clean, run: { deploySkip: '本番の revision が確認後に変わったため、本番へは反映しませんでした（確認した内容と食い違うため）。' } } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    assert.match(await statusText(), /^3 項目を反映先プレビューへ反映しましたが、本番へは反映していません。本番の revision が確認後に変わったため/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn', 'deploySkipped は警告で示す');
    assert.match(await page.locator('[data-deploy-skipped-note]').innerText(), /本番へは反映していません[\s\S]*確認した内容と食い違うため[\s\S]*反映先プレビューには書き込み済みです。理由を解消したあと、パネル上部の「プレビューの変更を公開」から続けて本番へ反映できます。/);
    assert.match(await page.locator('[data-deploy-skipped]').innerText(), /本番へは反映していません/);
    const skippedMd = await downloadOf('記録をMarkdownで保存');
    assert.match(skippedMd.text, /- 本番へは反映していません。本番の revision が確認後に変わった/);
    ok('deploy skipped');

    // 了承なしでは本番へ反映しない（エンジンの判定）はエンジン側。画面は了承なしでは実行を許さない。
    // 書き込みの失敗
    await reset({ cfg: { targetPending: clean, run: { plan: { viewSettings: 'ng' } } } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn');
    assert.match(await statusText(), /^3 項目中 2 項目を反映先プレビューへ反映しました。失敗 1 項目（ビュー設定: 権限がありません（CB_NO02））。本番へは反映していません。$/);
    assert.match(await page.locator('[data-progress-section="viewSettings"]').innerText(), /失敗[\s\S]*権限がありません/);
    assert.doesNotMatch(await page.locator('[data-progress-section="viewSettings"]').innerText(), /\[API\]/, '内部の通信情報は出さない');
    assert.match(await page.locator('[data-deploy-skipped]').innerText(), /書き込みに失敗した項目があるため/);
    ok('apply failure');

    // 本番への反映の失敗
    await reset({ cfg: { targetPending: clean, run: { deployFails: true } } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    assert.match(await statusText(), /^3 項目を反映先プレビューへ反映し、1 アプリ中、反映できたアプリはありません。/);
    assert.match(await page.locator('.kus-dp-result-item[data-deploy-app="20"]').innerText(), /失敗[\s\S]*権限がありません（GAIA_NO01）/);
    ok('deploy failure');

    // revision の不一致
    await reset({ cfg: { targetPending: clean, run: { unverified: true } } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    assert.equal(await page.locator('[data-deploy-unverified]').count(), 1);
    ok('unverified');

    // 二重実行の防止と実行中の表示・中止
    await reset({ cfg: { targetPending: clean, stepMode: true } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click();
    await page.waitForFunction(() => window.__src.waiting);
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true');
    assert.match(await page.locator('.kus-ds-result-head').innerText(), /実行中です。/);
    assert.equal(await page.locator('[data-progress-section="fieldSettings"]').innerText().then(t => /実行中/.test(t)), true, '進捗は項目ごとに実行中を示す');
    assert.equal(await flowRadio('プレビューの変更を公開').isDisabled(), true, '実行中は操作を切り替えられない');
    assert.equal(await runButton().isHidden() || await runButton().isDisabled(), true, '実行中は実行ボタンを押せない');
    await page.evaluate(() => { const r = document.querySelector('#kus-ds-stage-confirm button'); void r; });
    assert.equal((await src()).runs.length, 1, '二重に実行しない');
    const advance = async () => { await page.waitForFunction(() => window.__src.waiting); await page.evaluate(() => { const w = window.__src.waiting; window.__src.waiting = null; w(); }); await page.waitForTimeout(30); };
    await advance(); // フィールド設定 → 成功
    await page.getByRole('button', { name: '処理を中止', exact: true }).click();
    await advance(); // レイアウト設定: 中止を受けて未実行
    await idle();
    await page.evaluate(() => { window.__src.stepMode = false; });
    assert.match(await statusText(), /^中止しました（1\/3 項目を反映先プレビューへ反映、残り 2 項目は未実行）。書き込み済みの分は反映先プレビューに残っています。本番へは反映していません。$/);
    assert.match(await page.locator('[data-progress-section="viewSettings"]').innerText(), /未実行/);
    assert.equal(await flowRadio('プレビューの変更を公開').isEnabled(), true, '終われば切り替えられる');
    ok('busy and cancel');

    // 書き込み前の検査で停止（エンジンが例外を投げる）
    await reset({ cfg: { targetPending: clean, run: { throwsBefore: '反映前の検査で停止しました。まだ書き込んでいません。\n反映先のプレビューが確認後に更新されています。' } } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    assert.match(await statusText(), /^エラー: 反映前の検査で停止しました。まだ書き込んでいません。/);
    assert.equal(await tab('内容を修正').getAttribute('aria-selected'), 'true', '書き込み前に止まったときは修正の画面へ戻る');
    assert.equal(await ackBox().count() ? await ackBox().isChecked() : false, false, '確認は解除される');
    assert.equal(await tab('差分を選ぶ').isEnabled(), true, '抽出結果は残す（見直せる）');
    // 抽出結果は古いものとして扱う: 段階 2〜4 の主ボタンは使えず、「差分を抽出し直す」へ案内する
    assert.equal(await button('最終確認に進む').isDisabled(), true, '最終確認に進めない');
    assert.equal(await tab('最終確認').isDisabled(), true);
    assert.match(await dockText(), /次に進むには：反映先が更新されたため、抽出結果は古くなりました。「差分を抽出し直す」を押してください。/);
    assert.match(await page.locator('[data-stale-extraction="edit"]').innerText(), /抽出結果が古くなりました[\s\S]*まだ何も書き込んでいません（反映前の検査で停止しました。まだ書き込んでいません）。「差分を抽出し直す」を押してください。/);
    await tab('差分を選ぶ').click();
    assert.equal(await button('内容の修正へ').isDisabled(), true, '内容の修正へ進めない');
    assert.equal(await page.locator('[data-stale-extraction="select"]').isVisible(), true);
    assert.equal(await button('差分を抽出し直す').isEnabled(), true);
    await button('差分を抽出し直す').click(); await idle();
    assert.equal(await page.locator('[data-stale-extraction="select"]').isHidden(), true, '抽出し直すと案内は消える');
    assert.equal(await button('内容の修正へ').isEnabled(), true, '抽出し直すと先へ進める');
    assert.equal(await page.locator('[data-carry-over]').innerText(), '前回の選択 9 件を引き継ぎました。', '選択を引き継いだ件数');
    assert.equal((await src()).previewCalls.length, 2, '抽出し直した');
    ok('stopped before writing');

    // バックアップから戻す（結果画面のボタン。合成エンジンへ渡る内容を確かめる）
    await reset({ cfg: { targetPending: clean } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[data-source-restore]').isVisible(), true, '結果画面に「バックアップから戻す」');
    for (const width of [320, 800, 1440]) { await page.setViewportSize({ width, height: 900 }); await overflowOf(`${width}px 結果（バックアップから戻す）`); }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const resultJson = await downloadOf('結果JSONを保存');
    assert.doesNotMatch(resultJson.text, /CONTENT-BODY|BUNDLE-BODY|"bundles"/, '結果JSONにバックアップの本体は含めない');
    assert.match(resultJson.text, /本番反映前バックアップ_営業管理\(app20\)/);
    await page.locator('[data-source-restore]').click();
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('select[data-source-kind]').inputValue(), 'json');
    assert.equal(await page.getByLabel('反映先アプリID', { exact: true }).inputValue(), '20');
    assert.match(await page.locator('.kus-dp-detail-summary').innerText(), /^詳細設定: 反映先だけの一覧・グラフ・アクションを削除 \/ 参照先変換なし$/);
    assert.equal(await page.getByRole('radio', { name: '本番まで反映', exact: true }).isChecked(), true);
    assert.deepEqual(await page.locator('.kus-ds-scope-group input:checked').evaluateAll(list => list.map(el => el.getAttribute('aria-label'))), ['フィールド設定', 'レイアウト設定', 'ビュー設定', 'JS/CSS設定'], 'バックアップにある反映可能な項目');
    assert.match(await page.locator('[data-restore-notice="setup"]').innerText(), /バックアップから戻しています\n反映前のバックアップ（App 20・[^）]*）を反映元にしています。フィールドの削除は行わないため、反映で追加したフィールドは残ります。削除したフィールドの値は戻りません。/);
    assert.match(await page.locator('.kus-dp-dock-copy strong').innerText(), /^反映元 バックアップ → 反映先 #20 · 本番まで反映$/);
    assert.equal((await src()).previewCalls.length, 1, '戻す設定にしただけでは差分を取得しない');
    for (const width of [320, 800, 1440]) { await page.setViewportSize({ width, height: 900 }); await overflowOf(`${width}px バックアップから戻す（段階 1）`); }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await button('差分を抽出する').click(); await idle();
    assert.deepEqual((await src()).previewCalls.at(-1), { sourceAppId: '20', sourceGuestId: '', sourcePreview: false, hasBundle: true, targetAppId: '20', targetGuestId: '', scopes: ['fieldSettings', 'layoutSettings', 'viewSettings', 'customizeSettings'], lookupMap: {}, preserveTargetOnly: false }, '反映元はバックアップの設定、保持OFF、参照先変換なし');
    await toEdit(); await toConfirm();
    assert.match(await fact('route').innerText(), /反映前のバックアップ（営業管理・[^）]*） → 営業管理（#20）のプレビュー → 営業管理（#20）の本番/);
    assert.equal(await page.locator('[data-restore-notice="confirm"]').isVisible(), true);
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    const restoreRun = (await src()).runs.at(-1);
    assert.equal(restoreRun.goal, 'production');
    assert.equal(restoreRun.reflect.preserveTargetOnly, false);
    assert.deepEqual(restoreRun.reflect.lookupMap, {});
    // 記録には、反映元がバックアップだと残る
    const record = await downloadOf('記録をMarkdownで保存');
    assert.match(record.text, /反映前のバックアップ（営業管理・/);
    ok('restore from backup (result button)');

    // プレビューまでの反映結果から戻すときは、反映前のプレビューのバックアップ・目標はプレビューまで
    await reset({ cfg: { targetPending: clean } });
    await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).check();
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    await page.locator('[data-source-restore]').click();
    assert.equal(await page.getByRole('radio', { name: 'プレビューまで（本番へは反映しない）', exact: true }).isChecked(), true, '目標はプレビューまで');
    assert.match(await page.locator('.kus-dp-dock-copy strong').innerText(), /· プレビューまで$/);
    ok('restore from preview backup keeps the preview goal');

    // バックアップに戻すアプリの設定が無いときは、理由を示して設定を変えない
    await reset({ cfg: { targetPending: clean, run: { backupApp: '999' } } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    await page.locator('[data-source-restore]').click();
    assert.match(await statusText(), /^バックアップに App 20 の設定がありません。$/);
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true', '設定を変えず、結果画面のまま');
    assert.equal(await page.locator('[data-restore-notice="setup"]').isHidden(), true);
    ok('restore failure keeps the screen');

    // 書き込みの途中で想定外の例外
    await reset({ cfg: { targetPending: clean, run: { throwsAfter: 'ネットワークに接続できません' } } });
    await extract();
    await toEdit(); await toConfirm();
    await ackBox().check(); await idBox().fill('20');
    await runButton().click(); await idle();
    assert.match(await statusText(), /^エラー: 実行中にエラーが発生しました。反映先と本番の状態をアプリの設定画面で確認してください。/);
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true');
    assert.equal(await button('結果JSONを保存').isEnabled(), true, '例外でも結果を保存できる');
    assert.match(await page.locator('[data-deploy-skipped]').innerText(), /実行中にエラーが発生したため/);
    ok('engine exception');

    // =======================================================================
    // 8. 従来の流れが切り替え後も動く
    // =======================================================================
    await flowRadio('プレビューの変更を公開').check();
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');
    assert.equal(await button('未公開の変更を確認する').isVisible(), true);
    await flowRadio('反映元アプリから本番へ').check();
    assert.equal(await tab('結果').getAttribute('aria-selected'), 'true', '戻ると、直近の結果が残っている');
    ok('legacy flow survives');

    // =======================================================================
    // 9. 画面幅
    // =======================================================================
    const sizes = [[320, 700], [390, 844], [768, 900], [1024, 900], [1440, 1000]];
    await reset({ cfg: { targetPending: pending } });
    await extract(['JS/CSS設定', 'グラフ設定']);
    await tab('対象を選ぶ').click();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 対象を選ぶ`);
      await page.screenshot({ path: path.join(out, `source-setup-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await tab('差分を選ぶ').click();
    await card('reportSettings').locator('[data-action="drop-scope"]').click();
    await rowCheck('fieldSettings:/properties/memo').uncheck();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 差分を選ぶ`);
      await page.screenshot({ path: path.join(out, `source-select-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await rowCheck('fieldSettings:/properties/memo').check();
    await toEdit();
    await editRow('fieldSettings', '/properties/name/label').locator('input').fill('お客様名');
    await editCard('fieldSettings').locator('[data-action="json-toggle"]').click();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 内容を修正`);
      await page.screenshot({ path: path.join(out, `source-edit-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await editCard('fieldSettings').locator('[data-action="json-cancel"]').click();
    await toConfirm();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 最終確認`);
      await page.screenshot({ path: path.join(out, `source-confirm-${width}.png`) });
      const hit = await runButton().evaluate(e => { const r = e.getBoundingClientRect(); return r.height < 120 && r.width > 0; });
      assert.equal(hit, true, `${width}pxで実行ボタンが縦長にならない`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ackBox().check(); await idBox().fill('20'); await pendingBox().check();
    await runButton().click(); await idle();
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await overflowOf(`${width}px 結果`);
      await page.screenshot({ path: path.join(out, `source-result-${width}.png`) });
    }
    await page.setViewportSize({ width: 800, height: 520 });
    await overflowOf('800x520 結果');
    await page.setViewportSize({ width: 1440, height: 1000 });
    ok('source widths 320-1440');

    // キーボード
    await reset({ cfg: { targetPending: clean } });
    await extract();
    await tab('差分を選ぶ').focus();
    await page.keyboard.press('Home');
    assert.equal(await tab('対象を選ぶ').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await tab('差分を選ぶ').getAttribute('aria-selected'), 'true');
    ok('source keyboard');

    return checks;
  }
};
