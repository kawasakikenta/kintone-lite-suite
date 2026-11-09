import { describe, expect, it } from 'vitest';
import { defaultSelectionState } from '../../src/reflect/selection';
import type { CustomizeFileResolution } from '../../src/reflect/customizeFiles';
import { byPointer, compose, copy, prepare } from './selection-helpers';

const listView = (fields: string[], extra: Record<string, any> = {}) => ({ type: 'LIST', fields, filterCond: '', sort: 'レコード番号 desc', ...extra });

describe('差分の選択: 一覧（ビュー）', () => {
  const source = { views: {
    A: { ...listView(['name']), filterCond: 'x = 1', index: '0' },
    N: { ...listView(['name', 'added']), index: '1' }
  } };
  const target = { views: {
    A: { ...listView(['name']), filterCond: 'x = 0', index: '0' },
    D: { ...listView(['name']), index: '1' }
  } };

  it('一覧の絞り込みだけを選べ、追加の一覧を選ばないと表示順を振り直し、参照フィールドも減る', () => {
    const ctx = prepare('viewSettings', source, target, { fieldLabels: { name: '顧客名' } });
    expect(ctx.model.changes.map(change => change.pointer)).toEqual(['/views/A/filterCond', '/views/N']);
    const filter = byPointer(ctx.model, '/views/A/filterCond');
    expect(filter).toMatchObject({ groupLabel: 'A', kind: '変更', beforeText: 'x = 0', afterText: 'x = 1' });
    expect(filter.labelPath).toEqual(['A', '絞り込み条件']);
    expect(filter.editables).toEqual([{ pointer: '/views/A/filterCond', label: '絞り込み条件', value: 'x = 1', editor: { type: 'text' } }]);
    const added = byPointer(ctx.model, '/views/N');
    expect(added).toMatchObject({ kind: '追加', whole: true, groupLabel: 'N', afterText: '表形式' });
    expect(added.editables.map(editable => editable.label)).toEqual(['絞り込み条件', '並び順']);

    const onlyFilter = compose(ctx, { selected: [filter.id] });
    expect(onlyFilter.errors).toEqual([]);
    expect(onlyFilter.after.views.A.filterCond).toBe('x = 1');
    expect(onlyFilter.after.views.N).toBeUndefined();
    expect(onlyFilter.after.views.A.index).toBe('0');
    expect(onlyFilter.after.views.D.index).toBe('1');
    expect(onlyFilter.plan.requiredFields).toEqual(['name']);
    expect(onlyFilter.plan.operations).toHaveLength(1);
    expect(onlyFilter.plan.operations[0]).toMatchObject({ method: 'PUT', endpoint: '/app/views.json' });

    const withAdded = compose(ctx, { selected: [filter.id, added.id] });
    expect(withAdded.plan.requiredFields).toEqual(['name', 'added']);
    expect(['A', 'N', 'D'].map(name => withAdded.after.views[name].index)).toEqual(['0', '1', '2']);
    // 追加の一覧だけを選んでも、表示順は重ならない
    const onlyAdded = compose(ctx, { selected: [added.id] });
    expect(onlyAdded.after.views.A.filterCond).toBe('x = 0');
    expect(['A', 'N', 'D'].map(name => onlyAdded.after.views[name].index)).toEqual(['0', '1', '2']);
  });

  it('JSON で、反映元とも反映先とも違う値に直した変更も「選んだ変更」と数える（0 件にすると、その項目が書き込まれない）', () => {
    const ctx = prepare('viewSettings', source, target);
    const filter = byPointer(ctx.model, '/views/A/filterCond');
    // 反映先のままの設定（選んだ変更なし）を土台に、絞り込み条件だけを反映元とも反映先とも違う値に直す
    const json = copy(ctx.model.before);
    json.views.A.filterCond = 'JSONで直した条件';
    const edited = compose(ctx, { json });
    expect(edited.errors).toEqual([]);
    expect(edited.selectedCount).toBe(1);
    expect(edited.editedCount).toBe(1);
    expect(edited.plan.operations).toHaveLength(1);
    expect(edited.plan.operations[0].body.views.A.filterCond).toBe('JSONで直した条件');
    // 反映元の値のままでも選んだ変更 1 件（JSON で直した項目は、修正した値を最低 1 と数える）
    const asSource = copy(ctx.model.before);
    asSource.views.A.filterCond = filter.after;
    expect(compose(ctx, { json: asSource })).toMatchObject({ selectedCount: 1, editedCount: 1 });
    // JSON が反映先のままなら、選んだ変更は 0 件で書き込みもない
    const unchanged = compose(ctx, { json: copy(ctx.model.before) });
    expect(unchanged.selectedCount).toBe(0);
    expect(unchanged.plan.operations).toEqual([]);
    // 変更の一覧にない場所を直したときも、書き込みがあれば選んだ変更として数える
    const other = copy(ctx.model.before);
    other.views.D.sort = 'JSONで直した並び順';
    const otherEdit = compose(ctx, { json: other });
    expect(otherEdit.plan.operations).toHaveLength(1);
    expect(otherEdit.selectedCount).toBeGreaterThan(0);
  });

  it('既定（全選択）の compose は既定の計画と同じ operations・requiredFields になる', () => {
    const ctx = prepare('viewSettings', source, target);
    const composed = compose(ctx, defaultSelectionState(ctx.model));
    expect(composed.plan.operations).toEqual(ctx.plan.operations);
    expect(composed.plan.requiredFields).toEqual(ctx.plan.requiredFields);
    expect(composed.plan.changes).toEqual(ctx.plan.changes);
    expect(composed.plan.items).toEqual(ctx.plan.items);
  });

  it('並び順だけの違いは 1 つの変更として選べる', () => {
    const a = { ...listView(['name']), index: '0' }, b = { ...listView(['name']), index: '1' };
    const reordered = prepare('viewSettings', { views: { B: { ...b, index: '0' }, A: { ...a, index: '1' } } }, { views: { A: a, B: b } });
    expect(reordered.model.changes).toHaveLength(1);
    const order = reordered.model.changes[0];
    expect(order).toMatchObject({ id: 'viewSettings:/views#order', kind: '変更', beforeText: 'A → B', afterText: 'B → A', editables: [] });
    expect(order.labelPath).toEqual(['一覧', '並び順']);
    const selected = compose(reordered, { selected: [order.id] });
    expect([selected.after.views.B.index, selected.after.views.A.index]).toEqual(['0', '1']);
    expect(selected.plan.operations).toHaveLength(1);
    const unselected = compose(reordered, { selected: [] });
    expect(unselected.plan.operations).toEqual([]);
    expect(unselected.after).toEqual(reordered.model.before);
  });

  it('JSON で直した一覧の設定が優先され、名前が増えたときだけ表示順を振り直す', () => {
    const ctx = prepare('viewSettings', source, target);
    const json = copy(ctx.model.after);
    json.views.A.filterCond = 'JSONで修正';
    json.views.Z = { ...listView(['name']), index: '0' };
    json.views.A.index = '5';
    json.views.N.index = '5';
    const composed = compose(ctx, { json });
    expect(composed.errors).toEqual([]);
    expect(composed.after.views.A.filterCond).toBe('JSONで修正');
    const indexes = Object.values<any>(composed.after.views).map(view => view.index);
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(indexes.slice().sort()).toEqual(['0', '1', '2', '3']);
    // 形の誤りは errors
    const broken = copy(ctx.model.after);
    broken.views.A.type = 'UNKNOWN';
    expect(compose(ctx, { json: broken }).errors.join('\n')).toContain('一覧の種類');
  });
});

