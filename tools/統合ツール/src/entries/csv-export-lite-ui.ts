'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { runCsvExportBatchStandalone, runLoadViewsStandalone } from '../tabs/record-standalone.js';
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
    subtitle: '複数アプリのレコードを CSV / ZIP で一括出力する lite 版',
    accent: 'record',
    badges: [{ label: 'Lite' }, { label: '複数アプリ対応' }, { label: '読み取り専用' }],
    hint: '対象アプリ表に 1 行なら CSV を直接保存、複数行ならアプリごとの CSV を 1 つの ZIP にまとめて保存します。',
    wide: true
  });

  const cardApps = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({ minRows: 3, currentAppId: DEFAULT_APP_ID || '' });
  cardApps.body.appendChild(appTable.element);
  cardApps.body.appendChild(createAppSearchControl(panel, {
    targets: [{ label: '対象アプリへ追加', apply: (id, name, guestId) => appTable.putApp(id, guestId || '', { focus: true, appName: name }) }]
  }));
  panel.body.insertBefore(cardApps.card, panel.status);

  const cardCond = makeCard({ title: '出力条件', number: 2, soft: true });
  const query = makeInput({ placeholder: '例: 更新日時 >= "2026-01-01T00:00:00Z"（空欄で全件）', width: 'wide' });
  const viewApp = makeInput({ placeholder: '一覧取得元アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const viewGuest = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  const viewSelect = makeSelect([['', '一覧を選択（任意）']]);
  const loadViews = makeButton('一覧読込', 'sub');
  const useView = makeButton('▼ 条件へ反映', 'sub');
  const filename = makeInput({ placeholder: '空欄で自動命名（単一: レコード_アプリ_日時.csv / 複数: CSV出力_日時.zip）', width: 'wide' });

  cardCond.body.appendChild(makeRow([query, useView], { label: '共通クエリ' }));
  cardCond.body.appendChild(makeRow([viewApp, viewGuest, loadViews], { label: '一覧取得元' }));
  cardCond.body.appendChild(makeRow(viewSelect, { label: '一覧' }));
  cardCond.body.appendChild(makeRow(filename, { label: 'ファイル名' }));
  cardCond.body.appendChild(makeNote('クエリは全対象アプリへ共通適用します。アプリごとにフィールド構成が異なる場合も、各アプリのフィールドコードをヘッダーにして別 CSV を作成します。'));
  panel.body.insertBefore(cardCond.card, panel.status);

  loadViews.addEventListener('click', () => liteRun(panel, '一覧情報を取得中…', async () => {
    const views = await runLoadViewsStandalone(
      { appId: viewApp.value.trim(), guestId: viewGuest.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    viewSelect.innerHTML = '<option value="">一覧を選択（任意）</option>';
    for (const v of views) {
      const opt = document.createElement('option');
      opt.value = v.filter;
      opt.textContent = `${v.name} ${v.filter ? `(${v.filter.slice(0, 60)})` : ''}`;
      viewSelect.appendChild(opt);
    }
  }, '一覧を読み込みました'));

  useView.addEventListener('click', () => {
    if (viewSelect.value) query.value = viewSelect.value;
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
}
