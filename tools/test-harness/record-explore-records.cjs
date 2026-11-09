'use strict';

const assert = require('node:assert/strict');

// レコード管理の通し検証: 1 万件超の取得・CSV 出力と取込・事前検査と kintone の拒否・100 件ずつの書き込みと途中失敗・ステータス更新・アプリ間コピー・データ検査・無応答の書き込み。
const user = (code, name = code) => ({ code, name });
const fileValue = (key, size, name = `${key}.txt`) => ({ fileKey: key, name, size: String(size), contentType: 'text/plain' });

function register(scenario, ctx) {
  const {
    page, button, idle, statusText, statusTone, logText, pickAction, appInput, withOptions, reset, confirmAndRun, state, recordsOf, downloadBytes, downloadZip,
    downloadNames, ok, finding, shot, stage, dialogs, setDialogAnswer, activeTab, parseCsv, csvLine, panelText, sleepNode, setCurrent
  } = ctx;

  const csvQuery = () => activeTab().getByPlaceholder('空欄で全件（例: 更新日時 >= "2026-01-01T00:00:00Z"）', { exact: true });
  const importFile = (name, buffer) => page.getByLabel('取込CSV', { exact: true }).setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer) });
  const importWrites = now => now.writes.filter(w => w.method === 'POST' && w.path === '/records.json');
  const statusWrites = now => now.writes.filter(w => w.method === 'PUT' && w.path === '/records/status.json');

  // 業務に近い案件（コンマ・引用符・改行・先頭 0・数式に見える文字列・日時・ユーザー・組織・テーブル・添付）
  const projectRecords = () => [
    { appId: 101, values: { title: '基本の案件', code: 'P-001', amount: '1200', memo: 'ふつうのメモ', due: '2026-03-01', startAt: '2026-03-01T09:30:00Z', meet: '10:00', category: '新規', priority: '高', tags: ['A', 'C'], skills: ['JS', 'TS'], owner: [user('tanaka', '田中')], dept: [user('sales', '営業部')], url: 'https://example.com/a?x=1&y=2' } },
    { appId: 101, values: { title: 'カンマ,引用符"の値', code: 'P-002', amount: '0', memo: '1行目\r\n2行目,"引用"', priority: '中' } },
    { appId: 101, values: { title: '=SUM(A1:A2)', code: 'P-003', amount: '-50', memo: '+81-3-1234-5678', priority: '低' } },
    { appId: 101, values: { title: '-5度の注意', code: '00123', amount: '1.50', memo: '@mention', priority: '中', tags: [], owner: [user('tanaka'), user('suzuki')] } },
    { appId: 101, values: { title: '明細と添付あり', code: 'P-005', amount: '999999', priority: '中', attach: [fileValue('a1', 10, '見積書.pdf'), fileValue('a2', 20)], detail: [
      { id: '11', value: { item: { type: 'SINGLE_LINE_TEXT', value: '部品A' }, qty: { type: 'NUMBER', value: '3' }, remark: { type: 'SINGLE_LINE_TEXT', value: '' }, doc: { type: 'FILE', value: [fileValue('d1', 5)] } } },
      { id: '12', value: { item: { type: 'SINGLE_LINE_TEXT', value: '部品,B' }, qty: { type: 'NUMBER', value: '' }, remark: { type: 'SINGLE_LINE_TEXT', value: '="x"' }, doc: { type: 'FILE', value: [] } } }
    ] } }
  ];
  const projectConfig = () => ({ records: projectRecords(), files: { a1: { text: 'a1' }, a2: { text: 'a2' }, d1: { text: 'd1' } }, currentApp: 101 });

  // ---------------------------------------------------------------------------
  // 1 万件超の取得
  // ---------------------------------------------------------------------------
  scenario('fetch: 12,010 件を $id シークと cursor API で全件取得し、CSV 出力に欠け・重複が無い', async () => {
    await reset({ bulk: [{ appId: 103, count: 12010 }], currentApp: 103 });
    await appInput().fill('103');
    await pickAction('CSVを出力');
    await confirmAndRun('CSVを出力');
    let now = await state();
    const seekCalls = now.callUrls.filter(url => url === 'GET /k/v1/records.json').length;
    assert.equal(seekCalls, 25, '500 件ずつ 25 回（$id シーク）');
    assert.equal(now.writes.filter(w => w.path === '/records/cursor.json').length, 0, 'order by が無ければ cursor を使わない');
    let rows = parseCsv((await downloadBytes(0)).toString('utf8'));
    assert.equal(rows.length - 1, 12010);
    const ids = rows.slice(1).map(row => row[rows[0].indexOf('$id')] || row[0]);
    assert.equal(new Set(rows.slice(1).map(row => row[rows[0].indexOf('code')])).size, 12010, '案件番号に重複・欠けが無い');
    assert.match(await statusText(), /^12010件.*CSVを出力しました|CSV出力完了 \(12010件\)/);
    ok('12,010 件を $id シークで 25 回に分けて全件取得（欠け・重複なし）');
    // order by あり → cursor API
    await button('対象・条件を変更').click();
    await csvQuery().fill('amount > 10 order by amount desc');
    await confirmAndRun('CSVを出力');
    now = await state();
    assert.equal(now.writes.filter(w => w.method === 'POST' && w.path === '/records/cursor.json').length, 1, 'cursor を 1 つ作る');
    rows = parseCsv((await downloadBytes(1)).toString('utf8'));
    const expected = Array.from({ length: 12010 }, (_, i) => (i + 1) % 1000).filter(amount => amount > 10).length;
    assert.equal(rows.length - 1, expected, `order by 付きの件数 ${expected}`);
    const amountIndex = rows[0].indexOf('amount');
    const amounts = rows.slice(1).map(row => Number(row[amountIndex]));
    assert.ok(amounts.every((value, index) => index === 0 || amounts[index - 1] >= value), '並び順（降順）が保たれる');
    assert.equal(now.writes.some(w => w.rejected), false);
    assert.deepEqual(now.violations, []);
    ok('order by 付きは cursor API で全件取得・並び順を維持・書き込みなし');
  });

  scenario('quality: 12,010 件のデータ検査（重複・未入力）が期待どおり', async () => {
    const empty = 7, dupEvery = 100, count = 12010;
    await reset({ bulk: [{ appId: 103, count, dupEvery, empty }], currentApp: 103 });
    // 期待値を、合成データと同じ規則から求める
    const titles = new Map();
    let emptyCount = 0;
    for (let i = 1; i <= count; i += 1) {
      let title = `案件${i % dupEvery === 0 ? 'D' + (Math.floor(i / dupEvery) % 5) : i}`;
      if (i % empty === 0) title = '';
      if (!title) { emptyCount += 1; continue; }
      titles.set(title, (titles.get(title) || 0) + 1);
    }
    const groups = [...titles.values()].filter(n => n > 1);
    const dupRecords = groups.reduce((a, b) => a + b, 0);
    await appInput().fill('103');
    await pickAction('重複・未入力を検査');
    await button('検査フィールド読込').click(); await idle();
    await page.getByRole('group', { name: '検査するフィールド', exact: true }).getByRole('checkbox', { name: '件名［title］ / SINGLE_LINE_TEXT', exact: true }).check();
    await confirmAndRun('重複・未入力を検査');
    const text = await page.getByLabel('データ検査結果', { exact: true }).innerText();
    assert.match(text, new RegExp(`${count}件を検査 / 重複 ${groups.length}組・${dupRecords}件 / 未入力 ${emptyCount}件 / 取得不可 0件`), text.slice(0, 300));
    ok(`データ検査: ${count}件・重複 ${groups.length}組 ${dupRecords}件・未入力 ${emptyCount}件が期待どおり`);
  });

  // ---------------------------------------------------------------------------
  // CSV 出力 → CSV 取込の往復
  // ---------------------------------------------------------------------------
  scenario('csv: 出力した CSV の内容（テーブル・複数選択・ユーザー・日時・改行・引用符・先頭 0・数式対策）', async () => {
    await reset(projectConfig());
    await appInput().fill('101');
    await pickAction('CSVを出力');
    await confirmAndRun('CSVを出力');
    const names = await downloadNames();
    assert.equal(names.length, 1);
    assert.match(names[0], /\.zip$/, 'テーブルがあるので ZIP');
    const zip = await downloadZip(0);
    assert.deepEqual([...zip.keys()].filter(name => !name.endsWith('/')).sort(), ['manifest.json', 'records.csv', 'tables/detail.csv']);
    const rows = parseCsv(zip.get('records.csv').toString('utf8'));
    const header = rows[0];
    assert.equal(header[0], '$id');
    const cell = (rowIndex, code) => rows[rowIndex][header.indexOf(code)];
    assert.equal(rows.length, 6);
    assert.equal(cell(1, 'tags'), 'A,C');
    assert.equal(cell(1, 'owner'), 'tanaka');
    assert.equal(cell(1, 'dept'), 'sales');
    assert.equal(cell(1, 'startAt'), '2026-03-01T09:30:00Z');
    assert.equal(cell(2, 'title'), 'カンマ,引用符"の値', '引用符・コンマを保つ');
    assert.equal(cell(2, 'memo'), '1行目\r\n2行目,"引用"');
    assert.equal(cell(3, 'title'), "'=SUM(A1:A2)", '数式に見える文字列は先頭に \' を付ける');
    assert.equal(cell(3, 'amount'), '-50', '負の数値は \' を付けない');
    assert.equal(cell(3, 'memo'), "'+81-3-1234-5678");
    assert.equal(cell(4, 'code'), '00123', '先頭の 0 を保つ');
    assert.equal(cell(4, 'title'), "'-5度の注意");
    assert.equal(cell(4, 'owner'), 'tanaka,suzuki');
    assert.equal(cell(5, 'detail'), '2行', 'テーブルは親 CSV に行数だけ');
    assert.equal(cell(5, 'attach'), '見積書.pdf,a2.txt');
    const detail = parseCsv(zip.get('tables/detail.csv').toString('utf8'));
    assert.deepEqual(detail[0].slice(0, 3), ['$id', '$rowId', '$rowIndex']);
    assert.equal(detail.length, 3);
    assert.equal(detail[2][detail[0].indexOf('item')], '部品,B');
    assert.equal(detail[2][detail[0].indexOf('remark')], "'=\"x\"");
    assert.equal(detail[2][detail[0].indexOf('doc')], '');
    ok('CSV 出力: テーブル別 CSV・複数選択・ユーザー・組織・日時・改行・引用符・先頭 0・数式対策・負の数');
  });

  scenario('csv: 出力した CSV をそのまま取り込むと、取り込めない列を示して書き込み前に止める', async () => {
    await reset({ ...projectConfig(), currentApp: 105 });
    await appInput().fill('101');
    await pickAction('CSVを出力');
    await withOptions('csv-export', async dialog => { await dialog.getByRole('checkbox', { name: /で始まる文字列の先頭に/ }).uncheck(); });
    await confirmAndRun('CSVを出力');
    const zip = await downloadZip(0);
    // 取込はテーブルを扱わないため、テーブル付きのアプリの CSV は、そのままでは取り込めない
    await button('対象・条件を変更').click();
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    await importFile('export.csv', zip.get('records.csv'));
    await button('CSVを事前検査').click(); await idle();
    const text = await page.getByLabel('CSV事前検査結果', { exact: true }).innerText();
    assert.match(text, /システムフィールド（\$idなど）が含まれています/);
    const now = await state();
    assert.equal(importWrites(now).length, 0);
    ok('出力 CSV をそのまま取り込むと「$id などのシステムフィールドを除外してください」と書き込み前に止まる');
  });

  scenario('csv: 取込可能な列だけにした CSV の往復（既定の \' 付き・付けない出力・UTF-8 BOM・CRLF・先頭 0）', async () => {
    await reset({ ...projectConfig(), currentApp: 105 });
    await appInput().fill('101');
    await pickAction('CSVを出力');
    await withOptions('csv-export', async dialog => {
      await dialog.getByRole('combobox', { name: '改行コード', exact: true }).selectOption('crlf');
      await dialog.getByRole('checkbox', { name: /で始まる文字列の先頭に/ }).uncheck();
    });
    await confirmAndRun('CSVを出力');
    const zip = await downloadZip(0);
    const rows = parseCsv(zip.get('records.csv').toString('utf8'));
    const dropped = new Set(['$id', 'レコード番号', '作成者', '作成日時', '更新者', '更新日時', 'ステータス', '作業者', 'total', 'attach', 'detail']);
    const keep = rows[0].map((code, index) => (dropped.has(code) ? -1 : index)).filter(index => index >= 0);
    const importable = rows.map(row => csvLine(keep.map(index => row[index]))).join('\r\n');
    await button('対象・条件を変更').click();
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    await importFile('roundtrip.csv', Buffer.concat([Buffer.from('﻿'), Buffer.from(importable)]));
    await button('CSVを事前検査').click(); await idle();
    const precheck = await page.getByLabel('CSV事前検査結果', { exact: true }).innerText();
    assert.match(precheck, /App 105\n5件 \/ \d+フィールド \/ 検出した問題 0件/, precheck.slice(0, 400));
    await confirmAndRun('CSVからレコードを追加');
    assert.equal(dialogs.length, 1);
    assert.match(dialogs[0].message, /CSVから 1アプリの本番レコードへ追加します[\s\S]*App 105: 5件[\s\S]*追加したレコードは自動では取り消せません/);
    const now = await state();
    assert.equal(importWrites(now).length, 1);
    assert.ok(importWrites(now).every(w => w.body.records.length <= 100));
    const created = await recordsOf(105);
    assert.equal(created.length, 5);
    const source = await recordsOf(101);
    const byCode = records => Object.fromEntries(records.map(rec => [rec.code.value, rec]));
    const a = byCode(source), b = byCode(created);
    for (const code of Object.keys(a)) {
      for (const field of ['title', 'amount', 'memo', 'due', 'startAt', 'meet', 'category', 'priority', 'tags', 'skills', 'owner', 'dept', 'url']) {
        const left = JSON.stringify(a[code][field].value), right = JSON.stringify(b[code][field].value);
        if (field === 'owner' || field === 'dept') assert.equal(JSON.stringify((b[code][field].value || []).map(v => v.code)), JSON.stringify((a[code][field].value || []).map(v => v.code)), `${code}.${field}`);
        else if (field === 'title' || field === 'memo') assert.equal(b[code][field].value.replace(/\r\n/g, '\n'), a[code][field].value.replace(/\r\n/g, '\n'), `${code}.${field}`);
        else assert.equal(right === 'null' && left === '""' ? '""' : right, left, `${code}.${field}`);
      }
    }
    assert.ok(b['00123'], '先頭 0 の案件番号を保つ');
    assert.equal(b['00123'].amount.value, '1.50');
    ok('往復: 取込可能な列だけにした CSV（\' なし・CRLF・BOM）で、5 件が同じ値で取り込まれる（改行・引用符・先頭 0・複数選択・ユーザー・日時）');
  });

  scenario('csv: 既定の出力（数式対策の \' 付き）を取り込むと値に \' が残る — 仕様として案内しているか', async () => {
    await reset({ ...projectConfig(), currentApp: 105 });
    await appInput().fill('101');
    await pickAction('CSVを出力');
    await confirmAndRun('CSVを出力');
    const zip = await downloadZip(0);
    const rows = parseCsv(zip.get('records.csv').toString('utf8'));
    const keep = rows[0].map((code, index) => (['title', 'code', 'amount'].includes(code) ? index : -1)).filter(index => index >= 0);
    const importable = rows.map(row => csvLine(keep.map(index => row[index]))).join('\n');
    await button('対象・条件を変更').click();
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    await importFile('roundtrip.csv', importable);
    await confirmAndRun('CSVからレコードを追加');
    const created = await recordsOf(105);
    const formula = created.find(rec => rec.code.value === 'P-003');
    assert.equal(formula.title.value, "'=SUM(A1:A2)", '既定の出力を取り込むと、先頭の \' が値として残る');
    // CSV 出力側の注記で「取込用の互換形式ではない」と案内していることを確かめる
    await button('対象・条件を変更').click();
    await pickAction('CSVを出力');
    await page.getByRole('button', { name: '「CSV出力」の説明を表示', exact: true }).click();
    const help = await page.locator('.kus-lp__help-pop:visible').innerText();
    assert.match(help, /CSV取込用の互換形式ではありません/);
    ok('既定の出力（\' 付き）は取込用ではないと CSV 出力の説明に書いてある。取り込むと先頭の \' が値に残る（仕様）');
  });

  // ---------------------------------------------------------------------------
  // CSV 取込の事前検査と、kintone が拒否する行
  // ---------------------------------------------------------------------------
  const header = 'title,code,amount,due,startAt,priority,owner';
  const validRow = (n, extra = {}) => csvLine([extra.title ?? `案件${n}`, extra.code ?? `N-${String(n).padStart(4, '0')}`, extra.amount ?? '100', extra.due ?? '2026-04-01', extra.startAt ?? '2026-04-01T09:00:00Z', extra.priority ?? '中', extra.owner ?? 'tanaka']);

  scenario('import: 存在しない日付・日時など kintone が拒否する行を、書き込み前の事前検査で見つける', async () => {
    await reset({ currentApp: 105 });
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    const badDates = [header, validRow(1), validRow(2, { due: '2026-02-30' }), validRow(3, { startAt: '2026-13-01T09:00:00Z' }), validRow(4, { startAt: '2026-04-01T25:00:00Z' }), validRow(5, { due: '2026-04-31' })].join('\n');
    await importFile('dates.csv', badDates);
    await button('CSVを事前検査').click(); await idle();
    const text = await page.getByLabel('CSV事前検査結果', { exact: true }).innerText();
    for (const row of [3, 4, 5, 6]) assert.match(text, new RegExp(`${row}行目`), `${row}行目を検出`);
    assert.match(text, /検出した問題 4件/);
    assert.equal(importWrites(await state()).length, 0);
    // 閏日は有効
    await importFile('leap.csv', [header, validRow(1, { due: '2028-02-29' }), validRow(2, { due: '2026-12-31', startAt: '2026-04-01T23:59:59+09:00' })].join('\n'));
    await button('CSVを事前検査').click(); await idle();
    assert.match(await page.getByLabel('CSV事前検査結果', { exact: true }).innerText(), /検出した問題 0件/);
    ok('事前検査: 2026-02-30・13 月・25 時・4/31 を検出し、閏日・時差つきの日時は通す');
  });

  scenario('import: 事前検査で見つけられない拒否（既存の案件番号と重複・存在しないユーザー）は、100 件の途中でも確定済み・未処理の件数が実際と合う', async () => {
    await reset({ currentApp: 105, records: [{ appId: 105, values: { title: '既存', code: 'N-0150', priority: '中' } }] });
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    const lines = [header];
    for (let i = 1; i <= 250; i += 1) lines.push(validRow(i));
    await importFile('many.csv', lines.join('\n'));
    await button('CSVを事前検査').click(); await idle();
    assert.match(await page.getByLabel('CSV事前検査結果', { exact: true }).innerText(), /250件.*検出した問題 0件/);
    await confirmAndRun('CSVからレコードを追加');
    const now = await state();
    const writes = importWrites(now);
    assert.deepEqual(writes.map(w => w.body.records.length), [100, 100], '100 件ずつ。3 回目は送らない');
    assert.deepEqual(writes.map(w => !!w.rejected), [false, true]);
    const created = await recordsOf(105);
    assert.equal(created.length, 1 + 100, '確定済みは 100 件（既存 1 件を含む）');
    const log = `${await statusText()}\n${await logText()}`;
    assert.match(log, /確定済み: 100件 \/ 失敗チャンク: 101～200件目 \/ 未処理: 150件（全250件）/);
    assert.match(log, /CSV 151行目・案件番号［code］: 値がほかのレコードと重複しています/, '拒否された行を CSV の行番号で示す');
    assert.match(await statusText(), /1アプリ中1アプリで失敗しました|エラー/);
    ok('250 件の取込で 2 回目の 100 件が拒否 → 確定済み 100・未処理 150 が実際（作成 100 件）と一致し、CSV の行番号で原因を示す');
    // 存在しないユーザー
    await button('対象・条件を変更').click();
    await importFile('user.csv', [header, validRow(1001), validRow(1002, { owner: 'nobody' })].join('\n'));
    await confirmAndRun('CSVからレコードを追加');
    assert.match(`${await statusText()}\n${await logText()}`, /CSV 3行目・担当者［owner］: 存在しないコードです: nobody/);
    assert.equal((await recordsOf(105)).length, 101, '失敗したチャンクは全体が取り消される');
    ok('存在しないユーザーの行は 100 件の塊ごと取り消され、行番号とフィールドを示す');
  });

  scenario('import: Shift_JIS の CSV は書き込み前に止め、UTF-8（BOM あり・CRLF・引用符内の改行）は取り込める', async () => {
    await reset({ currentApp: 105 });
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    // Shift_JIS で「あ」(0x82 0xA0) を含む CSV
    const sjis = Buffer.concat([Buffer.from('title,code\n'), Buffer.from([0x82, 0xa0]), Buffer.from(',S-1\n')]);
    await importFile('sjis.csv', sjis);
    await confirmAndRun('CSVからレコードを追加');
    assert.match(`${await statusText()}\n${await logText()}`, /CSVをUTF-8として読み取れず、文字化け（�）を検出しました/);
    assert.equal(importWrites(await state()).length, 0);
    await button('対象・条件を変更').click();
    const utf8 = Buffer.concat([Buffer.from('﻿'), Buffer.from('title,code,memo\r\n"改行\r\nと,カンマ",U-1,"引用""符"\r\n日本語,U-2,\r\n')]);
    await importFile('utf8.csv', utf8);
    await confirmAndRun('CSVからレコードを追加');
    const created = await recordsOf(105);
    assert.equal(created.length, 2);
    assert.equal(created[0].title.value, '改行\r\nと,カンマ');
    assert.equal(created[0].memo.value, '引用"符');
    assert.equal(created[1].title.value, '日本語');
    ok('Shift_JIS は書き込み前に止まり、UTF-8 BOM + CRLF + 引用符内の改行は正しく取り込まれる');
  });

  scenario('import: 通信エラー（応答が届かない）のあと、勝手に再送して二重登録しない', async () => {
    await reset({ currentApp: 105 });
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    const lines = [header];
    for (let i = 1; i <= 3; i += 1) lines.push(validRow(i));
    await importFile('three.csv', lines.join('\n'));
    // サーバー側では確定したが、応答が届かなかった
    await page.evaluate(() => { window.__k.failNext.push({ kind: 'network-after-commit', match: '/records.json' }); });
    await confirmAndRun('CSVからレコードを追加');
    const created = await recordsOf(105);
    const now = await state();
    const posts = importWrites(now).filter(w => !w.injectedFailure);
    if (created.length > 3) {
      finding('import-retry-duplicates', 'critical', '通信エラー後の自動再送で、同じ 3 件が二重に登録された（POST /records.json は冪等ではない）', { created: created.length, posts: posts.length });
    }
    assert.equal(created.length, 3, '確定済みの 3 件を二重登録しない');
    assert.equal(posts.length, 1, '確定した 1 回だけ。応答が届かなかったあとに再送しない');
    const text = `${await statusText()}\n${await logText()}`;
    assert.match(text, /応答が届かなかったため/, '応答が届かなかったことを示す');
    assert.match(text, /kintone に書き込まれたかどうか確認できません。再実行する前に、kintone 画面で対象アプリのレコード件数を確認してください/, '再実行する前に kintone で確認するよう案内');
    assert.match(await statusText(), /書き込まれたか未確認/);
    ok('応答が届かなかった登録は再送せず、書き込まれた可能性を示して件数の確認を促す（二重登録なし）');
  });

  // ---------------------------------------------------------------------------
  // ステータス更新
  // ---------------------------------------------------------------------------
  const statusRecords = (n, state = '未処理', amount = '2000') => Array.from({ length: n }, (_, i) => ({ appId: 101, values: { title: `S${i + 1}`, code: `S-${String(i + 1).padStart(4, '0')}`, amount, priority: '中', ステータス: state } }));
  const statusInputs = () => ({ query: activeTab().getByPlaceholder('条件 (例: status = "新規")', { exact: true }), action: activeTab().getByPlaceholder('アクション名', { exact: true }) });

  scenario('status: 作業者の指定・revision を付けた 100 件ずつの更新・同名アクション', async () => {
    await reset({ records: statusRecords(250), currentApp: 101 });
    await appInput().fill('101');
    await pickAction('ステータスを一括更新');
    const { query, action } = statusInputs();
    await query.fill('ステータス in ("未処理")');
    await action.fill('申請');
    // 次の作業者の指定が必要な遷移: 指定しないと kintone が拒否する（取得した対象は何も変わらない）
    await confirmAndRun('ステータスを一括更新');
    assert.equal(dialogs.length, 1);
    assert.match(dialogs[0].message, /App 101 の 250件 にアクション「申請」を実行します[\s\S]*本番レコードのステータスが変わり、自動では元に戻せません/);
    assert.match(`${await statusText()}\n${await logText()}`, /次の作業者を指定してください/);
    let now = await state();
    assert.equal(statusWrites(now).length, 1, '最初の 100 件が拒否されたら次は送らない');
    assert.equal((await recordsOf(101)).filter(r => r['ステータス'].value !== '未処理').length, 0);
    ok('作業者の指定が必要な遷移を指定なしで実行すると、最初の 100 件で拒否され何も変わらない');
    await button('対象・条件を変更').click();
    await withOptions('status', async dialog => { await dialog.getByPlaceholder('次の作業者ログイン名（必要な場合）', { exact: true }).fill('reviewer'); });
    await page.evaluate(() => { window.__k.writes.length = 0; });
    await confirmAndRun('ステータスを一括更新');
    now = await state();
    const writes = statusWrites(now);
    assert.deepEqual(writes.map(w => w.body.records.length), [100, 100, 50]);
    assert.ok(writes.every(w => w.body.records.every(r => r.action === '申請' && r.assignee === 'reviewer' && /^\d+$/.test(String(r.revision)) && Number.isInteger(r.id))));
    assert.equal(writes[0].body.app, '101');
    const after = await recordsOf(101);
    assert.equal(after.filter(r => r['ステータス'].value === '申請中').length, 250);
    assert.ok(after.every(r => r.$revision.value === '2'));
    assert.match(await statusText(), /250件のステータスを更新しました（App 101）/);
    assert.equal(await statusTone(), 'ok');
    ok('250 件を 100 件ずつ（100/100/50）、revision と作業者つきで更新し、完了メッセージに件数を出す');
  });

  scenario('status: 取得後に別の更新が入った（revision 競合）レコードを含む塊は、上書きせず競合を知らせる', async () => {
    await reset({ records: statusRecords(150, '申請中'), currentApp: 101 });
    await appInput().fill('101');
    await pickAction('ステータスを一括更新');
    const { query, action } = statusInputs();
    await query.fill('ステータス in ("申請中")');
    await action.fill('承認');
    // 2 つ目の塊（101〜150 件目）を送る前に、別の利用者が 1 件更新した
    await page.evaluate(() => {
      const original = window.kintone.api;
      let puts = 0;
      window.kintone.api = Object.assign(async (url, method, params) => {
        if (method === 'PUT' && /status\.json/.test(url)) { puts += 1; if (puts === 2) window.__k.bumpBeforeStatus = [120]; }
        return original(url, method, params);
      }, { url: v => v });
    });
    await confirmAndRun('ステータスを一括更新');
    const log = `${await statusText()}\n${await logText()}`;
    assert.match(log, /取得後に別の更新が入ったため中止しました（revision 競合）/);
    assert.match(log, /確定済み: 100件 \/ 失敗チャンク: 101～150件目 \/ 未処理: 50件（全150件）/);
    const after = await recordsOf(101);
    assert.equal(after.filter(r => r['ステータス'].value === '承認済').length, 100, '競合した塊は更新しない');
    assert.equal(after.find(r => r.$id.value === '120').$revision.value, '2', '別の利用者の更新を上書きしない');
    // 再実行: 条件にステータスを含めているので、確定済みの 100 件は対象に入らず、二重に進めない
    await button('対象・条件を変更').click();
    await page.evaluate(() => { window.__k.writes.length = 0; });
    await confirmAndRun('ステータスを一括更新');
    const second = statusWrites(await state());
    assert.deepEqual(second.map(w => w.body.records.length), [50], '残り 50 件だけ送る');
    assert.equal((await recordsOf(101)).filter(r => r['ステータス'].value === '承認済').length, 150);
    ok('revision 競合の塊は更新せず原因を示し、再実行は未処理の 50 件だけ（二重に進めない）');
  });

  scenario('status: 同名アクションは遷移元で区別でき、API で指定できない重複は選べない', async () => {
    await reset({ records: [...statusRecords(2, '申請中'), ...statusRecords(1, '承認済').map(r => ({ ...r, values: { ...r.values, code: 'S-9001' } }))], currentApp: 101 });
    await appInput().fill('101');
    await pickAction('ステータスを一括更新');
    await button('アクション読込').click(); await idle();
    const select = page.getByRole('combobox', { name: '取得したプロセスアクション', exact: true });
    const options = await select.locator('option').evaluateAll(list => list.map(o => ({ text: o.textContent, disabled: o.disabled })));
    assert.equal(options.length, 8, '--（未選択）+ 7 アクション');
    assert.equal(options.filter(o => /差し戻し/.test(o.text)).length, 2, '遷移元が違う同名アクションは 2 つ表示');
    assert.equal(options.filter(o => /同名重複のため指定不可/.test(o.text) && o.disabled).length, 2, '同じ遷移元の同名アクションは選べない');
    await select.selectOption({ index: options.findIndex(o => /差し戻し \(承認済/.test(o.text)) });
    await button('選択アクションの対象条件を入力').click();
    assert.equal(await statusInputs().query.inputValue(), 'ステータス in ("承認済")');
    assert.match(await page.locator('.kus-lp__note, .kus-lp__small').filter({ hasText: '次の作業者' }).first().innerText(), /次の作業者: 候補から1人を選択 \/ ユーザー: reviewer \/ ユーザー: approver/, '次の作業者の候補を示す');
    await withOptions('status', async dialog => { await dialog.getByPlaceholder('次の作業者ログイン名（必要な場合）', { exact: true }).fill('reviewer'); });
    await confirmAndRun('ステータスを一括更新');
    const after = await recordsOf(101);
    assert.deepEqual(after.map(r => r['ステータス'].value), ['申請中', '申請中', '申請中'], '承認済 → 申請中（差し戻し）。申請中の 2 件は対象外');
    ok('同名アクション「差し戻し」は遷移元ごとに区別でき、遷移元の条件がクエリに入る。重複する「確認」は選べない');
    // 手入力で重複アクションを実行すると kintone が拒否する
    await button('対象・条件を変更').click();
    await statusInputs().query.fill('ステータス in ("未処理")');
    await statusInputs().action.fill('確認');
    await page.evaluate(() => window.__k.addRecord(101, { title: 'X', code: 'X-1', priority: '中' }));
    await confirmAndRun('ステータスを一括更新');
    assert.match(`${await statusText()}\n${await logText()}`, /アクション名「確認」が重複しているため指定できません/);
    ok('手入力した重複アクション名は kintone の拒否理由を示す');
  });

  scenario('status: 途中失敗後の再実行で二重に進めない（条件を付けない場合は kintone が拒否する）', async () => {
    const records = statusRecords(130, '申請中');
    records[110].values.amount = '500'; // 承認の実行条件（amount >= 1000）を満たさない
    await reset({ records, currentApp: 101 });
    await appInput().fill('101');
    await pickAction('ステータスを一括更新');
    // 条件なし（全件）で承認を実行 → 2 つ目の塊が拒否される
    await statusInputs().action.fill('承認');
    await confirmAndRun('ステータスを一括更新');
    assert.match(`${await statusText()}\n${await logText()}`, /確定済み: 100件 \/ 失敗チャンク: 101～130件目 \/ 未処理: 30件（全130件）/);
    assert.match(`${await statusText()}\n${await logText()}`, /レコードID 111・.*実行条件を満たしていません|レコードID 111/);
    await button('対象・条件を変更').click();
    await page.evaluate(() => { window.__k.writes.length = 0; });
    // 同じ操作をもう一度実行 → 確定済みの 100 件は「申請中」ではないので kintone が拒否し、最初の塊で止まる（二重に進まない）
    await confirmAndRun('ステータスを一括更新');
    const writes = statusWrites(await state());
    assert.equal(writes.length, 1);
    assert.equal(writes[0].rejected, true);
    const after = await recordsOf(101);
    assert.equal(after.filter(r => r['ステータス'].value === '承認済').length, 100);
    assert.ok(after.filter(r => r['ステータス'].value === '承認済').every(r => r.$revision.value === '2'), '二重に進めていない');
    ok('条件なしで再実行しても、確定済みのレコードは kintone が拒否し二重に進まない（revision は 2 のまま）');
  });

  // ---------------------------------------------------------------------------
  // アプリ間コピー
  // ---------------------------------------------------------------------------
  scenario('copy: 型の違い・テーブル・添付・必須の取り違えを、書き込み前に示す', async () => {
    await reset({ ...projectConfig(), currentApp: 102 });
    await appInput().fill('102');
    await pickAction('レコードをコピー');
    await activeTab().getByPlaceholder('コピー元アプリID', { exact: true }).fill('101');
    await button('フィールド互換性を事前確認').click(); await idle();
    const preview = await page.getByLabel('コピー互換性確認結果', { exact: true }).innerText();
    assert.match(preview, /型不一致のため除外[\s\S]*区分［category］\(DROP_DOWN → SINGLE_LINE_TEXT\)/);
    assert.match(preview, /detail\.qty\(NUMBER → SINGLE_LINE_TEXT\)/);
    assert.match(preview, /システム・添付・自動計算のため除外[\s\S]*attach/);
    await confirmAndRun('レコードをコピー');
    assert.equal(dialogs.length, 1);
    assert.match(dialogs[0].message, /コピー元 App 101 → コピー先 App 102/);
    assert.match(dialogs[0].message, /5件を本番レコードとして新規追加します（既存レコードは変更しません）/);
    assert.match(dialogs[0].message, /添付ファイルはコピーされません: .*attach.*detail\.doc.*添付ありレコード 1件/);
    const now = await state();
    const writes = importWrites(now);
    assert.deepEqual(writes.map(w => w.body.records.length), [5]);
    const sent = writes[0].body.records;
    const json = JSON.stringify(sent);
    assert.ok(!/fileKey|\$id|\$revision|"レコード番号"|"作成者"|"ステータス"|"total"/.test(json), '添付・システム項目・計算項目を送らない');
    assert.ok(sent.every(r => !('category' in r) && !('attach' in r)), '型が違う・添付のフィールドは送らない');
    for (const rec of sent) for (const row of (rec.detail && rec.detail.value) || []) assert.ok(!('id' in row), 'サブテーブルの新規行に id を含めない');
    assert.equal(sent[4].detail.value.length, 2);
    ok('型の違い・添付・システム項目を除いて 5 件をコピー。サブテーブルの行に id を含めず、fileKey も送らない');
  });

  scenario('copy: コピー先に必須のフィールドがあり、コピー元から値が入らないとき、書き込み前に止める', async () => {
    const apps = [...ctx.APPS.filter(app => app.id !== 102), { id: 102, name: '案件コピー先', fields: { title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: true }, region: { type: 'SINGLE_LINE_TEXT', label: '地域', required: true } } }];
    await reset({ ...projectConfig(), apps, currentApp: 102 });
    await appInput().fill('102');
    await pickAction('レコードをコピー');
    await activeTab().getByPlaceholder('コピー元アプリID', { exact: true }).fill('101');
    await button('フィールド互換性を事前確認').click(); await idle();
    assert.match(await page.getByLabel('コピー互換性確認結果', { exact: true }).innerText(), /コピー先の必須フィールドに値が入らない \(1件・すべてのレコードが登録できません\): 地域［region］/);
    assert.equal(await page.locator('.kus-lp__status').getAttribute('data-tone'), 'warn', '事前確認は警告色');
    await confirmAndRun('レコードをコピー');
    const now = await state();
    const writes = importWrites(now);
    if (dialogs.length && writes.length) {
      finding('copy-required-target-field', 'high', 'コピー先の必須フィールドにコピー元から値が入らないのに、確認を出して書き込みを試みた（全件が kintone に拒否される）', { writes: writes.length, dialog: dialogs[0].message.slice(0, 200) });
    }
    assert.equal(dialogs.length, 0, '書き込み前に止めるので実行確認は出さない');
    assert.equal(writes.length, 0, '書き込みは行わない');
    assert.match(`${await statusText()}\n${await logText()}`, /必須フィールドに、コピー元から値が入らないため、すべてのレコードが登録できません[\s\S]*対象: 地域［region］/);
    ok('コピー先の必須フィールドに値が入らないときは、書き込み前に対象フィールドを示して止める');
  });

  scenario('copy: 250 件を 100 件ずつ追加し、途中で拒否されたら確定済み・未処理を示す', async () => {
    const records = Array.from({ length: 250 }, (_, i) => ({ appId: 101, values: { title: `C${i + 1}`, code: `C-${String(i + 1).padStart(4, '0')}`, amount: '1', priority: '中' } }));
    // コピー先の案件番号は重複禁止にして、2 つ目の塊の途中で既存と重複させる
    const apps = [...ctx.APPS.filter(app => app.id !== 102), { id: 102, name: '案件コピー先', fields: { title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: true }, code: { type: 'SINGLE_LINE_TEXT', label: '案件番号', unique: true }, amount: { type: 'NUMBER', label: '金額' } } }];
    await reset({ records: [...records, { appId: 102, values: { title: '既存', code: 'C-0150' } }], apps, currentApp: 102 });
    await appInput().fill('102');
    await pickAction('レコードをコピー');
    await activeTab().getByPlaceholder('コピー元アプリID', { exact: true }).fill('101');
    await confirmAndRun('レコードをコピー');
    const now = await state();
    assert.deepEqual(importWrites(now).map(w => w.body.records.length), [100, 100]);
    const log = `${await statusText()}\n${await logText()}`;
    assert.match(log, /確定済み: 100件 \/ 失敗チャンク: 101～200件目 \/ 未処理: 150件（全250件）/);
    assert.match(log, /コピー元レコードID 150・案件番号［code］: 値がほかのレコードと重複しています/);
    assert.equal((await recordsOf(102)).length, 101);
    ok('コピー: 100 件ずつ追加し、拒否された塊の原因をコピー元のレコード ID で示し、確定済み・未処理が実際と一致');
  });

  // ---------------------------------------------------------------------------
  // 無応答の書き込み（T5 の残り）
  // ---------------------------------------------------------------------------
  scenario('hang: 書き込みの応答が無いとき、中止を押して 10 秒後に待っていることを案内する', async () => {
    await reset({ currentApp: 105 });
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    await importFile('many.csv', [header, ...Array.from({ length: 150 }, (_, i) => validRow(i + 1))].join('\n'));
    await page.evaluate(() => { window.__k.hangWrites = true; });
    await button('内容を確認する').click();
    await button('CSVからレコードを追加').click();
    await page.waitForFunction(() => window.__k.writes.some(w => w.hung), null, { timeout: 30000 });
    await button('処理を中止').click();
    const before = await statusText();
    assert.match(before, /中止しています/, '中止を押した直後は「中止しています」');
    const started = Date.now();
    await page.waitForFunction(() => /書き込み中のリクエストの応答を待っています/.test(document.querySelector('.kus-lp__status-text')?.textContent || ''), null, { timeout: 30000 });
    const waited = (Date.now() - started) / 1000;
    assert.ok(waited >= 8 && waited <= 14, `案内は約 10 秒後に出る（${waited.toFixed(1)} 秒）`);
    assert.match(await statusText(), /応答がない場合は kintone 画面で結果を確認してください/);
    assert.equal(await page.locator('[aria-label="処理を中止"]').isVisible(), true, '応答が無い間は中止ボタンが残る（押しても止まらない）');
    // 応答が返ったら、次のリクエストの前で止まる
    await page.evaluate(() => window.__k.release());
    await idle();
    assert.match(await statusText(), /^中止しました（100\/150 件を処理、残り 50 件は未実行）/, '応答が返ったら、次の塊は送らずに止まる');
    assert.equal(importWrites(await state()).filter(w => !w.hung).length, 0, '2 つ目の塊は送らない');
    ok(`無応答の書き込み: 中止の ${waited.toFixed(1)} 秒後に「応答を待っています。kintone 画面で結果を確認」を案内し、応答が返ると中止が完了する`);
    await shot('hang-write-guidance');
  }, { slow: true });

  // ---------------------------------------------------------------------------
  // 共通: 二重クリック・画面幅
  // ---------------------------------------------------------------------------
  scenario('common: 実行ボタンの二重クリックで書き込みを重複実行しない', async () => {
    await reset({ currentApp: 105, latency: 150 });
    await appInput().fill('105');
    await pickAction('CSVからレコードを追加');
    await importFile('two.csv', [header, validRow(1), validRow(2)].join('\n'));
    await button('内容を確認する').click();
    const run = button('CSVからレコードを追加');
    await run.click();
    await run.click({ force: true, noWaitAfter: true }).catch(() => {});
    await idle();
    const now = await state();
    assert.equal(importWrites(now).length, 1, '1 回だけ書き込む');
    assert.equal((await recordsOf(105)).length, 2);
    assert.equal(dialogs.length, 1);
    ok('二重クリックしても書き込み・確認は 1 回');
  });

  scenario('common: 320〜1440px で横にはみ出さない（操作・確認・結果）', async () => {
    await reset({ ...projectConfig(), currentApp: 101 });
    await appInput().fill('101');
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const action of ['CSVを出力', 'CSVからレコードを追加', 'ステータスを一括更新', '添付ファイルを保存', 'レコードをコピー', 'バックアップを保存', '重複・未入力を検査']) {
        await pickAction(action);
        const overflow = await page.locator('.kus-wf-canvas').evaluate(el => el.scrollWidth - el.clientWidth);
        assert.ok(overflow <= 1, `${action} の横はみ出し ${width}px: ${overflow}`);
      }
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await pickAction('バックアップを保存');
    await button('内容を確認する').click();
    assert.ok(await page.locator('.kus-wf-canvas').evaluate(el => el.scrollWidth - el.clientWidth) <= 1, '確認画面（320px）');
    await shot('confirm-320');
    ok('7 つの操作・確認画面が 320〜1440px で横にはみ出さない');
  });
}

module.exports = { register };
