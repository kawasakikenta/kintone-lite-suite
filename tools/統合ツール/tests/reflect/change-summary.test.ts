import { describe, expect, it } from 'vitest';
import { reflectFieldLabels, retainedItemNames, summarizeReflectItems as summarize, type ReflectItemSummary } from '../../src/reflect/changeSummary';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';

const field = (code: string, label = code, extra: Record<string, any> = {}) => ({ type: 'SINGLE_LINE_TEXT', code, label, required: false, ...extra });
const labels = { tag: 'タグ', amount: '金額', note: 'メモ', tbl: '明細' };
const find = (items: ReflectItemSummary[], name: string) => items.find(item => item.name === name);
const kinds = (items: ReflectItemSummary[]) => items.map(item => `${item.kind}:${item.name}`);

describe('fieldSettings', () => {
  it('summarizes added fields, changed attributes and option changes by field', () => {
    const before = { properties: { tag: field('tag', 'タグ'), amount: { type: 'DROP_DOWN', code: 'amount', label: '金額', options: { A: { label: 'A', index: '0' }, C: { label: 'C', index: '1' } } } } };
    const after = { properties: { tag: field('tag', 'タグ2', { required: true }), amount: { type: 'DROP_DOWN', code: 'amount', label: '金額', options: { A: { label: 'A', index: '0' }, B: { label: 'B', index: '1' } } }, added: field('added', '追加項目', { required: true }) } };
    const items = summarize('fieldSettings', before, after);
    expect(kinds(items)).toEqual(['変更:タグ2（tag）', '変更:金額（amount）', '追加:追加項目（added）']);
    expect(find(items, 'タグ2（tag）')!.details).toEqual(['表示名: タグ → タグ2', '必須: いいえ → はい']);
    expect(find(items, '金額（amount）')!.details).toEqual(['選択肢: 追加 B / 削除 C']);
    expect(find(items, '追加項目（added）')!.details).toEqual(['種類: 文字列(1行)', '必須']);
  });
  it('reports a reordered option list as a reorder only', () => {
    const options = (names: string[]) => ({ type: 'RADIO_BUTTON', code: 'r', label: 'R', options: Object.fromEntries(names.map((name, i) => [name, { label: name, index: String(i) }])) });
    const items = summarize('fieldSettings', { properties: { r: options(['A', 'B']) } }, { properties: { r: options(['B', 'A']) } });
    expect(items[0].details).toEqual(['選択肢: 並び順のみ変更']);
  });
  it('names table children as table label / child label (code) and lists each child on its own', () => {
    const table = (fields: Record<string, any>, extra = {}) => ({ type: 'SUBTABLE', code: 'tbl', label: '明細', fields, ...extra });
    const before = { properties: { tbl: table({ q: field('q', '数量'), r: field('r', '備考') }) } };
    const after = { properties: { tbl: table({ q: field('q', '数量', { maxLength: '10' }), n: field('n', '新規', { required: true }) }) } };
    const items = summarize('fieldSettings', before, after);
    expect(kinds(items)).toEqual(['削除:明細 / 備考（r）', '変更:明細 / 数量（q）', '追加:明細 / 新規（n）']);
    expect(find(items, '明細 / 数量（q）')!.details).toEqual(['最大文字数: （なし） → 10']);
  });
  it('adds a table as a single item with its child count', () => {
    const items = summarize('fieldSettings', { properties: {} }, { properties: { tbl: { type: 'SUBTABLE', code: 'tbl', label: '明細', fields: { a: field('a'), b: field('b') } } } });
    expect(items).toEqual([{ kind: '追加', name: '明細（tbl）', details: ['種類: テーブル', 'テーブル内フィールド 2件'] }]);
  });
  it('falls back to the field code when no display name exists and uses fieldLabels as a hint', () => {
    const noLabel = { type: 'NUMBER', code: 'num' };
    expect(summarize('fieldSettings', { properties: {} }, { properties: { num: noLabel } })[0].name).toBe('num');
    expect(summarize('fieldSettings', { properties: {} }, { properties: { num: noLabel } }, { fieldLabels: { num: '数量' } })[0].name).toBe('数量（num）');
  });
  it('treats prototype-looking field codes as ordinary names', () => {
    const before = { properties: JSON.parse('{"__proto__":{"type":"NUMBER","code":"__proto__","label":"p"}}') };
    const after = { properties: JSON.parse('{"__proto__":{"type":"NUMBER","code":"__proto__","label":"p2"},"constructor":{"type":"NUMBER","code":"constructor"}}') };
    const items = summarize('fieldSettings', before, after);
    expect(kinds(items)).toEqual(['変更:p2（__proto__）', '追加:constructor']);
    expect(items[0].details).toEqual(['表示名: p → p2']);
  });
  it('shortens long values and caps the number of details', () => {
    const long = 'あ'.repeat(200);
    const changed = summarize('fieldSettings', { properties: { a: field('a', 'A', { defaultValue: '' }) } }, { properties: { a: field('a', 'A', { defaultValue: long }) } })[0];
    expect(changed.details[0].length).toBeLessThan(100);
    expect(changed.details[0]).toContain('…');
    const attrs = (suffix: string) => Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`custom${i}`, `${suffix}${i}`]));
    const many = summarize('fieldSettings', { properties: { a: field('a', 'A', attrs('x')) } }, { properties: { a: field('a', 'A', attrs('y')) } })[0];
    expect(many.details).toHaveLength(8);
    expect(many.details[7]).toBe('ほか 5 件');
  });
});

