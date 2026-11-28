import { describe, expect, it } from 'vitest';
import {
  KINTONE_ERROR_LIST_LIMIT,
  abbreviateKintoneErrorMessage,
  collectKintoneErrors,
  describeKintoneErrorKey,
  findKintoneErrorMap,
  formatKintoneErrorLines,
  kintoneErrorDetailsOf,
  summarizeKintoneErrorDetails,
  withoutKintoneErrorLines
} from '../../src/kintoneErrorDetail';
import { apiErrorWithContext, withoutApiContextLines } from '../../src/utils';
import { describeBatchWriteFailure, describeKintoneRecordErrors } from '../../src/tabs/record-query';

// kintone の入力エラー（CB_VA01 など）は、受け付けなかった項目ごとに errors: { "<キー>": { messages: [...] } } を返す。
// 以前は画面に「入力内容が正しくありません。」だけが出て、どのフィールドの何かはログのキー（properties.xxx…）を読むしかなかった。
const rejection = (errors: Record<string, unknown>) => ({ code: 'CB_VA01', id: 'req-1', message: '入力内容が正しくありません。', errors });

describe('describeKintoneErrorKey: キーを場所の名前に言い換える', () => {
  it.each([
    // フィールドの設定（POST/PUT /app/form/fields.json）。差分比較の「設定項目（日本語）」と同じ言葉（FIELD_SETTING_LABELS）
    ['properties.customer.lookup.relatedApp.app', 'フィールド「customer」のルックアップ設定・参照するアプリID'],
    ['properties[customer].lookup.relatedApp.app', 'フィールド「customer」のルックアップ設定・参照するアプリID'],
    ['properties.customer.lookup.fieldMappings[1].field', 'フィールド「customer」のルックアップ設定・ほかのフィールドのコピー（2件目）・自アプリのフィールド'],
    ['properties.total.expression', 'フィールド「total」の計算式'],
    ['properties.amount', 'フィールド「amount」'],
    ['properties', 'フィールドの設定'],
    ['properties.items.fields.qty.maxValue', 'テーブル「items」のフィールド「qty」の数値の制限（最大）'],
    ['properties.rel.referenceTable.condition.field', 'フィールド「rel」の関連レコード一覧設定・表示するレコードの条件・自アプリのフィールド'],
    // 選択肢の名前は「.」を含みうる
    ['properties.status.options.完了.index', 'フィールド「status」の選択肢「完了」の並び順'],
    ['properties.rate.options.1.5.label', 'フィールド「rate」の選択肢「1.5」の名前'],
    ['properties.status.options[完了].label', 'フィールド「status」の選択肢「完了」の名前'],
    ['properties.status.options', 'フィールド「status」の選択肢'],
    ['properties.memo.unknownSetting', 'フィールド「memo」のunknownSetting'],
    // レコード（POST/PUT /records.json・PUT /records/status.json）
    ['records[2].amount.value', '3件目・amount'],
    ['records[0].table.value[1].value.qty.value', '1件目・table2行目・qty'],
    ['records[0].table.value[1].id', '1件目・table2行目の行ID'],
    ['records[4].assignee', '5件目・作業者'],
    ['records[4].action', '5件目・アクション'],
    ['records[4].id', '5件目・レコードID'],
    ['records[4].revision', '5件目・レコードの更新番号（revision）'],
    ['record.amount.value', 'amount'],
    ['records', 'レコード'],
    // そのほかの設定
    ['states[未処理].index', 'ステータス「未処理」の並び順'],
    ['states.未処理.assignee.type', 'ステータス「未処理」の作業者の指定方法'],
    ['actions[0].from', 'アクション（1件目）の実行前のステータス'],
    ['actions.見積を作成.destApp.app', 'アクション「見積を作成」のコピー先のアプリ・アプリID'],
    ['views.案件一覧.filterCond', '一覧「案件一覧」の絞り込み条件'],
    ['views[案件一覧].type', '一覧「案件一覧」の一覧の種類'],
    ['reports.地域別.groups[0].code', 'グラフ「地域別」の分類する項目（1件目）・フィールドコード'],
    ['layout[0].fields[2].code', 'レイアウト（1行目）の部品（3件目）・フィールドコード'],
    ['desktop.js[1].url', 'PC用のJavaScript（2件目）・URL'],
    ['mobile.css[0].file.fileKey', 'モバイル用のCSS（1件目）・ファイル'],
    ['scope', 'JavaScript・CSS の適用範囲'],
    ['rights[0].entity.code', 'アクセス権（1件目）の対象・コード'],
    ['notifications[3].entity.type', '通知（4件目）の通知先・種類'],
    ['titleField.code', 'レコードタイトル・フィールドコード'],
    ['firstMonthOfFiscalYear', '年度の開始月'],
    ['apps[0].revision', '1件目のアプリの設定の更新番号（revision）'],
    ['revision', '設定の更新番号（revision）'],
    ['app', 'アプリID'],
    // 先頭の id はレコードIDかアプリIDか決められないので、キーのまま
    ['id', 'id'],
    // 言い換えられないキーはそのまま
    ['somethingNew.x', 'somethingNew.x'],
    ['[0].x', '[0].x']
  ])('%s → %s', (key, expected) => {
    expect(describeKintoneErrorKey(key)).toBe(expected);
  });

  it('レコードの位置・フィールド・本番反映のアプリは、呼び出し元の呼び名にできる', () => {
    const naming = { record: (index: number) => `CSV ${index + 2}行目`, recordField: (code: string, table?: string) => (table ? `${table}の${code}` : `${code}!`), app: (index: number) => `App ${index + 200}` };
    expect(describeKintoneErrorKey('records[3].amount.value', naming)).toBe('CSV 5行目・amount!');
    expect(describeKintoneErrorKey('records[3].table.value[0].value.qty.value', naming)).toBe('CSV 5行目・table!1行目・tableのqty');
    expect(describeKintoneErrorKey('apps[2].revision', naming)).toBe('App 202の設定の更新番号（revision）');
  });

  it('長いキー・設定から来た名前（constructor など）でも壊れない', () => {
    expect(describeKintoneErrorKey(`properties.${'x'.repeat(500)}.label`).length).toBeLessThanOrEqual(161);
    expect(describeKintoneErrorKey('properties.constructor.toString')).toBe('フィールド「constructor」のtoString');
    expect(describeKintoneErrorKey('views.__proto__.name')).toBe('一覧「__proto__」の一覧名');
    expect(describeKintoneErrorKey('')).toBe('（場所の指定なし）');
  });
});