describe('差分の選択: 一般設定', () => {
  const source = {
    theme: 'RED', titleField: { selectionMode: 'MANUAL', code: 'name' }, enableComments: true, enableThumbnails: true,
    numberPrecision: { digits: '10', decimalPlaces: '2', roundingMode: 'UP' }, firstMonthOfFiscalYear: '4'
  };
  const target = {
    theme: 'WHITE', titleField: { selectionMode: 'AUTO' }, enableComments: false, enableThumbnails: true,
    numberPrecision: { digits: '12', decimalPlaces: '2', roundingMode: 'HALF_EVEN' }, firstMonthOfFiscalYear: '1'
  };

  it('一般設定の各値と numberPrecision の一部を選べ、入力欄の種類と日本語の値を付ける', () => {
    const ctx = prepare('appSettings', source, target, { fieldLabels: { name: '顧客名' } });
    expect(ctx.model.changes.map(change => change.pointer)).toEqual([
      '/theme', '/titleField', '/enableComments', '/numberPrecision/digits', '/numberPrecision/roundingMode', '/firstMonthOfFiscalYear'
    ]);
    const theme = byPointer(ctx.model, '/theme');
    expect(theme).toMatchObject({ groupLabel: 'テーマ', beforeText: 'ホワイト', afterText: 'レッド' });
    expect(theme.labelPath).toEqual(['テーマ']);
    expect(theme.editables[0].editor.type).toBe('select');
    expect(theme.editables[0].editor.options).toContainEqual(['RED', 'レッド']);
    expect(byPointer(ctx.model, '/enableComments')).toMatchObject({ beforeText: 'いいえ', afterText: 'はい' });
    expect(byPointer(ctx.model, '/enableComments').editables[0].editor).toEqual({ type: 'boolean' });
    const digits = byPointer(ctx.model, '/numberPrecision/digits');
    expect(digits.labelPath).toEqual(['数値の桁数と丸め', '全体の桁数']);
    expect(digits.groupId).toBe('appSettings:/numberPrecision');
    expect(digits.editables[0].editor).toEqual({ type: 'text' });
    const rounding = byPointer(ctx.model, '/numberPrecision/roundingMode');
    expect(rounding).toMatchObject({ beforeText: '四捨五入（偶数丸め）', afterText: '切り上げ' });
    expect(rounding.editables[0].editor.type).toBe('select');
    const month = byPointer(ctx.model, '/firstMonthOfFiscalYear');
    expect(month).toMatchObject({ beforeText: '1月', afterText: '4月' });
    expect(month.editables[0].editor.options).toHaveLength(12);
    const title = byPointer(ctx.model, '/titleField');
    expect(title.afterText).toBe('手動指定（顧客名（name））');
    expect(title.editables).toEqual([]);
  });

  it('numberPrecision の一部だけを選ぶと、ほかの値は反映先のまま。レコードのタイトルを選ぶとフィールド参照が要る', () => {
    const ctx = prepare('appSettings', source, target);
    const digits = compose(ctx, { selected: ['appSettings:/numberPrecision/digits'] });
    expect(digits.after.numberPrecision).toEqual({ digits: '10', decimalPlaces: '2', roundingMode: 'HALF_EVEN' });
    expect(digits.after.theme).toBe('WHITE');
    expect(digits.plan.operations).toHaveLength(1);
    expect(digits.plan.operations[0]).toMatchObject({ method: 'PUT', endpoint: '/app/settings.json' });
    expect(digits.plan.operations[0].body.numberPrecision.digits).toBe('10');
    expect(digits.plan.requiredFields).toBeUndefined();
    expect(digits.plan.changes.map(change => change.path)).toEqual(['数値の桁数と丸め / digits']);
    const title = compose(ctx, { selected: ['appSettings:/titleField'] });
    expect(title.plan.requiredFields).toEqual(['name']);
    const edited = compose(ctx, { selected: ['appSettings:/theme'], overrides: { '/theme': 'BLUE' } });
    expect(edited.after.theme).toBe('BLUE');
    expect(edited.editedCount).toBe(1);
    const all = compose(ctx, defaultSelectionState(ctx.model));
    expect(all.plan.operations).toEqual(ctx.plan.operations);
    expect(all.plan.requiredFields).toEqual(ctx.plan.requiredFields);
    expect(all.plan.changes).toEqual(ctx.plan.changes);
  });
});

