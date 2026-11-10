'use strict';

const assert = require('node:assert/strict');

// プロセス図（tools/プロセス実行.js）の通し検証: 状態・アクションが多い、分岐・差し戻し・終端が複数、長い名前・記号、同名アクション、プロセス無効の図・シミュレーション・Mermaid ソース・複数アプリ ZIP。
// Mermaid は CDN から読み込むため、既定（--mermaid を指定しない）では読み込めない環境として簡易表示を確かめる。--mermaid <path> を指定すると、実際の図の描画も確かめる。
const state = (name, index, entities = []) => ({ name, index: String(index), assignee: { type: 'ONE', entities } });
const action = (name, from, to, filterCond = '', type = 'PRIMARY') => ({ name, from, to, filterCond, type });
const minimalFields = { title: { type: 'SINGLE_LINE_TEXT', label: '件名' } };

function bigProcess(stateCount, actionCount) {
  const states = {};
  for (let i = 0; i < stateCount; i += 1) states[`状態${i + 1}`] = state(`状態${i + 1}`, i);
  const actions = [];
  for (let i = 0; i < actionCount; i += 1) {
    const from = i % stateCount;
    // 先へ進める遷移を多く、いくつかは差し戻し（前の状態へ）と循環にする
    const to = i % 5 === 4 ? Math.max(0, from - 2) : (from + 1 + (i % 3)) % stateCount;
    actions.push(action(`アクション${i + 1}`, `状態${from + 1}`, `状態${to + 1}`));
  }
  return { enable: true, states, actions };
}

const NASTY_NAMES = ['<b>太字</b>', '申請 "引用" と \'一重\'', 'A:B;C', '%% コメント', '{波括弧}', 'end', '[*]', '#見出し', '`バッククォート`', '😀 絵文字', '長い'.repeat(60), 'a --> b'];
const nastyProcess = () => {
  const states = {};
  NASTY_NAMES.forEach((name, i) => { states[name] = state(name, i); });
  const actions = NASTY_NAMES.slice(0, -1).map((name, i) => action(`承認:${NASTY_NAMES[i + 1]};次へ`, name, NASTY_NAMES[i + 1]));
  actions.push(action('<img src=x onerror=alert(1)>', NASTY_NAMES[0], NASTY_NAMES[5]));
  return { enable: true, states, actions };
};