describe('項目ごとのエラーの取り出しと整形', () => {
  it('API 層が包んだエラーの元のエラーから errors を探す。配列の errors（中継装置の JSON など）は使わない', () => {
    const raw = rejection({ 'properties.a.label': { messages: ['必須です。'] } });
    const wrapped = Object.assign(new Error('x'), { original: Object.assign(new Error('y'), { original: raw }) });
    expect(findKintoneErrorMap(wrapped)).toBe(raw.errors);
    expect(findKintoneErrorMap({ errors: [{ message: 'bad gateway' }] })).toBeNull();
    expect(findKintoneErrorMap({ errors: {} })).toBeNull();
    expect(findKintoneErrorMap(null)).toBeNull();
    expect(findKintoneErrorMap('CB_VA01')).toBeNull();
  });

  it('文が複数なら「 / 」でつなぎ、改行は空白に、長い文は上限で切る。文の無い項目は「(詳細なし)」', () => {
    const error = rejection({
      'properties.a.label': { messages: ['必須です。', '128文字以内で\n入力してください。'] },
      'properties.b.label': { messages: ['x'.repeat(500)] },
      'properties.c.label': {},
      'properties.d.label': 'そのままの文字列'
    });
    const lines = formatKintoneErrorLines(error);
    expect(lines[0]).toBe('フィールド「a」のフィールド名: 必須です。 / 128文字以内で 入力してください。');
    expect(lines[1].length).toBeLessThan(260);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(lines[2]).toBe('フィールド「c」のフィールド名: (詳細なし)');
    expect(lines[3]).toBe('フィールド「d」のフィールド名: そのままの文字列');
  });

  it('全件（上限 100 件）を並べ、超えた分は「ほか N 件」の 1 行にする', () => {
    const errors = Object.fromEntries(Array.from({ length: 130 }, (_, i) => [`properties.f${i}.label`, { messages: ['必須です。'] }]));
    const lines = formatKintoneErrorLines(rejection(errors));
    expect(lines).toHaveLength(KINTONE_ERROR_LIST_LIMIT + 1);
    expect(lines.at(-1)).toBe('ほか 30 件');
    expect(collectKintoneErrors(rejection(errors))).toHaveLength(130);
  });

  it('画面向けには先頭 3 件と「ほか N 件」（上限を超えた分も数える）', () => {
    expect(summarizeKintoneErrorDetails(['a', 'b'])).toEqual(['a', 'b']);
    expect(summarizeKintoneErrorDetails(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(summarizeKintoneErrorDetails(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c', 'ほか 2 件']);
    expect(summarizeKintoneErrorDetails(['a', 'b', 'c', 'd', 'ほか 30 件'])).toEqual(['a', 'b', 'c', 'ほか 31 件']);
    expect(summarizeKintoneErrorDetails(['a', 'ほか 30 件'])).toEqual(['a', 'ほか 30 件']);
    expect(summarizeKintoneErrorDetails([])).toEqual([]);
  });

  it('呼び出し元が付けた行（kintoneErrorDetails）があれば、そちらを使う', () => {
    const raw = rejection({ 'records[0].amount.value': { messages: ['数字でなければなりません。'] } });
    expect(kintoneErrorDetailsOf(raw)).toEqual(['1件目・amount: 数字でなければなりません。']);
    const named = Object.assign(new Error('x'), { kintoneErrorDetails: ['CSV 102行目・金額［amount］: 数字でなければなりません。'], original: raw });
    expect(kintoneErrorDetailsOf(named)).toEqual(['CSV 102行目・金額［amount］: 数字でなければなりません。']);
    expect(kintoneErrorDetailsOf(new Error('boom'))).toEqual([]);
  });
});

describe('apiErrorWithContext: エラーの文に、言い換えた項目ごとの行を全件入れる', () => {
  const errors = {
    'properties.priority.defaultValue': { messages: ['初期値「至急」は選択肢にありません。'] },
    'properties.priority.options.至急.index': { messages: ['indexが重複しています。'] },
    'properties[tags].options': { messages: ['選択肢を1つ以上指定してください。'] },
    'properties.items.fields.qty.maxValue': { messages: ['最大値は最小値以上にしてください。'] },
    'properties.customer.lookup.relatedApp.app': { messages: ['参照するアプリには、このアプリ自身を指定できません。'] },
    'properties.memo.label': { messages: ['フィールド名は必須です。'] }
  };
  const detailLines = [
    'フィールド「priority」の初期値: 初期値「至急」は選択肢にありません。',
    'フィールド「priority」の選択肢「至急」の並び順: indexが重複しています。',
    'フィールド「tags」の選択肢: 選択肢を1つ以上指定してください。',
    'テーブル「items」のフィールド「qty」の数値の制限（最大）: 最大値は最小値以上にしてください。',
    'フィールド「customer」のルックアップ設定・参照するアプリID: 参照するアプリには、このアプリ自身を指定できません。',
    'フィールド「memo」のフィールド名: フィールド名は必須です。'
  ];
  const wrapped = () => apiErrorWithContext(rejection(errors), { method: 'POST', path: '/app/form/fields.json', payload: { app: '7', properties: {} } });

  it('キーのままにせず、6 件すべてを入れる（以前は 5 件までとキーのまま）。通信情報の行は最後', () => {
    const lines = wrapped().message.split('\n');
    expect(lines[0]).toBe('入力内容が正しくありません。');
    expect(lines.slice(1, 7)).toEqual(detailLines);
    expect(lines[7]).toMatch(/^\[API\] POST \/app\/form\/fields\.json app=7/);
    expect(wrapped().message).not.toContain('properties.');
  });

  it('画面向けには先頭 3 件と「ほか N 件」に置き換える（位置はそのまま。通信情報の行は withoutApiContextLines で除く）', () => {
    const error = wrapped();
    const shown = withoutApiContextLines(abbreviateKintoneErrorMessage(error.message, error));
    expect(shown.split('\n')).toEqual(['入力内容が正しくありません。', ...detailLines.slice(0, 3), 'ほか 3 件']);
    // 前後に付いた文（部分成功の注意・ログ）はそのまま
    const decorated = Object.assign(new Error(`フィールド追加 2件は反映済みです。\n${error.message}\nNG フィールド更新 1件`), { original: error.original });
    expect(withoutApiContextLines(abbreviateKintoneErrorMessage(decorated.message, decorated)).split('\n'))
      .toEqual(['フィールド追加 2件は反映済みです。', '入力内容が正しくありません。', ...detailLines.slice(0, 3), 'ほか 3 件', 'NG フィールド更新 1件']);
  });

  it('文に項目ごとの行が無いエラー（kintone の応答をそのまま投げたもの）は、1 行目の後ろに入れる', () => {
    const raw = rejection(errors);
    expect(abbreviateKintoneErrorMessage(raw.message, raw).split('\n')).toEqual(['入力内容が正しくありません。', ...detailLines.slice(0, 3), 'ほか 3 件']);
    expect(abbreviateKintoneErrorMessage('', raw).split('\n')).toEqual([...detailLines.slice(0, 3), 'ほか 3 件']);
  });

  it('項目ごとのエラーが無ければ文を変えない', () => {
    const plain = apiErrorWithContext({ code: 'GAIA_NO01', id: 'x', message: '権限がありません。' }, { method: 'PUT', path: '/app/customize.json' });
    expect(abbreviateKintoneErrorMessage(plain.message, plain)).toBe(plain.message);
    expect(withoutKintoneErrorLines(plain.message, plain)).toBe(plain.message);
  });

  it('呼び名を渡すと、置き換える行をその呼び名で作る（本番反映の apps[N]）', () => {
    const error = apiErrorWithContext(rejection({ 'apps[1].revision': { messages: ['数字で指定してください。'] } }), { method: 'POST', path: '/preview/app/deploy.json' });
    expect(error.message.split('\n')[1]).toBe('2件目のアプリの設定の更新番号（revision）: 数字で指定してください。');
    const shown = abbreviateKintoneErrorMessage(error.message, error, { naming: { app: (index) => ['App 201（受注）', 'App 202（見積）'][index] } });
    expect(shown.split('\n').slice(0, 2)).toEqual(['入力内容が正しくありません。', 'App 202（見積）の設定の更新番号（revision）: 数字で指定してください。']);
    expect(shown).not.toContain('2件目のアプリ');
  });

  it('withoutKintoneErrorLines は項目ごとの行だけを除く', () => {
    const error = wrapped();
    expect(withoutApiContextLines(withoutKintoneErrorLines(error.message, error))).toBe('入力内容が正しくありません。');
  });
});

describe('レコードの書き込みの失敗（record-query.ts）と共通の言い換え', () => {
  it('塊の中の位置で数えた API 層の行（「50件目」）を原因に重ねず、全体での行番号つきの行だけを示す', () => {
    const api = apiErrorWithContext(rejection({ 'records[49].code.value': { messages: ['値がほかのレコードと重複しています。'] } }), { method: 'POST', path: '/records.json', payload: { app: '105' } });
    expect(api.message).toContain('50件目・code: 値がほかのレコードと重複しています。');
    const details = describeKintoneRecordErrors(api, 100, (index) => `CSV ${index + 2}行目`, (code) => (code === 'code' ? '案件番号［code］' : code));
    expect(details).toEqual(['CSV 151行目・案件番号［code］: 値がほかのレコードと重複しています。']);
    const text = describeBatchWriteFailure('App 105 の CSV取込', { done: 100, from: 101, to: 200, total: 250 }, api, details);
    expect(text).toContain('原因: 入力内容が正しくありません。');
    expect(text).not.toContain('50件目');
    expect(text).not.toContain('records[49]');
    expect(text).toContain('CSV 151行目・案件番号［code］: 値がほかのレコードと重複しています。');
  });
});
