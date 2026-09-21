'use strict';

import { installLiteWorkflow, foldWorkflowSection, connectionSummary } from './liteWorkflow.js';

import { DEFAULT_APP_ID } from '../constants.js';
import { runCsvExportBatchStandalone, runLoadViewsStandalone, validateRecordConnection } from '../tabs/record-standalone.js';
import type { RecordViewChoice } from '../tabs/record-metadata.js';
import {
  createLitePanel,
  makeAppTable,
  makeRow,
  makeInput,
  makeButton,
  makeSelect,
  makeCard,
  makeNote,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';

export function mountCsvExportLitePanel() {
  const panel = createLitePanel({
    id: 'kus-csv-export-lite',
    title: 'CSV出力',
    subtitle: 'レコードとテーブル明細を CSV / ZIP で保存します。複数アプリもまとめて出力できます。',
    accent: 'record',
    badges: [{ label: 'Lite' }, { label: '複数アプリ対応' }, { label: '読み取り専用' }],
    hint: '1アプリはCSVで保存します。テーブルがある場合は親レコードとテーブル明細を別CSVにしてZIPにまとめます。複数アプリはアプリ別フォルダを1つのZIPに保存します。',
    wide: true
  });

  const cardApps = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({ minRows: 1, currentAppId: DEFAULT_APP_ID || '', initial: DEFAULT_APP_ID ? [{ appId: DEFAULT_APP_ID, guestId: '' }] : [] });
  cardApps.body.appendChild(appTable.element);
  cardApps.body.appendChild(createAppSearchControl(panel, {
    targets: [{ label: '対象アプリへ追加', apply: (id, name, guestId) => {
      const result = appTable.putApp(id, guestId || '', { focus: true, appName: name });
      const note = result.action === 'existing' ? '（追加済み）' : result.action === 'filled' ? '（空行へ設定）' : '';
      return {
        message: `アプリ #${id}${name ? ` (${name})` : ''} を対象表に設定しました${note}`,
        tone: result.action === 'existing' ? 'info' : 'ok',
        pickedLabel: result.action === 'existing' ? '追加済み' : '設定済み'
      };
    } }]
  }));
  panel.body.insertBefore(cardApps.card, panel.status);

  const cardCond = makeCard({ title: '出力条件', number: 2, soft: true });
  const query = makeInput({ placeholder: '例: 更新日時 >= "2026-01-01T00:00:00Z"（空欄で全件）', width: 'wide' });
  const viewApp = makeInput({ placeholder: '一覧取得元アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const viewGuest = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  const viewSelect = makeSelect([['', '一覧を選択（任意）']]);
  const loadViews = makeButton('一覧読込', 'sub');
  const useView = makeButton('▼ 条件へ反映', 'sub');
  const filename = makeInput({ placeholder: '空欄で自動命名（CSV / テーブルあり・複数アプリはZIP）', width: 'wide' });

  cardCond.body.appendChild(makeRow([query, useView], { label: '共通クエリ' }));
  cardCond.body.appendChild(makeRow([viewApp, viewGuest, loadViews], { label: '一覧取得元' }));
  cardCond.body.appendChild(makeRow(viewSelect, { label: '一覧' }));
  const viewNote = makeNote('一覧を読み込むと、絞り込みと並び順を共通クエリへ反映できます。');
  cardCond.body.appendChild(viewNote);
  cardCond.body.appendChild(makeRow(filename, { label: 'ファイル名' }));
  cardCond.body.appendChild(makeNote('クエリは全対象アプリへ共通適用します。各アプリのフィールドコードをヘッダーにし、テーブル明細は1行ずつ別CSVに出力します。親レコードの $id で明細を紐付けできます。'));
  cardCond.body.appendChild(makeNote('出力は閲覧・集計用です。CSV取込用の互換形式ではありません。= + - @ で始まる文字列は、Excelで数式として実行されないよう先頭に \' を付けます（数値は対象外）。添付はファイル名のみを出力します。ファイル本体も必要な場合は、レコード管理のバックアップで「添付ファイルも保存」を選んでください。'));
  cardCond.body.appendChild(makeNote('limit / offset は指定できません。order by を付けた場合は cursor API、無い場合はレコード ID 順で全件取得します。複数アプリで一部が失敗しても成功分は ZIP に保存し、失敗一覧を manifest.txt に記録します。'));
  panel.body.insertBefore(cardCond.card, panel.status);

  let loadedViews: RecordViewChoice[] = [];
  let viewContext = '';
  const viewKey = () => `${viewApp.value.trim()}::${viewGuest.value.trim()}`;
  const clearLoadedViews = (message = '一覧を読み込んでください。') => {
    loadedViews = [];
    viewContext = '';
    viewSelect.replaceChildren(new Option('一覧を選択（任意）', ''));
    viewNote.textContent = message;
  };
  for (const input of [viewApp, viewGuest]) {
    input.addEventListener('input', () => clearLoadedViews('一覧取得元が変わりました。一覧を再取得してください。'));
    input.addEventListener('change', () => clearLoadedViews('一覧取得元が変わりました。一覧を再取得してください。'));
  }

  loadViews.addEventListener('click', () => liteRun(panel, '一覧情報を取得中…', async () => {
    const sourceKey = viewKey();
    const source = validateRecordConnection(viewApp.value, viewGuest.value);
    clearLoadedViews('一覧を取得中…');
    let views: RecordViewChoice[];
    try {
      views = await runLoadViewsStandalone(
        source,
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
      );
    } catch (error) {
      viewNote.textContent = '一覧を取得できませんでした。取得元を確認して、もう一度お試しください。';
      throw error;
    }
    if (sourceKey !== viewKey()) {
      viewNote.textContent = '一覧取得中に取得元が変わりました。一覧を再取得してください。';
      panel.setStatus('一覧取得中に取得元が変わりました。一覧を再取得してください。', 'warn');
      return;
    }
    loadedViews = views;
    viewContext = sourceKey;
    viewSelect.replaceChildren(new Option('一覧を選択（任意）', ''));
    for (const v of views) {
      const opt = document.createElement('option');
      // The filter-only value used to lose sort order and made an all-records
      // view indistinguishable from the placeholder. Keep the view ID and
      // apply its complete query only after the user selects it.
      opt.value = v.id;
      opt.textContent = `${v.name} ${v.query ? `(${v.query.slice(0, 80)})` : '(全件)'}`;
      viewSelect.appendChild(opt);
    }
    viewNote.textContent = `${source.appId} から ${views.length}件の一覧を取得しました。全件の一覧を選ぶと既存のクエリを消去します。`;
  }, '一覧を読み込みました'));

  useView.addEventListener('click', () => {
    if (viewContext !== viewKey()) {
      panel.setStatus('一覧取得元が変わりました。一覧を再取得して選択してください。', 'warn');
      return;
    }
    if (!viewSelect.value) {
      panel.setStatus('適用する一覧を選択してください。', 'warn');
      return;
    }
    const view = loadedViews.find(item => item.id === viewSelect.value);
    if (!view) {
      panel.setStatus('適用する一覧を選択してください。', 'warn');
      return;
    }
    query.value = view.query;
    query.dispatchEvent(new Event('input', { bubbles: true }));
    panel.setStatus(`「${view.name}」の条件を反映しました: ${view.query || '全件'}`, 'ok');
  });

  const cardRun = makeCard({ title: '実行', number: 3 });
  const run = makeButton('CSVを出力', 'primary', { icon: '↓' });
  run.style.width = '100%';
  run.addEventListener('click', () => liteRun(panel, 'CSV出力中…', async () => {
    await runCsvExportBatchStandalone(
      { apps: appTable.getApps(), query: query.value.trim(), filename: filename.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
  }));
  cardRun.body.appendChild(makeRow(run));
  panel.body.insertBefore(cardRun.card, panel.status);

  panel.setStatus('対象アプリを入力して CSV 出力できます', 'ok');

  query.setAttribute('aria-label', '全対象アプリの絞り込み条件');
  filename.setAttribute('aria-label', '出力ファイル名');
  viewSelect.setAttribute('aria-label', '一覧の条件');
  const viewHelper = foldWorkflowSection('一覧の条件を利用する', viewApp.closest('.kus-lp__row') as HTMLElement, viewSelect.closest('.kus-lp__row') as HTMLElement, useView);
  cardCond.body.appendChild(viewHelper);
  const validateApps = () => {
    const apps = appTable.getApps();
    if (!apps.length) return '対象アプリを1件以上指定してください。';
    for (const app of apps) {
      try { validateRecordConnection(app.appId, app.guestId); }
      catch (error: any) { return `App ${app.appId}: ${error?.message || String(error)}`; }
    }
    return '';
  };
  installLiteWorkflow(panel, {
    setup: [cardApps.card, cardCond.card],
    actions: [{ id: 'csv', label: 'CSVを出力', description: '1アプリはCSV、テーブルあり・複数アプリは親CSVと明細CSVをZIPで保存します。', button: run,
      validate: validateApps,
      summary: () => [['対象', appTable.getApps().map(r => connectionSummary(r.appId, r.guestId)).join('\n')], ['絞り込み条件', query.value.trim() || '全件'], ['保存形式', appTable.count() > 1 ? 'ZIP（アプリ別フォルダに親CSV・テーブル明細CSV）' : 'CSV（テーブルがある場合は親CSV・明細CSVのZIP）'], ['ファイル名', filename.value.trim() || '自動命名']]
    }]
  });

}
