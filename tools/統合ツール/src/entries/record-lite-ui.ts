'use strict';

import { installLiteWorkflow, connectionSummary, type LiteWorkflowAction } from './liteWorkflow.js';

import { DEFAULT_APP_ID, SECTION_DEFS } from '../constants.js';
import {
  runCsvExportBatchStandalone,
  runCsvImportStandalone,
  runBatchProcessStandalone,
  runRecordCopyStandalone,
  runAttachmentDownloadStandalone,
  runRecordBackupStandalone,
  runLoadStatusActionsStandalone,
  runLoadViewsStandalone,
  parseRecordAppIds,
  runRecordAppBatchStandalone
} from '../tabs/record-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeSelect,
  makeCard,
  makeTabs,
  makeNote,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';

export function mountRecordLitePanel() {
  const panel = createLitePanel({
    id: 'kus-record-lite',
    title: 'レコード管理',
    subtitle: 'CSV / バッチ更新 / 添付DL / コピー / バックアップを 1 つにまとめた lite 版',
    accent: 'record',
    badges: [{ label: 'Lite' }, { label: '本番データ操作あり' }],
    hint: '<strong>本番データに直接書き込み・更新・コピーします。</strong>バックアップ取得を強く推奨します。',
    wide: true
  });

  // ---- 接続情報（共通） ----
  const tgtApp = makeInput({ placeholder: 'アプリID（カンマ区切りで複数指定）', value: DEFAULT_APP_ID || '', width: 'wide', ariaLabel: '対象アプリID' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  const cardApp = makeCard({ title: '接続情報', number: 1 });
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '対象アプリ' }));
  cardApp.body.appendChild(makeNote('複数アプリは「463,464,469」のようにカンマ、改行、または空白で区切って指定できます。選択した操作を上から順にすべてのアプリへ実行します。'));
  cardApp.body.appendChild(makeNote('クエリに limit / offset は指定できません。order by を付けた場合は cursor API、無い場合はレコード ID 順で全件取得します（10,000 件超も可）。'));
  cardApp.body.appendChild(createAppSearchControl(panel, {
    guestEl: tgtGuest,
    targets: [{ label: '対象アプリ', apply: (id, _name, guestId) => { tgtApp.value = id; if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId; } }]
  }));
  panel.body.insertBefore(cardApp.card, panel.status);

  // 一覧ロード補助
  const viewSelect = makeSelect([['', '一覧を選択（任意）']]);
  const loadViewsBtn = makeButton('一覧読込', 'sub');
  cardApp.body.appendChild(makeRow([loadViewsBtn, viewSelect], { label: '一覧から条件' }));

  loadViewsBtn.addEventListener('click', () => liteRun(panel, '一覧情報を取得中…', async () => {
    const [appId] = parseRecordAppIds(tgtApp.value);
    const views = await runLoadViewsStandalone(
      { appId, guestId: tgtGuest.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    viewSelect.innerHTML = '<option value="">一覧を選択（任意）</option>';
    for (const v of views) {
      const opt = document.createElement('option');
      opt.value = v.filter;
      opt.textContent = `${v.name} ${v.filter ? `(${v.filter.slice(0, 60)})` : ''}`;
      viewSelect.appendChild(opt);
    }
  }, '一覧を読み込みました。プルダウンから条件を選択できます'));

  function applyViewQuery(target: HTMLInputElement) {
    const q = viewSelect.value;
    if (q) target.value = q;
  }

  // ---- タブ式UI ----
  const tabHost = document.createElement('div');
  panel.body.insertBefore(tabHost, panel.status);

  const recordActions: LiteWorkflowAction[] = [];
  const requiredApps = () => { try { return parseRecordAppIds(tgtApp.value).length ? '' : '対象アプリを指定してください。'; } catch (error: any) { return error.message; } };
  const targetSummary = (): [string, string] => ['対象アプリ', connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim())];
  const addAction = (action: LiteWorkflowAction) => {
    action.onSelect = () => {
      tabs.bar.querySelector<HTMLButtonElement>('[data-tab="' + action.id + '"]')?.click();
      const hint = panel.body.querySelector<HTMLElement>('.kus-lp__hint');
      if (hint) hint.textContent = action.writes ? '本番データを変更する操作です。実行前に対象と条件を確認してください。' : '読み取り操作です。アプリのレコードは変更しません。';
    };
    recordActions.push(action);
  };
  const tabs = makeTabs([
    {
      id: 'csv-export', label: 'CSV出力', build: (root) => {
        const query = makeInput({ placeholder: '空欄で全件（例: 更新日時 >= \"2026-01-01T00:00:00Z\"）', width: 'wide' });
        const fname = makeInput({ placeholder: '空欄で自動命名（レコード_アプリ_日時.csv）', width: 'wide' });
        const useView = makeButton('▼ 一覧から', 'sub');
        useView.addEventListener('click', () => applyViewQuery(query));
        root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
        root.appendChild(makeRow(fname, { label: 'ファイル名' }));
        const run = makeButton('CSVを出力', 'primary', { icon: '↓' });
        run.style.width = '100%';
        run.addEventListener('click', () => liteRun(panel, 'CSV出力中…', async () => {
          const appIds = parseRecordAppIds(tgtApp.value);
          await runCsvExportBatchStandalone(
            { apps: appIds.map((appId) => ({ appId, guestId: tgtGuest.value.trim() })), query: query.value.trim(), filename: fname.value.trim() },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          );
        }));
        addAction({ id: 'csv-export', label: 'CSVを出力', description: '条件に合うレコードをCSV / ZIPで保存します。', button: run, validate: requiredApps, summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['ファイル名', fname.value.trim() || '自動命名']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'csv-import', label: 'CSV取込', build: (root) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.className = 'kus-lp__file';
        root.appendChild(makeRow(fileInput, { label: 'CSV' }));
        root.appendChild(makeNote('UTF-8 / Excel BOM 対応。ヘッダ行はフィールドコード。ファイル・サブテーブル・ステータスは取込対象外です。100 件単位で追加し、途中で失敗した場合は確定済み件数と未処理件数を表示します。'));
        const run = makeButton('レコードを取込', 'primary', { icon: '↑' });
        run.style.width = '100%';
        run.addEventListener('click', () => liteRun(panel, 'CSV取込中…', async () => {
          await runRecordAppBatchStandalone(tgtApp.value, (appId) => runCsvImportStandalone(
            { appId, guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          ), (m, e) => panel.setStatus(m, e ? 'err' : 'busy'));
        }));
        addAction({ id: 'csv-import', label: 'CSVからレコードを追加', description: 'CSVのレコードを対象アプリに新規追加します。', button: run, writes: true, validate: () => requiredApps() || (fileInput.files?.length ? '' : '取り込むCSVを選んでください。'), summary: () => [targetSummary(), ['CSV', fileInput.files?.[0]?.name || '未選択'], ['処理', '各対象アプリへ新規レコードを追加']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'status', label: 'ステータス', build: (root) => {
        const query = makeInput({ placeholder: '条件 (例: status = "新規")', width: 'wide' });
        const action = makeInput({ placeholder: 'アクション名', width: 'medium' });
        const assignee = makeInput({ placeholder: '作業者ログイン名 (任意)', width: 'medium' });
        const actionSelect = makeSelect([['', '--']]);
        const loadActions = makeButton('読込', 'sub');
        const useView = makeButton('▼ 一覧から', 'sub');
        useView.addEventListener('click', () => applyViewQuery(query));

        root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
        root.appendChild(makeRow([action, actionSelect, loadActions], { label: 'アクション' }));
        actionSelect.addEventListener('change', () => { if (actionSelect.value) action.value = actionSelect.value; });
        loadActions.addEventListener('click', () => liteRun(panel, 'プロセス管理を取得中…', async () => {
          const [appId] = parseRecordAppIds(tgtApp.value);
          const info = await runLoadStatusActionsStandalone(
            { appId, guestId: tgtGuest.value.trim() },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          );
          actionSelect.innerHTML = '<option value="">--</option>';
          const seen = new Set<string>();
          for (const a of info.actions) {
            if (seen.has(a.name)) continue;
            seen.add(a.name);
            const opt = document.createElement('option');
            opt.value = a.name;
            opt.textContent = `${a.name} (${a.from} → ${a.to})`;
            actionSelect.appendChild(opt);
          }
        }));
        root.appendChild(makeRow(assignee, { label: '作業者' }));
        root.appendChild(makeNote('対象 100 件単位でステータス更新します。元に戻せません。'));
        const run = makeButton('ステータスを一括更新', 'primary');
        run.style.width = '100%';
        run.classList.add('kus-lp__btn--danger');
        run.addEventListener('click', () => liteRun(panel, 'ステータス一括更新中…', async () => {
          await runRecordAppBatchStandalone(tgtApp.value, (appId) => runBatchProcessStandalone(
            { appId, guestId: tgtGuest.value.trim(), query: query.value.trim(), action: action.value.trim(), assignee: assignee.value.trim() || null },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          ), (m, e) => panel.setStatus(m, e ? 'err' : 'busy'));
        }));
        addAction({ id: 'status', label: 'ステータスを一括更新', description: '指定条件に合うレコードの状態を更新します。', button: run, writes: true, validate: () => requiredApps() || (action.value.trim() ? '' : '実行するアクションを指定してください。'), summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['アクション', action.value.trim()], ['作業者', assignee.value.trim() || '指定なし']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'attach', label: '添付DL', build: (root) => {
        const query = makeInput({ placeholder: '条件 (任意)', width: 'wide' });
        const fileCode = makeInput({ placeholder: '例: attached_file', width: 'medium' });
        const folderCode = makeInput({ placeholder: '任意（フォルダ名にするフィールド）', width: 'medium' });
        const zipName = makeInput({ placeholder: '空欄で自動命名（添付ファイル_アプリ_日時.zip）', width: 'wide' });
        const useView = makeButton('▼ 一覧から', 'sub');
        useView.addEventListener('click', () => applyViewQuery(query));
        root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
        root.appendChild(makeRow(fileCode, { label: 'ファイル' }));
        root.appendChild(makeRow(folderCode, { label: 'フォルダ' }));
        root.appendChild(makeRow(zipName, { label: 'ZIP名' }));
        root.appendChild(makeNote('取得できなかったファイル（閲覧権限なし等）は ZIP 内の download_errors.txt に記録し、完了メッセージに件数を表示します。'));
        const run = makeButton('添付ファイルをZIPで保存', 'primary', { icon: '↓' });
        run.style.width = '100%';
        run.addEventListener('click', () => liteRun(panel, '添付ファイル取得中…', async () => {
          await runRecordAppBatchStandalone(tgtApp.value, (appId) => runAttachmentDownloadStandalone(
            {
              appId,
              guestId: tgtGuest.value.trim(),
              query: query.value.trim(),
              fileFieldCode: fileCode.value.trim(),
              folderFieldCode: folderCode.value.trim(),
              zipName: zipName.value.trim()
            },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          ), (m, e) => panel.setStatus(m, e ? 'err' : 'busy'));
        }));
        addAction({ id: 'attach', label: '添付ファイルを保存', description: '添付ファイルを取得しZIPにまとめます。', button: run, validate: () => requiredApps() || (fileCode.value.trim() ? '' : '添付ファイルのフィールドコードを指定してください。'), summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['添付フィールド', fileCode.value.trim()], ['ZIP名', zipName.value.trim() || '自動命名']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'copy', label: 'コピー', build: (root) => {
        const srcApp = makeInput({ placeholder: 'コピー元アプリID', width: 'id' });
        const srcGuest = makeInput({ placeholder: 'ゲスト (任意)', width: 'guest' });
        const query = makeInput({ placeholder: '条件 (任意)', width: 'wide' });
        root.appendChild(makeRow([srcApp, srcGuest], { label: 'コピー元' }));
        root.appendChild(createAppSearchControl(panel, {
          guestEl: srcGuest,
          targets: [{ label: 'コピー元', apply: (id, _name, guestId) => { srcApp.value = id; if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId; } }]
        }));
        root.appendChild(makeRow(query, { label: 'クエリ' }));
        root.appendChild(makeNote('コピー元の絞り込んだレコードを、対象アプリへ新規レコードとして追加します。ファイル・システム項目・計算項目と、対象アプリに無い（または型が異なる）フィールドは除外し、除外したフィールドコードを実行前に表示します。'));
        const run = makeButton('レコードをコピー実行', 'primary');
        run.style.width = '100%';
        run.classList.add('kus-lp__btn--danger');
        run.addEventListener('click', () => liteRun(panel, 'レコードコピー中…', async () => {
          await runRecordAppBatchStandalone(tgtApp.value, (targetAppId) => runRecordCopyStandalone(
            {
              sourceAppId: srcApp.value.trim(),
              sourceGuestId: srcGuest.value.trim(),
              targetAppId,
              targetGuestId: tgtGuest.value.trim(),
              query: query.value.trim()
            },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          ), (m, e) => panel.setStatus(m, e ? 'err' : 'busy'));
        }));
        addAction({ id: 'copy', label: 'レコードをコピー', description: 'コピー元のレコードを対象アプリへ新規追加します。', button: run, writes: true, validate: () => requiredApps() || (srcApp.value.trim() ? '' : 'コピー元アプリを指定してください。'), summary: () => [['コピー元', connectionSummary(srcApp.value.trim(), srcGuest.value.trim())], ['コピー先', connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim())], ['コピー元の条件', query.value.trim() || '全件']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'backup', label: 'バックアップ', build: (root) => {
        const query = makeInput({ placeholder: '条件 (任意・全件は空)', width: 'wide' });
        const zipName = makeInput({ placeholder: '空欄で自動命名（レコードバックアップ_アプリ_日時.zip）', width: 'wide' });
        const useView = makeButton('▼ 一覧から', 'sub');
        useView.addEventListener('click', () => applyViewQuery(query));
        root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
        root.appendChild(makeRow(zipName, { label: 'ZIP名' }));

        const incFiles = makeCheck({ label: '添付ファイルも保存', checked: true });
        const incComments = makeCheck({ label: 'コメントも保存', checked: true });
        const incSettings = makeCheck({ label: 'アプリ設定も保存', checked: false });
        const optGrid = document.createElement('div');
        optGrid.className = 'kus-lp__check-grid';
        optGrid.appendChild(incFiles.label);
        optGrid.appendChild(incComments.label);
        optGrid.appendChild(incSettings.label);
        root.appendChild(optGrid);

        const scopeBox = document.createElement('div');
        scopeBox.className = 'kus-lp__chips';
        scopeBox.style.display = 'none';
        const chips = SECTION_DEFS.map((d) => makeChip({ label: d.label, value: d.key, checked: ['fieldSettings', 'layoutSettings', 'viewSettings', 'processSettings'].includes(d.key) }));
        chips.forEach((c) => scopeBox.appendChild(c.label));
        root.appendChild(scopeBox);
        incSettings.checkbox.addEventListener('change', () => {
          scopeBox.style.display = incSettings.checkbox.checked ? 'flex' : 'none';
        });
        root.appendChild(makeNote('ZIP には records.csv / records.json と manifest.json を含みます。取得できなかった添付・コメント・設定は manifest.json に記録し、完了メッセージに件数を表示します。'));

        const run = makeButton('バックアップ ZIP を保存', 'primary', { icon: '↓' });
        run.style.width = '100%';
        run.addEventListener('click', () => liteRun(panel, 'レコードバックアップ中…', async () => {
          await runRecordAppBatchStandalone(tgtApp.value, (appId) => runRecordBackupStandalone(
            {
              appId,
              guestId: tgtGuest.value.trim(),
              query: query.value.trim(),
              zipName: zipName.value.trim(),
              includeFiles: incFiles.checkbox.checked,
              includeComments: incComments.checkbox.checked,
              includeAppSettings: incSettings.checkbox.checked,
              appScopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value)
            },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          ), (m, e) => panel.setStatus(m, e ? 'err' : 'busy'));
        }));
        addAction({ id: 'backup', label: 'バックアップを保存', description: 'レコードと選択した関連データをZIPで保存します。', button: run, validate: requiredApps, summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['保存内容', ['レコード', incFiles.checkbox.checked ? '添付ファイル' : '', incComments.checkbox.checked ? 'コメント' : '', incSettings.checkbox.checked ? '選択したアプリ設定' : ''].filter(Boolean).join('、')]] });
        root.appendChild(makeRow(run));
      }
    }
  ]);

  tabHost.appendChild(tabs.bar);
  tabHost.appendChild(tabs.panels);

  tabs.bar.hidden = true;
  tgtGuest.setAttribute('aria-label', '対象のゲストスペースID');
  installLiteWorkflow(panel, { setup: [cardApp.card, tabHost], actions: recordActions });

}