describe('layoutSettings', () => {
  const text = (code: string, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', code, ...extra });
  it('reports moves, widths, additions and removals per field code', () => {
    const before = { layout: [{ type: 'ROW', fields: [text('tag', { size: { width: '200' } }), text('amount')] }, { type: 'ROW', fields: [text('gone')] }, { type: 'GROUP', code: 'g', layout: [{ type: 'ROW', fields: [text('note')] }] }] };
    const after = { layout: [{ type: 'ROW', fields: [text('amount'), text('tag', { size: { width: '300' } })] }, { type: 'GROUP', code: 'g', layout: [{ type: 'ROW', fields: [] }] }, { type: 'ROW', fields: [text('note'), text('fresh')] }] };
    const items = summarize('layoutSettings', before, after, { fieldLabels: labels });
    expect(kinds(items)).toEqual(['削除:gone', '変更:金額（amount）', '変更:タグ（tag）', '変更:g', '変更:メモ（note）', '追加:fresh']);
    expect(find(items, 'g')!.details).toEqual(['位置: 3行目 → 2行目']);
    expect(find(items, 'タグ（tag）')!.details).toEqual(['位置: 1行目の1番目 → 1行目の2番目', '幅: 200px → 300px']);
    expect(find(items, 'メモ（note）')!.details).toEqual(['位置: グループ「g」内の1行目の1番目 → 3行目の1番目']);
    expect(find(items, 'fresh')!.details).toEqual(['配置: 3行目の2番目']);
  });
  it('names positions inside a table and groups labels, spacers and rules by count', () => {
    const before = { layout: [{ type: 'ROW', fields: [{ type: 'LABEL', label: 'a' }, { type: 'HR' }] }, { type: 'SUBTABLE', code: 'tbl', fields: [text('q'), text('r')] }] };
    const after = { layout: [{ type: 'ROW', fields: [{ type: 'LABEL', label: 'a' }, { type: 'LABEL', label: 'b' }, { type: 'SPACER', elementId: 's' }] }, { type: 'SUBTABLE', code: 'tbl', fields: [text('r'), text('q')] }] };
    const items = summarize('layoutSettings', before, after, { fieldLabels: labels });
    const plain = items.filter(item => item.name === 'ラベル・スペース・罫線').map(item => [item.kind, item.details]);
    expect(plain).toEqual([['削除', ['罫線: 1個 → 0個']], ['追加', ['ラベル: 1個 → 2個', 'スペース: 0個 → 1個']]]);
    expect(find(items, 'q')!.details).toEqual(['位置: テーブル「明細（tbl）」の1番目 → テーブル「明細（tbl）」の2番目']);
  });
  it('reports size changes of spacers even when other fields also change', () => {
    const before = { layout: [{ type: 'ROW', fields: [{ type: 'SPACER', elementId: 's', size: { width: '20' } }, text('q')] }] };
    const after = { layout: [{ type: 'ROW', fields: [{ type: 'SPACER', elementId: 's', size: { width: '50' } }, text('r'), text('q')] }] };
    const items = summarize('layoutSettings', before, after, { fieldLabels: labels });
    expect(find(items, 'ラベル・スペース・罫線')).toMatchObject({ kind: '変更', details: ['スペースの大きさを変更'] });
  });
  it('adds a total count when a long list is shortened', () => {
    const fields = Array.from({ length: 30 }, (_, i) => `field_with_long_code_${i}`);
    const items = summarize('viewSettings', { views: { 一覧: { type: 'LIST', index: '0', fields } } }, { views: { 一覧: { type: 'LIST', index: '0', fields: [] } } });
    expect(items[0].details[0]).toMatch(/…（計 30 件）$/);
  });
  it('still reports a layout that changed only in row order', () => {
    const rows = (...rows: any[]) => ({ layout: rows.map(fields => ({ type: 'ROW', fields })) });
    const items = summarize('layoutSettings', rows([{ type: 'SPACER', elementId: 'a' }], [{ type: 'HR' }]), rows([{ type: 'HR' }], [{ type: 'SPACER', elementId: 'a' }]));
    expect(items).toEqual([{ kind: '変更', name: 'レイアウト', details: ['行や要素の並びを変更'] }]);
  });
});

describe('named sections', () => {
  it('summarizes views: added, removed, display order and displayed fields', () => {
    const before = { views: { 一覧A: { name: '一覧A', type: 'LIST', index: '1', fields: ['tag', 'amount'], filterCond: '', sort: '' }, 古い: { type: 'LIST', index: '0', fields: ['tag'] } } };
    const after = { views: { 一覧A: { name: '一覧A', type: 'LIST', index: '0', fields: ['amount', 'note'], filterCond: '', sort: '' }, 新規: { type: 'CALENDAR', index: '1', date: 'd', title: 't' } } };
    const items = summarize('viewSettings', before, after, { fieldLabels: labels });
    expect(kinds(items)).toEqual(['削除:古い', '変更:一覧A', '追加:新規']);
    expect(find(items, '一覧A')!.details).toEqual(['表示順: 2番目 → 1番目', '表示フィールド: 追加 メモ（note） / 削除 タグ（tag）']);
    expect(find(items, '新規')!.details).toEqual(['種類: カレンダー形式']);
  });
  it('reports a view whose only change is its order', () => {
    const view = (index: string) => ({ views: { A: { type: 'LIST', index, fields: [] } } });
    expect(summarize('viewSettings', view('2'), view('0'))).toEqual([{ kind: '変更', name: 'A', details: ['表示順: 3番目 → 1番目'] }]);
  });
  it('reports a reordered field list as a reorder only', () => {
    const view = (fields: string[]) => ({ views: { A: { type: 'LIST', index: '0', fields } } });
    expect(summarize('viewSettings', view(['a', 'b']), view(['b', 'a']))[0].details).toEqual(['表示フィールド: 並び順のみ変更']);
  });
  it('summarizes reports with group, aggregation, sort and periodic report changes', () => {
    const report = (extra: any) => ({ reports: { R: { chartType: 'BAR', chartMode: 'NORMAL', index: '0', groups: [{ code: 'tag', per: 'MONTH' }], aggregations: [{ type: 'COUNT' }], filterCond: '', sorts: [{ by: 'TOTAL', order: 'DESC' }], periodicReport: { active: false }, ...extra } } });
    const items = summarize('reportSettings', report({}), report({ chartType: 'PIE', groups: [{ code: 'tag', per: 'MONTH' }, { code: 'note' }], aggregations: [{ type: 'SUM', code: 'amount' }], sorts: [{ by: 'TOTAL', order: 'ASC' }], periodicReport: { active: true, period: { every: 'WEEK', dayOfWeek: 'MONDAY', time: '09:00' } } }), { fieldLabels: labels });
    expect(items).toHaveLength(1);
    expect(items[0].details).toEqual([
      'グラフの種類: 横棒グラフ → 円グラフ', '分類: 追加 メモ（note）', '集計: 追加 合計 金額（amount） / 削除 レコード数',
      '並び順: 追加 集計値 小さい順 / 削除 集計値 大きい順', '定期レポート: 無効 → 有効（毎週 月曜日 09:00）'
    ]);
    expect(summarize('reportSettings', { reports: {} }, report({}))[0]).toEqual({ kind: '追加', name: 'R', details: ['種類: 横棒グラフ'] });
  });
  it('summarizes actions with destination app, mappings and executors', () => {
    const action = (app: string, dest: string, users: any[]) => ({ actions: { A: { name: 'A', index: '0', destApp: { app }, mappings: [{ srcType: 'FIELD', srcField: 'a', destField: dest }], entities: users, filterCond: '' } } });
    const items = summarize('actionSettings', action('1', 'b', [{ type: 'USER', code: 'u1' }]), action('2', 'c', [{ type: 'USER', code: 'u1' }, { type: 'GROUP', code: 'g' }]));
    expect(items[0].details).toEqual(['コピー先アプリ: 1 → 2', 'フィールド対応: 追加 a → c / 削除 a → b', '実行できる対象: 追加 グループ「g」']);
  });
});

describe('processSettings', () => {
  const state = (name: string, index: string, type: string, users: string[]) => ({ name, index, assignee: { type, entities: users.map(code => ({ entity: { type: 'USER', code }, includeSubs: false })) } });
  it('summarizes enable, states and actions matched by name and transition', () => {
    const before = { enable: true, states: { 未処理: state('未処理', '0', 'ONE', []), 完了: state('完了', '1', 'ONE', ['a']) }, actions: [{ name: '申請', from: '未処理', to: '完了', filterCond: '' }, { name: '却下', from: '完了', to: '未処理', filterCond: '' }] };
    const after = {
      enable: false, states: { 未処理: state('未処理', '0', 'ONE', []), 完了: state('完了', '1', 'ALL', ['b']), 承認: state('承認', '2', 'ONE', ['c']) },
      actions: [{ name: '申請', from: '未処理', to: '承認', filterCond: 'x = 1' }, { name: '却下', from: '完了', to: '未処理', filterCond: 'y = 1', executableUser: { entities: [{ entity: { type: 'USER', code: 'z' } }] } }]
    };
    const items = summarize('processSettings', before, after);
    expect(kinds(items)).toEqual(['削除:申請（未処理 → 完了）', '変更:プロセス管理', '変更:完了', '変更:却下（完了 → 未処理）', '追加:承認', '追加:申請（未処理 → 承認）']);
    expect(find(items, 'プロセス管理')!.details).toEqual(['有効化: 有効 → 無効']);
    expect(find(items, '完了')!.details).toEqual(['作業者の選択方式: 候補から作業者を1人選ぶ → 候補の全員が作業する', '作業者: 追加 ユーザー「b」 / 削除 ユーザー「a」']);
    expect(find(items, '却下（完了 → 未処理）')!.details).toEqual(['条件: （空） → y = 1', '実行者: 追加 ユーザー「z」']);
    expect(find(items, '承認')!.details).toEqual(['種類: 状態', '作業者: ユーザー「c」']);
  });
  it('reports an action order change on its own', () => {
    const a = { name: 'A', from: 'x', to: 'y', filterCond: '' }, b = { name: 'B', from: 'y', to: 'x', filterCond: '' };
    const base = { enable: true, states: {} };
    expect(summarize('processSettings', { ...base, actions: [a, b] }, { ...base, actions: [b, a] })).toEqual([{ kind: '変更', name: 'アクションの並び', details: ['並び順のみ変更'] }]);
  });
});

describe('permissions and notifications', () => {
  it('matches app ACL rows by entity', () => {
    const user = (appEditable: boolean) => ({ entity: { type: 'USER', code: 'a' }, includeSubs: false, appEditable, recordViewable: true });
    const group = { entity: { type: 'GROUP', code: 'g' }, includeSubs: true, recordViewable: true, recordAddable: true };
    const items = summarize('appAcl', { rights: [user(false)] }, { rights: [user(true), group] });
    expect(items).toEqual([
      { kind: '変更', name: 'ユーザー「a」', details: ['アプリ管理: 不許可 → 許可'] },
      { kind: '追加', name: 'グループ「g」', details: ['許可: レコード閲覧、レコード追加、配下を含む'] }
    ]);
  });
  it('matches record permissions by condition and entities by entity', () => {
    const entity = (code: string, editable: boolean, type = 'USER') => ({ entity: { type, code }, viewable: true, editable, deletable: false, includeSubs: false });
    const before = { rights: [{ filterCond: 'x=1', entities: [entity('a', false)] }, { filterCond: 'old', entities: [] }] };
    const after = { rights: [{ filterCond: 'x=1', entities: [entity('a', true), entity('g', true, 'GROUP')] }, { filterCond: '', entities: [entity('a', true)] }] };
    const items = summarize('recordPermissions', before, after);
    expect(kinds(items)).toEqual(['削除:条件「old」', '変更:条件「x=1」', '追加:条件なし（すべてのレコード）']);
    expect(find(items, '条件「x=1」')!.details).toEqual(['対象: 追加 グループ「g」（閲覧・編集）', '対象 ユーザー「a」: 編集 不許可 → 許可']);
  });
  it('matches field ACL by field code with the display name', () => {
    const rule = (code: string, accessibility: string) => ({ code, entities: [{ accessibility, entity: { type: 'USER', code: 'a' }, includeSubs: false }] });
    const items = summarize('fieldAcl', { rights: [rule('tag', 'READ')] }, { rights: [rule('tag', 'WRITE'), rule('note', 'NONE')] }, { fieldLabels: labels });
    expect(kinds(items)).toEqual(['変更:タグ（tag）', '追加:メモ（note）']);
    expect(items[0].details).toEqual(['対象 ユーザー「a」: アクセス権 閲覧のみ → 閲覧・編集可']);
  });
  it('summarizes general notifications including the commenter flag', () => {
    const rule = (edited: boolean) => ({ entity: { type: 'USER', code: 'a' }, includeSubs: false, recordAdded: true, recordEdited: edited });
    const items = summarize('notifications', { notifications: [rule(false)], notifyToCommenter: false }, { notifications: [rule(true)], notifyToCommenter: true });
    expect(items).toEqual([
      { kind: '変更', name: 'ユーザー「a」', details: ['レコードの編集: いいえ → はい'] },
      { kind: '変更', name: 'コメントを書き込んだユーザーへの通知', details: ['通知しない → 通知する'] }
    ]);
  });
  it('matches per-record notifications by title and falls back to a count when rules cannot be matched', () => {
    const rule = (title: string, filterCond: string, groups: string[]) => ({ title, filterCond, targets: groups.map(code => ({ entity: { type: 'GROUP', code }, includeSubs: false })) });
    const items = summarize('perRecordNotifications', { notifications: [rule('T1', 'a=1', [])] }, { notifications: [rule('T1', 'a=2', ['g']), rule('T2', '', [])] });
    expect(items).toEqual([
      { kind: '変更', name: 'T1', details: ['絞り込み条件: a=1 → a=2', '通知先: 追加 グループ「g」'] },
      { kind: '追加', name: 'T2', details: ['通知先なし'] }
    ]);
    expect(summarize('perRecordNotifications', { notifications: [rule('', 'a=1', [])] }, { notifications: [rule('', 'a=1', []), rule('', 'a=2', [])] }))
      .toEqual([{ kind: '変更', name: 'レコード条件通知', details: ['ルール: 1件 → 2件'] }]);
  });
  it('summarizes reminder timing and timezone', () => {
    const reminder = (days: string, time: string) => ({ title: 'R', filterCond: '', timing: { code: 'tag', daysLater: days, hoursLater: '', time }, targets: [] });
    const items = summarize('reminderNotifications', { timezone: 'Asia/Tokyo', notifications: [reminder('-1', '09:00')] }, { timezone: 'UTC', notifications: [reminder('2', '10:00')] }, { fieldLabels: labels });
    expect(items).toEqual([
      { kind: '変更', name: 'R', details: ['通知するタイミング: タグ（tag） 1日前 09:00 → タグ（tag） 2日後 10:00'] },
      { kind: '変更', name: 'タイムゾーン', details: ['Asia/Tokyo → UTC'] }
    ]);
  });
});

describe('categories, plugins and customization', () => {
  it('summarizes the enabled flag and category paths', () => {
    const before = { enabled: false, categories: { A: { index: '0', children: { A1: { index: '0' } } } } };
    const after = { enabled: true, categories: { A: { index: '1', children: { A1: { index: '0' }, A2: { index: '1' } } }, B: { index: '2' } } };
    expect(summarize('categories', before, after)).toEqual([
      { kind: '変更', name: 'カテゴリー機能', details: ['有効状態: 無効 → 有効'] },
      { kind: '変更', name: 'A', details: ['表示順: 1番目 → 2番目'] },
      { kind: '追加', name: 'A / A2', details: ['カテゴリーを追加'] },
      { kind: '追加', name: 'B', details: ['カテゴリーを追加'] }
    ]);
    expect(summarize('categories', { enabled: true, categories: { A: {} } }, { enabled: true, categories: {} })).toEqual([{ kind: '削除', name: 'A', details: ['カテゴリーを削除'] }]);
  });
  it('lists plugin IDs which will be added', () => {
    expect(summarize('pluginSettings', { plugins: ['p1'] }, { plugins: ['p1', 'p2'] })).toEqual([{ kind: '追加', name: 'p2', details: ['プラグインを追加（固有の設定はコピーしません）'] }]);
  });
  it('compares JS/CSS by fileKey or by name and content hash, and reports scope and order', () => {
    const before = { scope: 'ALL', desktop: { js: [{ type: 'URL', url: 'https://a/x.js' }, { type: 'FILE', file: { fileKey: 'k1', name: 'a.js' } }, { type: 'FILE', file: { name: 'c.js', contentHash: 'h1' } }], css: [] }, mobile: { js: [], css: [] } };
    const after = { scope: 'ADMIN', desktop: { js: [{ type: 'FILE', file: { name: 'c.js', contentHash: 'h2' } }, { type: 'FILE', file: { fileKey: 'k1', name: 'a.js' } }, { type: 'URL', url: 'https://a/x.js' }, { type: 'URL', url: 'https://a/y.js' }], css: [] }, mobile: { js: [], css: [{ type: 'URL', url: 'u.css' }] } };
    const items = summarize('customizeSettings', before, after);
    expect(kinds(items)).toEqual(['変更:適用範囲', '変更:PC JS / c.js', '変更:PC JS の読み込み順', '追加:PC JS / https://a/y.js', '追加:モバイル CSS / u.css']);
    expect(find(items, '適用範囲')!.details).toEqual(['適用範囲: 全ユーザー → 管理者のみ']);
    expect(find(items, 'PC JS / c.js')!.details[0]).toBe('ファイルの内容を差し替え');
    expect(find(items, 'PC JS の読み込み順')!.details).toEqual(['読み込み順: https://a/x.js、a.js → a.js、https://a/x.js']);
    expect(find(items, 'モバイル CSS / u.css')!.details).toEqual(['種類: URL指定', '読み込み順: 1番目']);
  });
  it('treats files with the same name and hash as unchanged, and removed files as deletions', () => {
    const files = (...items: any[]) => ({ scope: 'ALL', desktop: { js: items, css: [] }, mobile: { js: [], css: [] } });
    const file = (name: string, contentHash: string) => ({ type: 'FILE', file: { name, contentHash } });
    expect(summarize('customizeSettings', files(file('a.js', 'h')), files(file('a.js', 'h')))).toEqual([]);
    expect(summarize('customizeSettings', files(file('a.js', 'h'), file('b.js', 'i')), files(file('b.js', 'i')))).toEqual([{ kind: '削除', name: 'PC JS / a.js', details: ['種類: ファイル指定'] }]);
  });
});

describe('appSettings and fallback', () => {
  it('reports each general setting as a change with Japanese labels', () => {
    const settings = (theme: string, mode: string, code: string, thumbnails: boolean, rounding: string, month: string) => ({ theme, titleField: { selectionMode: mode, code }, enableThumbnails: thumbnails, enableComments: true, numberPrecision: { digits: '16', decimalPlaces: '4', roundingMode: rounding }, firstMonthOfFiscalYear: month });
    const items = summarize('appSettings', settings('WHITE', 'AUTO', '', true, 'HALF_EVEN', '1'), settings('BLUE', 'MANUAL', 'tag', false, 'UP', '4'), { fieldLabels: labels });
    expect(items).toEqual([
      { kind: '変更', name: 'テーマ', details: ['ホワイト → ブルー'] },
      { kind: '変更', name: 'レコードのタイトル', details: ['選択方法: 自動選択 → 手動指定', 'フィールド: （なし） → タグ（tag）'] },
      { kind: '変更', name: 'サムネイル表示', details: ['有効 → 無効'] },
      { kind: '変更', name: '数値の桁数と丸め', details: ['丸めかた: 四捨五入（偶数丸め） → 切り上げ'] },
      { kind: '変更', name: '年度の開始月', details: ['1月 → 4月'] }
    ]);
  });
  it('summarizes unknown sections per top-level key without throwing', () => {
    expect(summarize('somethingNew', { a: 1, b: { x: 1 }, c: [1, 2] }, { a: 2, b: { x: 2 }, c: [2, 3], d: true })).toEqual([
      { kind: '変更', name: 'a', details: ['1 → 2'] },
      { kind: '変更', name: 'b', details: ['x: 1 → 2'] },
      { kind: '変更', name: 'c', details: ['c: 追加 3 / 削除 1'] },
      { kind: '追加', name: 'd', details: ['（なし） → はい'] }
    ]);
  });
  it('does not throw for malformed input and falls back to a generic summary', () => {
    expect(() => summarize('fieldSettings', null, undefined)).not.toThrow();
    expect(() => summarize('layoutSettings', { layout: 'x' }, { layout: [] })).not.toThrow();
    expect(() => summarize('processSettings', 1, 2)).not.toThrow();
    expect(summarize('viewSettings', { views: 'x' }, { views: {} }).length).toBeGreaterThan(0);
    expect(summarize('somethingNew', 1, 2)).toEqual([{ kind: '変更', name: '設定', details: ['1 → 2'] }]);
  });
});

describe('ordering and retained items', () => {
  it('orders items as delete, change, add, retained and skips retained names already shown', () => {
    const before = { views: { 保持: { type: 'LIST', index: '0', fields: [] }, 変更: { type: 'LIST', index: '1', fields: [] }, 削除: { type: 'LIST', index: '2', fields: [] } } };
    const after = { views: { 保持: { type: 'LIST', index: '2', fields: [] }, 変更: { type: 'LIST', index: '0', fields: [] }, 追加: { type: 'LIST', index: '1', fields: [] } } };
    const items = summarize('viewSettings', before, after, { retained: ['保持', 'そのまま'] });
    expect(kinds(items)).toEqual(['削除:削除', '変更:保持', '変更:変更', '追加:追加', '保持:そのまま']);
  });
  it('builds retained names with display names', () => {
    const changes = [
      { kind: '保持', path: 'フィールド / tag' }, { kind: '保持', path: 'フィールド / tbl / q' }, { kind: '変更', path: 'フィールド / x' }
    ];
    expect(retainedItemNames('fieldSettings', changes, { tag: 'タグ', tbl: '明細', q: '数量' })).toEqual(['タグ（tag）', '明細 / 数量（q）']);
    expect(retainedItemNames('layoutSettings', [{ kind: '保持', path: '配置 / tag' }], { tag: 'タグ' })).toEqual(['タグ（tag）']);
    expect(retainedItemNames('viewSettings', [{ kind: '保持', path: '一覧 / A / B' }])).toEqual(['A / B']);
  });
});

describe('reflectFieldLabels', () => {
  it('collects labels including table children, with later bundles taking priority', () => {
    const bundle = (properties: any) => ({ sections: { fieldSettings: { properties } } });
    const result = reflectFieldLabels(
      bundle({ a: { label: 'A' }, t: { type: 'SUBTABLE', label: 'T', fields: { c: { label: 'C' } } }, empty: { label: '' } }),
      bundle({ a: { label: 'A2' } }), undefined, {}
    );
    expect({ ...result }).toEqual({ a: 'A2', t: 'T', c: 'C' });
  });
  it('keeps prototype-looking codes as ordinary keys', () => {
    const result = reflectFieldLabels({ sections: { fieldSettings: { properties: JSON.parse('{"__proto__":{"label":"P"}}') } } });
    expect(result['__proto__']).toBe('P');
    expect(result['toString']).toBeUndefined();
  });
});

describe('buildReflectSectionPlan items', () => {
  it('attaches items without changing changes, counts or operations', () => {
    const source = { properties: { tag: field('tag', '新タグ'), fresh: field('fresh', '新規') } };
    const target = { properties: { tag: field('tag', 'タグ'), local: field('local', 'ローカル') } };
    const withLabels = buildReflectSectionPlan('fieldSettings', source, target, { fieldLabels: { local: 'ローカル' } });
    const without = buildReflectSectionPlan('fieldSettings', source, target);
    expect(withLabels.items!.map(item => `${item.kind}:${item.name}`)).toEqual(['変更:新タグ（tag）', '追加:新規（fresh）', '保持:ローカル（local）']);
    expect(without.items!.map(item => item.kind)).toEqual(['変更', '追加', '保持']);
    const { items: _a, ...a } = withLabels, { items: _b, ...b } = without;
    expect(a).toEqual(b);
    expect(withLabels.changeCount).toBe(2);
  });
  it('summarizes the real merged shape for views, layout, plugins and JS/CSS', () => {
    const view = (name: string, fields: string[], index: string) => ({ name, type: 'LIST', fields, index, filterCond: '', sort: '' });
    const views = buildReflectSectionPlan('viewSettings', { views: { 新: view('新', ['a'], '0') } }, { views: { 旧: view('旧', ['a'], '0') } });
    expect(kinds(views.items!)).toEqual(['変更:旧', '追加:新']);
    const plugins = buildReflectSectionPlan('pluginSettings', { plugins: [{ id: 'p1' }, { id: 'p2' }] }, { plugins: [{ id: 'p1' }] });
    expect(plugins.items).toEqual([{ kind: '追加', name: 'p2', details: ['プラグインを追加（固有の設定はコピーしません）'] }]);
    const custom = (js: any[]) => ({ scope: 'ALL', desktop: { js, css: [] }, mobile: { js: [], css: [] } });
    const url = buildReflectSectionPlan('customizeSettings', custom([{ type: 'URL', url: 'https://x/a.js' }]), custom([]));
    expect(url.items).toEqual([{ kind: '追加', name: 'PC JS / https://x/a.js', details: ['種類: URL指定', '読み込み順: 1番目'] }]);
    const text = (code: string) => ({ type: 'SINGLE_LINE_TEXT', code });
    const layout = buildReflectSectionPlan('layoutSettings', { layout: [{ type: 'ROW', fields: [text('a')] }] }, { layout: [{ type: 'ROW', fields: [text('b')] }] }, { fieldLabels: { a: 'エー', b: 'ビー' } });
    // 反映先だけのフィールドは末尾に移るため、保持ではなく位置の変更として示す。
    expect(layout.items!.map(item => `${item.kind}:${item.name}`)).toEqual(['変更:ビー（b）', '追加:エー（a）']);
    expect(layout.items![0].details).toEqual(['位置: 1行目の1番目 → 2行目の1番目']);
  });
  it('never fails the plan when the summary throws', () => {
    const plan = buildReflectSectionPlan('fieldSettings', { properties: { a: field('a') } }, { properties: {} }, { fieldLabels: new Proxy({}, { get() { throw new Error('boom'); }, has() { throw new Error('boom'); } }) as any });
    expect(plan.status).not.toBe('error');
    expect(Array.isArray(plan.items)).toBe(true);
  });
});

describe('long values and reorder-only changes are not dropped', () => {
  it('reports a change when only the clipped tail of a long value differs', () => {
    const long = (tail: string) => 'x'.repeat(100) + tail;
    const items = summarize('viewSettings', { views: { 一覧: { type: 'LIST', index: '0', fields: [], filterCond: long('a') } } }, { views: { 一覧: { type: 'LIST', index: '0', fields: [], filterCond: long('b') } } });
    expect(items).toHaveLength(1);
    expect(items[0].details.join()).toContain('内容を変更（長いため省略）');
  });
  it('reports a reorder of entities as a change', () => {
    const entity = (code: string) => ({ entity: { type: 'USER', code } });
    const items = summarize('actionSettings', { actions: { a: { name: 'a', index: '0', entities: [entity('u1'), entity('u2')] } } }, { actions: { a: { name: 'a', index: '0', entities: [entity('u2'), entity('u1')] } } });
    expect(items).toHaveLength(1);
    expect(items[0].details.join()).toContain('並び順のみ変更');
  });
});
