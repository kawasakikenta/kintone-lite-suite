'use strict';

const assert = require('node:assert/strict');

// 添付ファイル保存・バックアップが ZIP の上限（classic ZIP: 4GB 未満・65,535 件）を超えるときの扱い。
// ファイル本体は小さいまま、kintone が示すサイズ（size）だけを大きくして、分割の位置を決めさせる。
const GB = 1e9;
const fileValue = (key, size, name = `${key}.bin`) => ({ fileKey: key, name, size: String(size), contentType: 'application/octet-stream' });

function register(scenario, ctx) {
  const { button, idle, statusText, statusTone, logText, pickAction, appInput, withOptions, reset, confirmAndRun, state, downloadZip, downloadNames, ok, page, shot, panelText, stage } = ctx;

  const attachConfig = records => ({
    records: records.map((values, index) => ({ appId: 104, values: { title: `R${index + 1}`, ...values } })),
    files: Object.fromEntries(records.flatMap(values => [
      ...(values.attach || []),
      ...((values.detail || []).flatMap(row => (row.value.doc && row.value.doc.value) || []))
    ]).map(file => [file.fileKey, { text: `body-${file.fileKey}` }])),
    currentApp: 104
  });
  const attach = (...files) => ({ attach: files });
  const withDoc = (files, docs) => ({ attach: files, detail: [{ id: '1', value: { item: { type: 'SINGLE_LINE_TEXT', value: '図面' }, doc: { type: 'FILE', value: docs } } }] });
  // 各レコードの添付の合計: 1=1.2GB / 2=1.7GB / 3=2.0GB / 4=1.2GB / 5=10B（+ 5GB が 1 件）。2GB 弱を 1 つの ZIP の目安にしているため 4 つの ZIP になる。
  const manyRecords = () => attachConfig([
    attach(fileValue('k1', 1.2 * GB)),
    withDoc([fileValue('k2', 1.2 * GB)], [fileValue('k2d', 0.5 * GB)]),
    attach(fileValue('k3a', 1.0 * GB), fileValue('k3b', 1.0 * GB)),
    attach(fileValue('k4', 1.2 * GB)),
    attach(fileValue('k5big', 5 * GB), fileValue('k5b', 10))
  ]);

  scenario('zip: バックアップの添付が ZIP の目安を超える前に、レコード単位で分けて保存する', async () => {
    await reset(manyRecords());
    await appInput().fill('104');
    await pickAction('バックアップを保存');
    await withOptions('backup', async dialog => {
      await dialog.getByPlaceholder('空欄で自動命名（レコードバックアップ_アプリ_日時.zip）', { exact: true }).fill('bk');
      await dialog.getByRole('checkbox', { name: 'コメントも保存', exact: true }).uncheck();
    });
    await button('内容を確認する').click();
    const confirmText = await stage(1).innerText();
    assert.match(confirmText, /ZIPの分割[\s\S]*_part1[\s\S]*最後の ZIP/, '確認画面に ZIP の分割を示す');
    await button('バックアップを保存').click();
    await idle();
    const names = await downloadNames();
    assert.deepEqual(names, ['bk_part1.zip', 'bk_part2.zip', 'bk_part3.zip', 'bk_part4.zip']);
    const now = await state();
    // 上限を超える 1 件(k5big)は取得しない
    assert.equal(now.fetches, 7 - 0, '取得したファイル数（上限を超える 1 件は取得しない）');
    assert.deepEqual(now.violations, []);
    const zips = [];
    for (let i = 0; i < names.length; i += 1) zips.push(await downloadZip(i));
    const entries = zip => [...zip.keys()].filter(name => name.startsWith('attachments/') && !name.endsWith('/'));
    assert.deepEqual(zips.map(zip => entries(zip).length), [1, 2, 2, 2], '1 レコードの添付は同じ ZIP に入る');
    const recordsOfZip = zip => [...new Set(entries(zip).map(name => name.split('/')[1]))];
    assert.deepEqual(zips.map(recordsOfZip), [['record_1'], ['record_2'], ['record_3'], ['record_4', 'record_5']]);
    for (const [index, zip] of zips.entries()) {
      const manifest = JSON.parse(zip.get('manifest.json').toString());
      assert.equal(manifest.split.partNumber, index + 1);
      assert.equal(manifest.split.partCount, 4);
      assert.deepEqual(manifest.split.parts.map(part => part.fileName), ['bk_part1.zip', 'bk_part2.zip', 'bk_part3.zip', 'bk_part4.zip']);
    }
    assert.equal(zips[0].has('records.json'), false, '最後以外の ZIP にはレコードを入れない');
    assert.equal(zips[3].has('records.json') && zips[3].has('records.csv'), true, 'レコードは最後の ZIP');
    const last = JSON.parse(zips[3].get('manifest.json').toString());
    assert.equal(last.recordCount, 5);
    assert.equal(last.fileCount, 7);
    assert.equal(last.attachmentSummary.unsavedCount, 1);
    assert.equal(last.unsavedAttachments[0].fileName, 'k5big.bin');
    assert.match(last.unsavedAttachments[0].reason, /ZIP の上限/);
    assert.equal(last.split.overall.savedCount, 7);
    assert.equal(last.split.overall.unsavedCount, 1);
    assert.match(zips[3].get('download_errors.txt').toString(), /record 5\tk5big\.bin\t1 ファイルが ZIP の上限/);
    assert.match(await statusText(), /バックアップを保存しました（レコード 5件・添付 7件・4個のZIPに分けて保存）/);
    assert.match(await statusText(), /ZIPの上限で保存できなかった添付 1/);
    assert.equal(await statusTone(), 'warn', '保存できなかった添付があるので警告色');
    assert.match(await statusText(), /ZIP 4個のダウンロードを依頼しました/);
    await shot('zip-backup-split');
    ok('バックアップ: 4 つの ZIP に分け、レコードは最後・上限を超える 1 件だけ理由つきで記録・警告色・確認画面と完了メッセージに分割を示す');
  });

  scenario('zip: 添付ファイル保存は ZIP ごとに manifest と download_errors.txt に分割と未保存を書く', async () => {
    await reset(manyRecords());
    await appInput().fill('104');
    await pickAction('添付ファイルを保存');
    await page.getByRole('textbox', { name: '添付フィールドコード', exact: true }).fill('attach');
    await withOptions('attach', async dialog => { await dialog.getByPlaceholder('空欄で自動命名（添付ファイル_アプリ_日時.zip）', { exact: true }).fill('files'); });
    await confirmAndRun('添付ファイルを保存');
    const names = await downloadNames();
    assert.deepEqual(names, ['files_part1.zip', 'files_part2.zip', 'files_part3.zip', 'files_part4.zip'], '添付フィールド attach だけ（テーブル内の資料は対象外）');
    const zips = [];
    for (let i = 0; i < names.length; i += 1) zips.push(await downloadZip(i));
    const manifests = zips.map(zip => JSON.parse(zip.get('manifest.json').toString()));
    assert.deepEqual(manifests.map(m => m.savedCount), [1, 1, 2, 2]);
    assert.equal(manifests[3].split.overall.unsavedCount, 1);
    assert.equal(manifests[3].unsaved.length, 1);
    assert.match(zips[3].get('download_errors.txt').toString(), /ZIP の上限のため保存できなかった添付ファイル 1件/);
    assert.match(zips[0].get('manifest.json').toString(), /"state": "pending"/, '最初の ZIP の時点では、後の ZIP は予定として載る');
    assert.match(await statusText(), /添付ファイル 6件を保存しました（4個のZIPに分けて保存）（ZIPの上限で保存できなかった添付 1件）/);
    assert.equal(await statusTone(), 'warn');
    ok('添付ファイル保存: 4 つの ZIP・各 manifest に分割（予定と結果）・未保存の理由・警告色');
  });

  scenario('zip: 分割の途中で中止すると、保存済みの ZIP と保存していない ZIP を示す', async () => {
    await reset({ ...manyRecords(), latency: 300 });
    await appInput().fill('104');
    await pickAction('添付ファイルを保存');
    await page.getByRole('textbox', { name: '添付フィールドコード', exact: true }).fill('attach');
    await button('内容を確認する').click();
    await button('添付ファイルを保存').click();
    // 1 つ目の ZIP の保存を待ってから中止する
    await page.waitForFunction(() => window.__k.downloads.length >= 1, null, { timeout: 30000 });
    await button('処理を中止').click();
    await idle();
    const text = await statusText();
    assert.match(text, /^中止しました（\d\/5 件を処理、残り \d 件は未実行）/);
    const log = await logText();
    assert.match(log, /保存済みの ZIP: .*_part1\.zip（1個）。中断した ZIP（part \d）と以降は保存していません/);
    assert.equal((await downloadNames()).length, 1, '中止後に ZIP を追加で保存しない');
    ok('添付ファイル保存: 中止のとき保存済みの ZIP と未保存の ZIP を示す');
  });

  scenario('zip: 添付が 1 件も無い・全件取得失敗のときは ZIP を作らない（従来どおり）', async () => {
    await reset({ ...attachConfig([attach(fileValue('x1', 10))]), fileStatusOverride: null });
    await page.evaluate(() => { window.__k.fileStatus.x1 = 403; });
    await appInput().fill('104');
    await pickAction('添付ファイルを保存');
    await page.getByRole('textbox', { name: '添付フィールドコード', exact: true }).fill('attach');
    await confirmAndRun('添付ファイルを保存');
    assert.deepEqual(await downloadNames(), []);
    assert.match(await logText(), /添付ファイルを1件も取得できませんでした（失敗 1件）/);
    ok('添付ファイル保存: 全件取得失敗では ZIP を作らずエラー');
  });

  scenario('zip: 複数アプリはアプリごとの ZIP を続けて保存し、依頼した数と名前を示す', async () => {
    await reset({
      ...attachConfig([attach(fileValue('m1', 10))]),
      apps: [...ctx.APPS, { id: 106, name: '添付の多いアプリ2', fields: { title: { type: 'SINGLE_LINE_TEXT', label: '件名' }, attach: { type: 'FILE', label: '添付' } } }],
      records: [{ appId: 104, values: { title: 'a', attach: [fileValue('m1', 10)] } }, { appId: 106, values: { title: 'b', attach: [fileValue('m2', 10)] } }],
      files: { m1: { text: 'x' }, m2: { text: 'y' } }
    });
    await appInput().fill('104,106');
    await pickAction('添付ファイルを保存');
    await page.getByRole('textbox', { name: '添付フィールドコード', exact: true }).fill('attach');
    await button('内容を確認する').click();
    assert.match(await stage(1).innerText(), /2アプリ分のZIPを、アプリごとに別々のファイルとして保存します/);
    await button('添付ファイルを保存').click();
    await idle();
    const names = await downloadNames();
    assert.equal(names.length, 2);
    const text = await statusText();
    assert.match(text, /2アプリで計 2件の添付ファイルを保存しました/);
    assert.match(text, /ZIP 2個のダウンロードを依頼しました/);
    assert.match(text, /ダウンロード一覧に 2 個そろっているか/);
    assert.equal(await statusTone(), 'ok');
    ok('複数アプリ: 2 つの ZIP・依頼した数と名前・ダウンロード一覧との照合の案内');
  });

  scenario('zip: 添付 4,000 件の取得と保存（実ブラウザ・件数の上限 65,535 の境界は単体テスト）', async () => {
    // 65,535 件の境界は単体テスト（zip-split.test.ts）で確かめる。ここでは 4,000 件の取得と保存の所要時間を測る。
    const count = 4000;
    const records = Array.from({ length: count }, (_, i) => attach(fileValue(`bulk${i}`, 10, `f${i}.txt`)));
    await reset({ ...attachConfig(records), files: Object.fromEntries(records.map((_, i) => [`bulk${i}`, { text: 'x' }])) });
    await appInput().fill('104');
    await pickAction('添付ファイルを保存');
    await page.getByRole('textbox', { name: '添付フィールドコード', exact: true }).fill('attach');
    const started = Date.now();
    await confirmAndRun('添付ファイルを保存');
    const seconds = (Date.now() - started) / 1000;
    const names = await downloadNames();
    assert.deepEqual(names.length, 1);
    const zip = await downloadZip(0);
    const manifest = JSON.parse(zip.get('manifest.json').toString());
    assert.equal(manifest.savedCount, count);
    assert.match(await statusText(), new RegExp(`添付ファイル ${count}件を保存しました`));
    ok(`添付 ${count} 件が 1 つの ZIP に収まる（${seconds.toFixed(1)} 秒）`);
  }, { slow: true });
}

module.exports = { register };