describe('差分の選択: プロセス・カテゴリー・通知・レイアウト・プラグイン', () => {
  it('プロセス管理は状態の追加を要素ごとに選び、アクション（配列）は 1 値。アクションは追加した状態を要求する', () => {
    const state = (name: string, index: string) => ({ name, index, assignee: { type: 'ONE', entities: [] } });
    const source = { enable: true, states: { 未処理: state('未処理', '0'), 処理中: state('処理中', '1'), 完了: state('完了', '2') }, actions: [{ name: '開始', from: '未処理', to: '処理中' }, { name: '完了', from: '処理中', to: '完了' }] };
    const target = { enable: true, states: { 未処理: state('未処理', '0'), 処理中: state('処理中', '1') }, actions: [{ name: '開始', from: '未処理', to: '処理中' }] };
    const ctx = prepare('processSettings', source, target);
    expect(ctx.model.changes.map(change => change.pointer)).toEqual(['/states/完了', '/actions']);
    const actions = byPointer(ctx.model, '/actions');
    expect(actions).toMatchObject({ whole: false, kind: '変更', beforeText: '1件（開始（未処理 → 処理中））', afterText: '2件（開始（未処理 → 処理中）、完了（処理中 → 完了））' });
    expect(actions.requires).toEqual(['processSettings:/states/完了']);
    expect(actions.editables).toEqual([]);
    expect(compose(ctx, { selected: [actions.id] }).errors.join('\n')).toContain('一緒に選んでください');
    const both = compose(ctx, { selected: ctx.model.changes.map(change => change.id) });
    expect(both.errors).toEqual([]);
    expect(both.plan.operations).toEqual(ctx.plan.operations);
    const onlyState = compose(ctx, { selected: ['processSettings:/states/完了'] });
    expect(onlyState.after.states.完了.index).toBe('2');
    expect(onlyState.after.actions).toHaveLength(1);
  });

  it('カテゴリーは追加を要素ごとに選び、機能の有効化は 1 値', () => {
    const cat = (name: string, index: string) => ({ name, index, children: {} });
    const source = { enabled: true, categories: { A: cat('A', '0'), B: cat('B', '1') } };
    const target = { enabled: false, categories: { A: cat('A', '0') } };
    const ctx = prepare('categories', source, target);
    expect(ctx.model.changes.map(change => [change.pointer, change.kind])).toEqual([['/categories/B', '追加'], ['/enabled', '変更']]);
    expect(byPointer(ctx.model, '/enabled')).toMatchObject({ labelPath: ['カテゴリー機能'], beforeText: 'いいえ', afterText: 'はい' });
    const onlyCategory = compose(ctx, { selected: ['categories:/categories/B'] });
    expect(onlyCategory.after.enabled).toBe(false);
    expect(onlyCategory.after.categories.B.index).toBe('1');
  });

  it('通知は配列全体で 1 値、コメントへの通知は別の値', () => {
    const rule = (code: string) => ({ entity: { type: 'USER', code }, recordAdded: true, includeSubs: false });
    const ctx = prepare('notifications', { notifications: [rule('a'), rule('b')], notifyToCommenter: true }, { notifications: [rule('a')], notifyToCommenter: false });
    expect(ctx.model.note).toContain('一覧全体');
    expect(ctx.model.changes.map(change => change.pointer)).toEqual(['/notifications', '/notifyToCommenter']);
    expect(byPointer(ctx.model, '/notifications').afterText).toBe('2件（ユーザー「a」、ユーザー「b」）');
    const onlyFlag = compose(ctx, { selected: ['notifications:/notifyToCommenter'] });
    expect(onlyFlag.plan.operations[0].body).toEqual({ notifications: [rule('a')], notifyToCommenter: true });
  });

  it('レイアウトは項目全体で 1 つの変更', () => {
    const row = (code: string) => ({ type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code, size: { width: '200' } }] });
    const ctx = prepare('layoutSettings', { layout: [row('name'), row('memo')] }, { layout: [row('name')] });
    expect(ctx.model.changes).toHaveLength(1);
    expect(ctx.model.note).toContain('全体で選びます');
    expect(ctx.model.changes[0]).toMatchObject({ pointer: '/layout', labelPath: ['レイアウト'], beforeText: '1 行・フィールド 1 個', afterText: '2 行・フィールド 2 個' });
    const none = compose(ctx, { selected: [] });
    expect(none.plan.operations).toEqual([]);
    const all = compose(ctx, defaultSelectionState(ctx.model));
    expect(all.plan.operations).toEqual(ctx.plan.operations);
    expect(all.plan.requiredFields).toEqual(['name', 'memo']);
  });

  it('プラグインは JSON で直せず、追加分だけを POST する', () => {
    const ctx = prepare('pluginSettings', { plugins: [{ id: 'p1' }, { id: 'p2' }] }, { plugins: [{ id: 'p1' }] });
    expect(ctx.model.jsonEditable).toBe(false);
    expect(ctx.model.changes.map(change => change.pointer)).toEqual(['/plugins']);
    const composed = compose(ctx, defaultSelectionState(ctx.model));
    expect(composed.plan.operations).toEqual([{ method: 'POST', endpoint: '/app/plugins.json', body: { ids: ['p2'] }, label: 'プラグイン追加' }]);
    expect(compose(ctx, { selected: [] }).plan.operations).toEqual([]);
    expect(compose(ctx, { json: { plugins: ['p1'] } }).errors.join('\n')).toContain('JSON では直せません');
  });
});