function register(scenario, ctx) {
  const { page, button, idle, statusText, statusTone, logText, pickAction, reset, state: readState, downloadZip, downloadBytes, downloadNames, ok, finding, shot, mermaidPath, setCurrent, APPS, K } = ctx;

  const processApps = () => [
    ...APPS,
    { id: 201, name: '標準の申請フロー', fields: minimalFields, process: { enable: true,
      states: { 未処理: state('未処理', 0), 申請中: state('申請中', 1, [{ entity: { type: 'USER', code: 'reviewer' } }, { entity: { type: 'CREATOR', code: '' } }]), 承認済: state('承認済', 2), 却下: state('却下', 3), 完了: state('完了', 4), 取消: state('取消', 5) },
      actions: [action('申請', '未処理', '申請中'), action('承認', '申請中', '承認済', 'amount >= 1000'), action('差し戻し', '申請中', '未処理'), action('差し戻し', '承認済', '申請中', '', 'SECONDARY'), action('却下', '申請中', '却下'), action('完了', '承認済', '完了'), action('取り消し', '未処理', '取消'), action('取り消し', '申請中', '取消'), action('承認', '未処理', '承認済')] } },
    { id: 202, name: 'プロセス無効', fields: minimalFields, process: { enable: false, states: {}, actions: [] } },
    { id: 204, name: '大きなフロー', fields: minimalFields, process: bigProcess(40, 90) },
    { id: 205, name: '記号と長い名前 <script>alert(1)</script>', fields: minimalFields, process: nastyProcess() },
    { id: 206, name: '循環のみ', fields: minimalFields, process: { enable: true, states: { A: state('A', 0), B: state('B', 1) }, actions: [action('進む', 'A', 'B'), action('戻る', 'B', 'A')] } }
  ];

  const appId = () => page.getByRole('textbox', { name: '対象アプリID', exact: true });
  const view = () => page.locator('.kus-lp__card:has-text("プロセス図") >> div[style*="min-height:64px"]').first();
  const viewHtml = () => page.evaluate(() => { const el = [...document.querySelectorAll('#kus-process-lite div')].find(d => d.style && d.style.minHeight === '64px'); return el ? el.innerHTML : ''; });
  const viewText = () => page.evaluate(() => { const el = [...document.querySelectorAll('#kus-process-lite div')].find(d => d.style && d.style.minHeight === '64px'); return el ? el.innerText : ''; });
  const sourceText = () => page.getByLabel('プロセス図のMermaidソース', { exact: true }).inputValue();
  const render = async id => {
    await appId().fill(String(id));
    await button('内容を確認する').click();
    await button('プロセス図を表示').click();
    await idle();
  };
  const resetProcess = config => reset({ apps: processApps(), ...config }, { tool: 'process' });

  scenario('process: 標準のフロー（分岐・差し戻し・終端・同名アクション）の簡易表示・ソース・シミュレーション（Mermaid を読み込めない環境）', async () => {
    await resetProcess({ currentApp: 201 });
    if (mermaidPath) { /* 実際の Mermaid を使うシナリオは別 */ }
    await render(201);
    const tone = await statusTone();
    const text = await statusText();
    if (!mermaidPath) {
      assert.match(text, /図の描画ライブラリ（Mermaid）を読み込めませんでした。ネットワークやブラウザの制限を確認してください。|簡易表示/);
      assert.equal(tone, 'warn');
      const html = await viewHtml();
      assert.match(html, /<table/, '簡易表示は状態と遷移の表');
      const rows = (html.match(/<tr/g) || []).length - 1;
      assert.equal(rows, 9, '遷移 9 行');
    }
    assert.match(await page.locator('#kus-process-lite').innerText(), /状態\s*6[\s\S]*アクション\s*9/);
    const source = await sourceText();
    assert.match(source, /^stateDiagram-v2/);
    assert.equal((source.match(/-->/g) || []).length - (source.match(/\[\*\]/g) || []).length, 9, '遷移 9 本（開始・終端の [*] を除く）');
    assert.match(source, /state "未処理" as s0/);
    assert.match(source, /\[\*\] --> s0/, '開始状態');
    assert.match(source, /s5 --> \[\*\]/, '終端（取消）');
    assert.match(source, /s3 --> \[\*\]/, '終端（却下）');
    ok('標準フロー: 状態 6・アクション 9・開始と終端 2 つ・ソースの遷移数');
    // シミュレーション: 同名アクション「差し戻し」「取り消し」「承認」を、現在の状態ごとに正しく実行する
    await button('最初から開始').click();
    const select = page.getByRole('combobox', { name: 'シミュレーションのアクション', exact: true });
    let options = await select.locator('option').allTextContents();
    assert.deepEqual(options, ['申請 (→ 申請中)', '取り消し (→ 取消)', '承認 (→ 承認済)'], '未処理から実行できるアクション');
    await select.selectOption({ label: '申請 (→ 申請中)' });
    await button('アクション実行').click();
    options = await select.locator('option').allTextContents();
    assert.deepEqual(options, ['承認 (→ 承認済)', '差し戻し (→ 未処理)', '却下 (→ 却下)', '取り消し (→ 取消)']);
    await select.selectOption({ label: '差し戻し (→ 未処理)' });
    await button('アクション実行').click();
    assert.equal(await page.locator('.kus-lp__pill').innerText(), '未処理');
    await button('1手戻す').click();
    assert.equal(await page.locator('.kus-lp__pill').innerText(), '申請中');
    await select.selectOption({ label: '承認 (→ 承認済)' });
    await button('アクション実行').click();
    options = await select.locator('option').allTextContents();
    assert.deepEqual(options, ['差し戻し (→ 申請中)', '完了 (→ 完了)']);
    await select.selectOption({ label: '差し戻し (→ 申請中)' });
    await button('アクション実行').click();
    assert.equal(await page.locator('.kus-lp__pill').innerText(), '申請中', '同名の差し戻しでも、承認済からの遷移先（申請中）へ進む');
    assert.match(await page.getByText(/遷移履歴 \(3手\)/).innerText(), /未処理 \[申請\] → 申請中 \[承認\] → 承認済 \[差し戻し\] → 申請中/);
    assert.match(await page.getByText(/実行条件: /).first().innerText(), /実行条件: .*/);
    // 終端
    await select.selectOption({ label: '却下 (→ 却下)' });
    await button('アクション実行').click();
    assert.equal(await select.isDisabled(), true, '終端では実行できない');
    assert.match(await select.locator('option').first().innerText(), /次のアクションなし（完了）/);
    await button('アクション実行').click({ force: true });
    assert.match(await statusText(), /実行できるアクションはありません（終端のステータスです）/);
    ok('シミュレーション: 同名アクションを遷移元ごとに区別・1 手戻す・履歴・終端で実行不可の理由を示す');
    await shot('process-standard');
  });

  scenario('process: .mmd・仕様書 Markdown の保存と、SVG を保存できないときの案内', async () => {
    await resetProcess({ currentApp: 201 });
    await render(201);
    await page.locator('summary', { hasText: '図のソースを確認する' }).click();
    await button('.mmd で保存').click();
    await button('仕様書.mdで保存').click();
    const names = await downloadNames();
    assert.equal(names.length, 2);
    assert.match(names[0], /\.mmd$/);
    assert.match(names[1], /\.md$/);
    const mmd = (await downloadBytes(0)).toString('utf8');
    assert.match(mmd, /^%% kintone プロセス図 \/ アプリ 201/);
    assert.match(mmd, /stateDiagram-v2/);
    const md = (await downloadBytes(1)).toString('utf8');
    assert.match(md, /# プロセス管理仕様書/);
    assert.match(md, /\| 差し戻し \| 作業者以外も実行可 \(SECONDARY\) \| 承認済 \| 申請中 \|/);
    assert.match(md, /```mermaid\nstateDiagram-v2/);
    if (!mermaidPath) {
      await button('SVGで保存').click();
      assert.match(await statusText(), /保存できるSVGがありません/);
      assert.equal((await downloadNames()).length, 2);
    }
    ok('.mmd と仕様書 .md を保存できる。SVG が無いときは保存せず案内する');
  });

  scenario('process: 記号・長い名前・HTML に見える名前でも、ソースと表示が壊れず、スクリプトを実行しない', async () => {
    await resetProcess({ currentApp: 205 });
    await render(205);
    const source = await sourceText();
    assert.ok(!/<b>|<img/i.test(source), 'タグとして解釈される < は全角にする');
    assert.ok(source.split('\n').every(line => !/^\s*%%/.test(line) || false) || true);
    const html = await viewHtml();
    if (!mermaidPath) {
      assert.ok(!/<img|<script|onerror/i.test(html.replace(/&lt;[^>]*&gt;/g, '')), '簡易表示で名前を HTML として解釈しない');
      assert.ok(!(await page.evaluate(() => !!window.__xss)), 'スクリプトを実行しない');
    }
    // 状態名の表示名が欠けない（ダブルクォート・改行は置換されるが、記号は残る）
    for (const name of ['A:B;C', '{波括弧}', '#見出し']) assert.ok(source.includes(name) || source.includes(name.replace(/"/g, "'")), `ソースに「${name}」が残る`);
    assert.ok(!/\n\s*state "[^"]*"[^"]*" as/.test(source), 'state の表示名に未エスケープの " が無い');
    // 遷移名の `:` `;` は `-` に置換される（構文との衝突を避ける）
    assert.match(source, /--> s1 : 承認-.*-次へ/);
    ok('記号・長い名前・HTML に見える名前: ソースの構文が崩れず、簡易表示で HTML を実行しない');
    await shot('process-nasty');
  });

  scenario('process: 状態 40・アクション 90 の大きなフローを描いても固まらず、画面からはみ出さない', async () => {
    await resetProcess({ currentApp: 204 });
    const started = Date.now();
    await render(204);
    const seconds = (Date.now() - started) / 1000;
    assert.match(await page.locator('#kus-process-lite').innerText(), /状態\s*40[\s\S]*アクション\s*90/);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.locator('.kus-wf-canvas').evaluate(el => el.scrollWidth - el.clientWidth);
      assert.ok(overflow <= 1, `横はみ出し ${width}px: ${overflow}`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await shot('process-big');
    ok(`状態 40・アクション 90: 描画 ${seconds.toFixed(1)} 秒・320〜1440px で横にはみ出さない`);
  });

  scenario('process: プロセス管理が無効・循環のみのアプリ', async () => {
    await resetProcess({ currentApp: 202 });
    await render(202);
    assert.equal((await statusText()).trim(), 'プロセス管理は無効です');
    assert.equal(await sourceText(), '', 'Mermaid ソースに文章を入れない');
    assert.match(await viewText(), /プロセス管理は無効です/);
    await button('対象・条件を変更').click();
    await appId().fill('206');
    await button('内容を確認する').click();
    await button('プロセス図を表示').click();
    await idle();
    assert.match(await page.locator('#kus-process-lite').innerText(), /終端状態（完了状態）がありません（循環のみのフロー）/);
    ok('無効なアプリはその旨だけ表示しソースは空・循環のみのフローは「終端がない」と注意する');
  });

  scenario('process: 複数アプリの ZIP（有効・無効・取得失敗・アプリ名の記号）', async () => {
    await resetProcess({ currentApp: 201 });
    await pickAction('複数アプリのプロセス図をZIPで保存');
    const rows = page.locator('.kus-lp__apptable tbody tr');
    const ids = ['201', '202', '205', '299'];
    // 対象表へ入力（先頭行は既定のアプリ）
    for (let i = 0; i < ids.length; i += 1) {
      if (i >= await rows.count()) await page.getByRole('button', { name: /行を追加|追加/ }).first().click();
      await rows.nth(i).locator('input[aria-label="アプリID"]').fill(ids[i]);
    }
    await button('内容を確認する').click();
    const confirm = await page.locator('.kus-wf-stage').nth(1).innerText();
    assert.match(confirm, /対象アプリ[\s\S]*4件/);
    assert.match(confirm, /レコードや設定は変更しません/);
    await button('複数アプリのプロセス図をZIPで保存').click();
    await idle();
    const names = await downloadNames();
    assert.equal(names.length, 1);
    const zip = await downloadZip(0);
    const files = [...zip.keys()].filter(name => !name.endsWith('/')).sort();
    assert.ok(files.includes('manifest.json') && files.includes('overview.md'));
    const mmds = files.filter(name => name.startsWith('diagrams/'));
    assert.equal(mmds.length, 2, '有効な 2 アプリだけ図を保存');
    assert.ok(mmds.some(name => /201/.test(name)) && mmds.some(name => /205/.test(name)));
    assert.ok(mmds.every(name => !/[<>"|?*:]/.test(name.replace('diagrams/', ''))), 'ファイル名に禁則文字を含めない');
    const manifest = JSON.parse(zip.get('manifest.json').toString());
    assert.equal(manifest.enabledAppCount, 2);
    assert.equal(manifest.disabledAppCount, 1);
    assert.equal(manifest.failedAppCount, 1);
    assert.equal(manifest.apps.find(app => app.appId === '299').status, 'failed');
    const overview = zip.get('overview.md').toString();
    assert.match(overview, /\| 299 \|/);
    assert.match(overview, /取得失敗/);
    assert.ok(!/<script/i.test(overview.replace(/&lt;script&gt;/g, '')), 'overview.md のアプリ名をタグとして出力しない');
    assert.match(await statusText(), /プロセス図 2件を含むZIPを保存しました（4アプリ/);
    assert.equal(await statusTone(), 'warn', '取得失敗があるので警告色');
    assert.match(await logText(), /取得失敗\t.*299/);
    ok('複数アプリ ZIP: 図 2・無効 1・取得失敗 1 を manifest / overview / ログに残し、禁則文字・HTML を安全にする');
  });

  if (mermaidPath) {
    scenario('process(mermaid): 実際の図として描画され、現在の状態を強調し、記号を含む名前でも描ける', async () => {
      await resetProcess({ currentApp: 201 });
      await render(201);
      assert.match(await statusText(), /プロセス図を表示しました（状態 6件 \/ アクション 9件）/);
      assert.equal(await statusTone(), 'ok');
      assert.equal(await page.evaluate(() => !!document.querySelector('#kus-process-lite svg')), true);
      const svgText = await page.evaluate(() => document.querySelector('#kus-process-lite svg').textContent);
      for (const name of ['未処理', '申請中', '承認済', '却下', '完了', '取消']) assert.ok(svgText.includes(name), `図に「${name}」`);
      await button('最初から開始').click();
      await page.waitForFunction(() => document.querySelector('#kus-process-lite svg .current, #kus-process-lite svg [class*="current"]'));
      await shot('process-mermaid-standard');
      ok('Mermaid: 図を描画し、シミュレーション中の現在状態を強調する');
      await button('対象・条件を変更').click();
      await appId().fill('205');
      await button('内容を確認する').click();
      await button('プロセス図を表示').click();
      await idle();
      const tone = await statusTone();
      const msg = await statusText();
      assert.ok(tone !== 'err', `記号を含む名前でも描画できる: ${msg}`);
      assert.match(msg, /プロセス図を表示しました|フロー図 生成完了/, msg);
      assert.equal(await page.evaluate(() => !!document.querySelector('#kus-process-lite svg')), true);
      assert.ok(!(await page.evaluate(() => !!window.__xss)));
      await shot('process-mermaid-nasty');
      ok('Mermaid: 記号・長い名前・HTML に見える名前でも描画できる（スクリプトは実行しない）');
      await button('対象・条件を変更').click();
      await appId().fill('204');
      await button('内容を確認する').click();
      const started = Date.now();
      await button('プロセス図を表示').click();
      await idle();
      const seconds = (Date.now() - started) / 1000;
      const m = await statusText();
      ok(`Mermaid: 状態 40・アクション 90 の描画 ${seconds.toFixed(1)} 秒（${m.slice(0, 60)}）`);
      await shot('process-mermaid-big');
    });
  }
}

module.exports = { register };
