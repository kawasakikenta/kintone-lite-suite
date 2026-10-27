'use strict';

import { installLiteWorkflow, foldWorkflowSection, connectionSummary } from './liteWorkflow.js';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import { runCsvExportBatchStandalone, runLoadViewsStandalone, toPanelTone, validateRecordConnection } from '../tabs/record-standalone.js';
import { buildCursorRecordsQuery } from '../tabs/record-query.js';
import type { RecordViewChoice } from '../tabs/record-metadata.js';
import {
  createLitePanel,
  makeAppTable,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
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
    badges: [{ label: '読み取り専用', tone: 'read' }],
    hint: 'アプリのレコードは変更せず、取得した内容をブラウザからファイルとして保存します。',
    wide: true
  });

  const cardApps = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({ minRows: 1, currentAppId: DEFAULT_APP_ID || '', currentGuestId: DEFAULT_GUEST_ID, initial: DEFAULT_APP_ID ? [{ appId: DEFAULT_APP_ID, guestId: DEFAULT_GUEST_ID }] : [] });
  cardApps.body.appendChild(appTable.element);
  cardApps.body.appendChild(createAppSearchControl(panel, {
    targets: [{ label: '対象アプリへ追加', apply: (id, name, guestId) => {
      const result = appTable.putApp(id, guestId || '', { focus: true, appName: name });
      syncViewAppFromTable();
      const note = result.action === 'existing' ? '（追加済み）' : result.action === 'filled' ? '（空行へ設定）' : '';
      return {
        message: `アプリ #${id}${name ? ` (${name})` : ''} を対象アプリに設定しました${note}`,
        tone: result.action === 'existing' ? 'info' : 'ok',
        pickedLabel: result.action === 'existing' ? '追加済み' : '設定済み'
      };
    } }]
  }));
  panel.body.insertBefore(cardApps.card, panel.status);

  const cardCond = makeCard({ title: '出力条件', number: 2, soft: true });
  const query = makeInput({ placeholder: '例: 更新日時 >= "2026-01-01T00:00:00Z"（空欄で全件）', width: 'wide' });
  const viewApp = makeInput({ placeholder: '一覧取得元アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const viewGuest = makeInput({ placeholder: 'ゲストID（任意）', value: DEFAULT_GUEST_ID, width: 'guest' });
  const viewSelect = makeSelect([['', '一覧を選択（任意）']]);
  const loadViews = makeButton('一覧読込', 'sub');
  const useView = makeButton('▼ 条件へ反映', 'sub');
  const filename = makeInput({ placeholder: '空欄で自動命名（CSV / テーブルあり・複数アプリはZIP）', width: 'wide' });
  const headerModeSelect = makeSelect([
    ['code', 'フィールドコード（既定）'],
    ['label', 'フィールド名（ラベル）'],
    ['both', 'フィールド名 [コード]']
  ]);
  headerModeSelect.setAttribute('aria-label', 'CSVヘッダー形式');
  const lineEndingSelect = makeSelect([
    ['lf', 'LF（既定）'],
    ['crlf', 'CRLF（Windows標準）']
  ]);
  lineEndingSelect.setAttribute('aria-label', '改行コード');
  const neutralizeCb = makeCheck({ label: '= + - @ で始まる文字列の先頭に \' を付ける（Excel向け・既定）', checked: true });

  cardCond.body.appendChild(makeRow([query, useView], { label: '共通クエリ' }));
  cardCond.body.appendChild(makeRow([viewApp, viewGuest, loadViews], { label: '一覧取得元' }));
  cardCond.body.appendChild(makeRow(viewSelect, { label: '一覧' }));
  const viewNote = makeNote('一覧を読み込むと、絞り込みと並び順を共通クエリへ反映できます。');
  cardCond.body.appendChild(viewNote);
  cardCond.body.appendChild(makeNote('クエリは全対象アプリに共通で適用します。テーブル明細は別CSVに1行ずつ出力し、親レコードの $id で紐付けできます。', 'help'));
  cardCond.body.appendChild(makeNote('出力は閲覧・集計用で、CSV取込用の互換形式ではありません。添付はファイル名のみ出力します（ファイル本体は、レコード管理のバックアップで「添付ファイルも保存」を選んで取得できます）。', 'help'));
  cardCond.body.appendChild(makeNote('10,000 件を超えても全件取得します（並び順を指定した場合は cursor API を使います）。クエリに limit / offset は書けません。', 'help'));
  cardCond.body.appendChild(makeNote('複数アプリのうち一部が失敗しても、成功分は ZIP に保存し、失敗の一覧を manifest.txt に記録します。', 'help'));
  panel.body.insertBefore(cardCond.card, panel.status);

  // ファイル名・出力形式・Excel保護は「詳細設定…」のポップアップへ（既定値のままでも出力できる）
  const cardFormat = makeCard({ title: '出力形式', soft: true });
  cardFormat.body.appendChild(makeRow(filename, { label: 'ファイル名' }));
  cardFormat.body.appendChild(makeRow([headerModeSelect, lineEndingSelect], { label: '出力形式' }));
  cardFormat.body.appendChild(makeRow(neutralizeCb.label, { label: 'Excel保護' }));
  cardFormat.body.appendChild(makeNote('Excelで数式として実行されないよう、= + - @ で始まる文字列の先頭に \' を付けます（数値は対象外）。', 'help'));

  let loadedViews: RecordViewChoice[] = [];
  let viewContext = '';
  let viewAppEdited = false;
  const viewKey = () => `${viewApp.value.trim()}::${viewGuest.value.trim()}`;
  const clearLoadedViews = (message = '一覧を読み込んでください。') => {
    loadedViews = [];
    viewContext = '';
    viewSelect.replaceChildren(new Option('一覧を選択（任意）', ''));
    viewNote.textContent = message;
  };
  function syncViewAppFromTable() {
    if (viewAppEdited) return;
    const first = appTable.getApps()[0];
    if (!first) return;
    const nextApp = first.appId || '';
    const nextGuest = first.guestId || '';
    if (viewApp.value !== nextApp || viewGuest.value !== nextGuest) {
      viewApp.value = nextApp;
      viewGuest.value = nextGuest;
      clearLoadedViews('対象アプリの先頭行に合わせて一覧取得元を更新しました。');
    }
  }
  appTable.element.addEventListener('input', syncViewAppFromTable);
  appTable.element.addEventListener('change', syncViewAppFromTable);
  for (const input of [viewApp, viewGuest]) {
    input.addEventListener('input', () => {
      viewAppEdited = true;
      clearLoadedViews('一覧取得元が変わりました。一覧を再取得してください。');
    });
    input.addEventListener('change', () => {
      viewAppEdited = true;
      clearLoadedViews('一覧取得元が変わりました。一覧を再取得してください。');
    });
  }
  viewSelect.addEventListener('change', () => {
    const view = loadedViews.find(item => item.id === viewSelect.value);
    if (!view) return;
    const scopeNote = view.type === 'CALENDAR' ? '（カレンダーの表示月による絞り込みは含みません）'
      : view.type === 'CUSTOM' ? '（カスタマイズ画面の独自処理は含みません）' : '';
    viewNote.textContent = `${view.name} / 条件: ${view.filter || '全件'} / 並び順: ${view.sort || 'レコードID順'}${scopeNote}`;
  });

  loadViews.addEventListener('click', () => liteRun(panel, '一覧情報を取得中…', async () => {
    syncViewAppFromTable();
    const sourceKey = viewKey();
    if (!viewApp.value.trim()) throw new Error('一覧取得元のアプリIDを入力してください');
    const source = validateRecordConnection(viewApp.value, viewGuest.value);
    clearLoadedViews('一覧を取得中…');
    let views: RecordViewChoice[];
    try {
      views = await runLoadViewsStandalone(
        source,
        (m, tone) => panel.setStatus(m, toPanelTone(tone))
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
      const typeLabel = { LIST: '表', CALENDAR: 'カレンダー', CUSTOM: 'カスタマイズ' }[v.type] || v.type;
      opt.value = v.id;
      opt.textContent = `${v.name}（${typeLabel}） ${v.query ? `(${v.query.slice(0, 80)})` : '(全件)'}`;
      viewSelect.appendChild(opt);
    }
    viewNote.textContent = `App ${source.appId} から ${views.length}件の一覧を取得しました。全件の一覧を選ぶと、入力済みのクエリを消去します。`;
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
    const outcome = await runCsvExportBatchStandalone(
      {
        apps: appTable.getApps(),
        query: query.value.trim(),
        filename: filename.value.trim(),
        headerMode: headerModeSelect.value as 'code' | 'label' | 'both',
        lineEnding: lineEndingSelect.value === 'crlf' ? '\r\n' : '\n',
        neutralizeFormula: neutralizeCb.checkbox.checked
      },
      (m, tone) => panel.setStatus(m, toPanelTone(tone))
    );
    // 一部のアプリの失敗や未取得のテーブルは、ステータスの件数だけでなく内訳も画面に残す。
    if (outcome?.issues?.length) panel.setResult(outcome.issues.join('\n'));
  }));
  cardRun.body.appendChild(makeRow(run));
  panel.body.insertBefore(cardRun.card, panel.status);

  panel.setStatus('対象アプリを指定すると、CSVを出力できます。', 'ok');

  query.setAttribute('aria-label', '全対象アプリの絞り込み条件');
  filename.setAttribute('aria-label', '出力ファイル名');
  viewSelect.setAttribute('aria-label', '一覧の条件');
  const viewHelper = foldWorkflowSection('一覧の条件を利用する', viewApp.closest('.kus-lp__row') as HTMLElement, viewSelect.closest('.kus-lp__row') as HTMLElement, useView);
  cardCond.body.appendChild(viewHelper);
  const validateApps = () => {
    const apps = appTable.getApps();
    if (!apps.length) return '対象アプリを1件以上指定してください。';
    // limit / offset はページング処理と競合する。各アプリへ問い合わせる前に確認画面へ進ませない。
    try { buildCursorRecordsQuery(query.value); }
    catch (error: any) { return error?.message || String(error); }
    for (const app of apps) {
      try { validateRecordConnection(app.appId, app.guestId); }
      catch (error: any) { return `App ${app.appId}: ${error?.message || String(error)}`; }
    }
    return '';
  };
  const headerLabelMap: Record<string, string> = {
    code: 'フィールドコード',
    label: 'フィールド名（ラベル）',
    both: 'フィールド名 [コード]'
  };
  installLiteWorkflow(panel, {
    setup: [cardApps.card, cardCond.card],
    advanced: [cardFormat.card],
    advancedCopy: 'ファイル名・ヘッダー / 改行コード・Excel保護を変更できます。',
    actions: [{ id: 'csv', label: 'CSVを出力', description: '1アプリはCSV、テーブルありは親・明細CSVのZIP、複数アプリはアプリ別フォルダ入りのZIPで保存します。', button: run,
      validate: validateApps,
      summary: () => [
        ['対象', appTable.getApps().map(r => connectionSummary(r.appId, r.guestId)).join('\n')],
        ['絞り込み条件', query.value.trim() || '全件'],
        ['保存形式', appTable.count() > 1 ? 'ZIP（アプリ別フォルダに親CSV・テーブル明細CSV）' : 'CSV（テーブルがある場合は親CSV・明細CSVのZIP）'],
        ['ヘッダー / 改行 / Excel保護', `${headerLabelMap[headerModeSelect.value] || 'フィールドコード'} / ${lineEndingSelect.value === 'crlf' ? 'CRLF' : 'LF'} / 先頭の \' 付加: ${neutralizeCb.checkbox.checked ? 'あり' : 'なし'}`],
        ['ファイル名', filename.value.trim() || '自動命名']
      ]
    }]
  });

}