describe('差分の選択: JS/CSS', () => {
  const source = {
    scope: 'ADMIN',
    desktop: { js: [{ type: 'URL', url: 'https://example.com/a.js' }, { type: 'FILE', file: { fileKey: 'src-1', name: 'app.js', contentType: 'text/javascript', size: '10' } }], css: [] },
    mobile: { js: [], css: [] }
  };
  const target = {
    scope: 'ALL',
    desktop: { js: [], css: [{ type: 'URL', url: 'https://example.com/old.css' }] },
    mobile: { js: [], css: [] }
  };
  const resolution: CustomizeFileResolution = {
    files: { 'desktop/js/src-1': { status: 'upload', hash: 'h1', byteSize: 2048, contentType: 'text/javascript' } },
    hashes: { 'src-1': 'h1' }, blobs: new Map(), targetBlobs: new Map(), targetUnavailable: []
  };
  const make = () => prepare('customizeSettings', source, target, { customizeFiles: resolution });

  it('適用範囲と 4 つの一覧を 1 値ずつ選べ、JSON では直せない', () => {
    const ctx = make();
    expect(ctx.plan.status).toBe('change');
    expect(ctx.model.jsonEditable).toBe(false);
    expect(ctx.model.note).toContain('一覧ごとに選びます');
    expect(ctx.model.changes.map(change => change.pointer)).toEqual(['/desktop/js', '/desktop/css', '/scope']);
    const scope = byPointer(ctx.model, '/scope');
    expect(scope).toMatchObject({ beforeText: '全ユーザー', afterText: '管理者のみ', labelPath: ['適用範囲'] });
    expect(scope.editables[0].editor.type).toBe('select');
    const js = byPointer(ctx.model, '/desktop/js');
    expect(js).toMatchObject({ groupLabel: 'PC の JS', beforeText: '（空）', afterText: '2件（https://example.com/a.js、app.js）', kind: '変更' });
    expect(js.editables).toEqual([]);
    expect(compose(ctx, { json: ctx.model.after }).errors.join('\n')).toContain('JSON では直せません');
  });

  it('JS の一覧だけを選ぶと、その一覧のアップロードを引き継ぎ、選ばない一覧は反映先のまま', () => {
    const ctx = make();
    expect(ctx.plan.fileUploads).toHaveLength(1);
    const jsOnly = compose(ctx, { selected: ['customizeSettings:/desktop/js'] });
    expect(jsOnly.errors).toEqual([]);
    expect(jsOnly.after.scope).toBe('ALL');
    expect(jsOnly.after.desktop.css).toEqual(target.desktop.css);
    expect(jsOnly.plan.fileUploads).toEqual(ctx.plan.fileUploads);
    expect(jsOnly.plan.operations).toHaveLength(1);
    expect(jsOnly.plan.operations[0].uploads).toEqual(ctx.plan.fileUploads);
    expect(jsOnly.plan.operations[0].body.desktop.js[1]).toEqual({ type: 'FILE', file: { fileKey: 'src-1' } });
    expect(jsOnly.plan.warnings.some(message => message.includes('1 件のファイル'))).toBe(true);
    // アップロードのいらない一覧だけなら、アップロードしない
    const cssOnly = compose(ctx, { selected: ['customizeSettings:/desktop/css'] });
    expect(cssOnly.plan.fileUploads).toBeUndefined();
    expect(cssOnly.plan.operations[0].uploads).toBeUndefined();
    expect(cssOnly.plan.warnings.some(message => message.includes('アップロード'))).toBe(false);
    const scopeOnly = compose(ctx, { selected: ['customizeSettings:/scope'] });
    expect(scopeOnly.plan.operations[0].body.scope).toBe('ADMIN');
    expect(scopeOnly.plan.operations[0].body.desktop.js).toEqual([]);
    const all = compose(ctx, defaultSelectionState(ctx.model));
    expect(all.plan.operations).toEqual(ctx.plan.operations);
    expect(all.plan.fileUploads).toEqual(ctx.plan.fileUploads);
    expect(all.plan.changes).toEqual(ctx.plan.changes);
    expect(all.plan.items).toEqual(ctx.plan.items);
    expect(all.plan.warnings).toEqual(ctx.plan.warnings);
  });
});

describe('差分の選択: 取得できない・書き込めない項目', () => {
  it('取得失敗・blockers のある項目はモデルを作らない', () => {
    const failed = prepare('viewSettings', { _fetchError: 'x' }, { views: {} });
    expect(failed.plan.status).toBe('src-missing');
    expect(failed.model).toBeNull();
  });
});
