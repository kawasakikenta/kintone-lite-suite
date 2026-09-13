'use strict';

import { installLiteWorkflow, connectionSummary, type LiteWorkflowAction } from './liteWorkflow.js';

import { DEFAULT_APP_ID, SECTION_DEFS } from '../constants.js';
import {
  runCsvExportBatchStandalone,
  runCsvImportBatchStandalone,
  runPreviewCsvImportStandalone,
  runBatchProcessStandalone,
  runRecordCopyStandalone,
  runAttachmentDownloadStandalone,
  runRecordBackupStandalone,
  runLoadStatusActionsStandalone,
  runLoadViewsStandalone,
  runLoadAttachmentFieldsStandalone,
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
import type { RecordViewChoice, AttachmentFieldChoice } from '../tabs/record-metadata.js';
import { formatCsvImportReport } from '../tabs/record-csv-import.js';
import { describeProcessAction, processActionQuery, type ProcessActionChoice } from '../tabs/record-process-metadata.js';
import { buildRecordQualityTab, buildCsvTemplateTab } from './record-quality-ui.js';

export function mountRecordLitePanel() {
  const panel = createLitePanel({
    id: 'kus-record-lite',
    title: 'レコード管理',
    subtitle: 'CSV / データ検査 / バッチ更新 / 添付DL / コピー / バックアップ',
    accent: 'record',
    badges: [{ label: 'Lite' }, { label: '本番データ操作あり' }],
    hint: '<strong>本番データに直接書き込み・更新・コピーします。</strong>バックアップ取得を強く推奨します。',
    wide: true
  });

  // ---- 接続情報（共通） ----
  const tgtApp = makeInput({ placeholder: 'アプリID（カンマ区切りで複数指定）', value: DEFAULT_APP_ID || '', width: 'wide', ariaLabel: '対象アプリID' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  let connectionVersion = 0;
  const resetMetadata: Array<() => void> = [];
  for (const input of [tgtApp, tgtGuest]) {
    for (const event of ['input', 'change']) input.addEventListener(event, () => {
      connectionVersion++;
      resetMetadata.forEach(reset => reset());
    });
  }
  function notifyInput(input: HTMLInputElement) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const cardApp = makeCard({ title: '接続情報', number: 1 });
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '対象アプリ' }));
  cardApp.body.appendChild(makeNote('複数アプリは「463,464,469」のようにカンマ、改行、または空白で区切って指定できます。選択した操作を上から順にすべてのアプリへ実行します。'));
  cardApp.body.appendChild(makeNote('クエリに limit / offset は指定できません。order by を付けた場合は cursor API、無い場合はレコード ID 順で全件取得します（10,000 件超も可）。'));
  cardApp.body.appendChild(createAppSearchControl(panel, {
    guestEl: tgtGuest,
    targets: [{ label: '対象アプリ', apply: (id, _name, guestId) => { tgtApp.value = id; if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId; notifyInput(tgtApp); } }]
  }));
  panel.body.insertBefore(cardApp.card, panel.status);

  // 一覧ロード補助
  const viewSelect = makeSelect([['', '一覧を選択（任意）']]);
  viewSelect.setAttribute('aria-label', '取得した一覧');
  const loadViewsBtn = makeButton('一覧読込', 'sub');
  cardApp.body.appendChild(makeRow([loadViewsBtn, viewSelect], { label: '一覧から条件' }));
  const viewNote = makeNote('先頭の対象アプリから一覧を取得し、各操作の「一覧から」で絞り込みと並び順をクエリに反映します。カレンダーの日付範囲やカスタマイズ画面の独自処理は含みません。');
  cardApp.body.appendChild(viewNote);
  let loadedViews: RecordViewChoice[] = [];
  resetMetadata.push(() => {
    loadedViews = [];
    viewSelect.replaceChildren(new Option('一覧を選択（任意）', ''));
    viewNote.textContent = '対象アプリが変わりました。「一覧読込」で再取得してください。';
  });
  viewSelect.addEventListener('change', () => {
    const view = loadedViews.find(item => item.id === viewSelect.value);
    const scopeNote = view?.type === 'CALENDAR' ? '（カレンダーの表示月による絞り込みは含みません）'
      : view?.type === 'CUSTOM' ? '（カスタマイズ画面の独自処理は含みません）' : '';
    viewNote.textContent = view ? `${view.name} / 条件: ${view.filter || '全件'} / 並び順: ${view.sort || 'レコードID順'}${scopeNote}` : '適用する一覧を選んでください。';
  });

  loadViewsBtn.addEventListener('click', () => liteRun(panel, '一覧情報を取得中…', async () => {
    const version = connectionVersion;
    const [appId] = parseRecordAppIds(tgtApp.value);
    loadedViews = [];
    viewSelect.replaceChildren(new Option('一覧を選択（任意）', ''));
    const views = await runLoadViewsStandalone(
      { appId, guestId: tgtGuest.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    if (version !== connectionVersion) { panel.setStatus('対象アプリが変わりました。一覧を再取得してください。', 'warn'); return; }
    loadedViews = views;
    for (const v of views) {
      const opt = document.createElement('option');
      opt.value = v.id;
      const typeLabel = { LIST: '表', CALENDAR: 'カレンダー', CUSTOM: 'カスタマイズ' }[v.type] || v.type;
      opt.textContent = `${v.name}（${typeLabel}）`;
      viewSelect.appendChild(opt);
    }
    viewNote.textContent = `App ${appId} から ${views.length}件を取得しました。選択した一覧の絞り込み・並び順をクエリに反映できます。`;
    panel.setStatus(viewNote.textContent, views.length ? 'ok' : 'warn');
  }));

  function applyViewQuery(target: HTMLInputElement) {
    const view = loadedViews.find(item => item.id === viewSelect.value);
    if (!view) { panel.setStatus('接続情報で一覧を読み込み、適用する一覧を選んでください。', 'warn'); return; }
    target.value = view.query;
    notifyInput(target);
    panel.setStatus(`「${view.name}」をクエリに反映しました: ${view.query || '全件'}`, 'ok');
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
  const qualityResults = document.createElement('div');
  const qualityContext = { panel, tgtApp, tgtGuest, resetMetadata, requiredApps, targetSummary, applyViewQuery, resultHost: qualityResults };
  const tabs = makeTabs([
    {
      id: 'csv-export', label: 'CSV出力', build: (root) => {
        const query = makeInput({ placeholder: '空欄で全件（例: 更新日時 >= \"2026-01-01T00:00:00Z\"）', width: 'wide' });
        const fname = makeInput({ placeholder: '空欄で自動命名（CSV / テーブルあり・複数アプリはZIP）', width: 'wide' });
        const useView = makeButton('▼ 一覧から', 'sub');
        useView.addEventListener('click', () => applyViewQuery(query));
        root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
        root.appendChild(makeRow(fname, { label: 'ファイル名' }));
        root.appendChild(makeNote('1アプリはCSVで保存します。テーブルがある場合は親レコードとテーブル明細を別CSVにしてZIPにまとめます。複数アプリはアプリ別フォルダを1つのZIPに保存します。'));
        root.appendChild(makeNote('テーブル明細は親レコードの $id で紐付けできます。出力は閲覧・集計用で、CSV取込用の互換形式ではありません。添付はファイル名のみです。ファイル本体はバックアップの「添付ファイルも保存」で取得できます。'));
        const run = makeButton('CSVを出力', 'primary', { icon: '↓' });
        run.style.width = '100%';
        run.addEventListener('click', () => liteRun(panel, 'CSV出力中…', async () => {
          const appIds = parseRecordAppIds(tgtApp.value);
          await runCsvExportBatchStandalone(
            { apps: appIds.map((appId) => ({ appId, guestId: tgtGuest.value.trim() })), query: query.value.trim(), filename: fname.value.trim() },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          );
        }));
        addAction({ id: 'csv-export', label: 'CSVを出力', description: '条件に合うレコードとテーブル明細をCSV / ZIPで保存します。', button: run, validate: requiredApps, summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['保存形式', !requiredApps() && parseRecordAppIds(tgtApp.value).length > 1 ? 'ZIP（アプリ別フォルダに親CSV・テーブル明細CSV）' : 'CSV（テーブルがある場合は親CSV・明細CSVのZIP）'], ['ファイル名', fname.value.trim() || '自動命名']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'csv-import', label: 'CSV取込', build: (root) => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.className = 'kus-lp__file';
        fileInput.setAttribute('aria-label', '取込CSV');
        root.appendChild(makeRow(fileInput, { label: 'CSV' }));
        root.appendChild(makeNote('UTF-8 / Excel BOM 対応。ヘッダ行はフィールドコード。ファイル・サブテーブル・ステータスは取込対象外です。100 件単位で追加し、途中で失敗した場合は確定済み件数と未処理件数を表示します。'));
        const preview = makeButton('CSVを事前検査', 'sub');
        const previewText = document.createElement('pre');
        previewText.setAttribute('aria-label', 'CSV事前検査結果');
        previewText.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto;font-size:12px';
        previewText.hidden = true;
        let csvVersion = 0;
        let previewSummary = '未実施（実行時にも検査します）';
        const clearPreview = () => { csvVersion++; previewSummary = '対象やCSVが変わりました。再検査できます。'; previewText.textContent = ''; previewText.hidden = true; };
        resetMetadata.push(clearPreview);
        fileInput.addEventListener('change', clearPreview);
        preview.addEventListener('click', () => liteRun(panel, 'CSVを事前検査中…', async () => {
          const version = csvVersion;
          const results = await runPreviewCsvImportStandalone({ appIdsText: tgtApp.value, guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
            (message: string, error?: boolean) => panel.setStatus(message, error ? 'warn' : 'busy'));
          if (version !== csvVersion) { panel.setStatus('対象やCSVが変わりました。もう一度事前検査してください。', 'warn'); return; }
          const problemApps = results.filter(result => result.error || result.report?.issueCount).length;
          previewSummary = `${results.length}アプリを検査 / 問題あり ${problemApps}アプリ`;
          previewText.textContent = results.map(result => `App ${result.appId}\n${result.error || formatCsvImportReport(result.report)}${result.report ? '\n先頭5行・6列まで:\n' + result.report.sample.map(sample => `${sample.row}行目: ${sample.values.map(value => JSON.stringify(value)).join(' | ')}`).join('\n') : ''}`).join('\n\n');
          previewText.hidden = false;
          panel.setStatus(`${previewSummary}。まだ書き込んでいません。`, problemApps ? 'warn' : 'ok');
        }));
        root.appendChild(makeRow(preview));
        root.appendChild(previewText);
        root.appendChild(makeNote('全対象アプリで列数・必須項目・選択肢・数値形式・CSV内の同一値重複を確認します。問題があれば最初の書き込み前に止めます。権限や既存データとの重複などは登録時に確認されます。'));
        const run = makeButton('レコードを取込', 'primary', { icon: '↑' });
        run.style.width = '100%';
        run.addEventListener('click', () => liteRun(panel, 'CSV取込中…', async () => {
          const result = await runCsvImportBatchStandalone(
            { appIdsText: tgtApp.value, guestId: tgtGuest.value.trim(), file: fileInput.files?.[0] },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          );
          if (result?.warning) panel.setStatus(result.warning, 'warn');
        }));
        addAction({ id: 'csv-import', label: 'CSVからレコードを追加', description: 'CSVのレコードを対象アプリに新規追加します。', button: run, writes: true, validate: () => requiredApps() || (fileInput.files?.length ? '' : '取り込むCSVを選んでください。'), summary: () => [targetSummary(), ['CSV', fileInput.files?.[0]?.name || '未選択'], ['事前検査', previewSummary], ['処理', '全対象を再検査してから各アプリへ新規レコードを追加']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'csv-template', label: 'CSVひな形', build: root => addAction(buildCsvTemplateTab(root, qualityContext))
    },
    {
      id: 'quality', label: 'データ検査', build: root => addAction(buildRecordQualityTab(root, qualityContext))
    },
    {
      id: 'status', label: 'ステータス', build: (root) => {
        const query = makeInput({ placeholder: '条件 (例: status = "新規")', width: 'wide' });
        const action = makeInput({ placeholder: 'アクション名', width: 'medium' });
        const assignee = makeInput({ placeholder: '次の作業者ログイン名（必要な場合）', width: 'medium' });
        const actionSelect = makeSelect([['', '--']]);
        actionSelect.setAttribute('aria-label', '取得したプロセスアクション');
        const loadActions = makeButton('アクション読込', 'sub');
        const applyActionQuery = makeButton('選択アクションの対象条件を入力', 'sub');
        const actionNote = makeNote('先頭アプリからアクションを取得し、遷移元・実行条件・次の作業者設定を確認できます。');
        actionNote.style.whiteSpace = 'pre-wrap';
        let loadedActions: ProcessActionChoice[] = [];
        let statusFieldCode = '';
        let lastAppliedQuery = '';
        let lastAppliedChoice: ProcessActionChoice | undefined;
        const selectedAction = () => actionSelect.value === '' ? undefined : loadedActions[Number(actionSelect.value)];
        const staleActionQuery = () => !!lastAppliedChoice && !!selectedAction() && selectedAction() !== lastAppliedChoice && query.value === lastAppliedQuery;
        const clearActions = () => { loadedActions = []; statusFieldCode = ''; lastAppliedChoice = undefined; lastAppliedQuery = ''; actionSelect.replaceChildren(new Option('--', '')); actionNote.textContent = 'アクションを読み込んで選択してください。入力済みの名前とクエリは変更しません。'; };
        resetMetadata.push(clearActions);
        const useView = makeButton('▼ 一覧から', 'sub');
        useView.addEventListener('click', () => applyViewQuery(query));

        root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
        root.appendChild(makeRow([action, actionSelect, loadActions], { label: 'アクション' }));
        action.addEventListener('input', () => { actionSelect.value = ''; actionNote.textContent = 'アクション名を手入力しています。対象条件と作業者を確認してください。'; });
        actionSelect.addEventListener('change', () => {
          const choice = selectedAction();
          if (!choice) return;
          const selected = actionSelect.value;
          action.value = choice.name;
          notifyInput(action);
          actionSelect.value = selected;
          actionNote.textContent = describeProcessAction(choice);
          if (staleActionQuery()) actionNote.textContent += '\nクエリには前のアクションの条件が残っています。「対象条件を入力」で更新するか、クエリを編集してください。';
        });
        applyActionQuery.addEventListener('click', () => {
          try {
            const choice = selectedAction();
            if (!choice) throw new Error('先にアクションを読み込んで選択してください。');
            query.value = processActionQuery(choice, statusFieldCode);
            lastAppliedQuery = query.value;
            lastAppliedChoice = choice;
            actionNote.textContent = describeProcessAction(choice);
            notifyInput(query);
            panel.setStatus('遷移元と実行条件をクエリに入力しました。対象と次の作業者を確認してください。', 'ok');
          } catch (error: any) { panel.setStatus(error.message || String(error), 'warn'); }
        });
        loadActions.addEventListener('click', () => liteRun(panel, 'プロセス管理を取得中…', async () => {
          const version = connectionVersion;
          clearActions();
          const [appId] = parseRecordAppIds(tgtApp.value);
          const info = await runLoadStatusActionsStandalone(
            { appId, guestId: tgtGuest.value.trim() },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          );
          if (version !== connectionVersion) { panel.setStatus('対象アプリが変わりました。アクションを再取得してください。', 'warn'); return; }
          loadedActions = info.actions;
          statusFieldCode = info.statusFieldCode;
          for (const [index, a] of info.actions.entries()) {
            const opt = new Option(`${a.name} (${a.from} → ${a.to})${a.type === 'SECONDARY' ? '・作業者以外も可' : ''}${a.ambiguous ? '・同名重複のため指定不可' : ''}`, String(index));
            opt.disabled = a.ambiguous;
            actionSelect.appendChild(opt);
          }
          const ambiguous = info.actions.filter(a => a.ambiguous).length;
          actionNote.textContent = !info.enabled ? 'プロセス管理は無効です。' : `App ${appId}: ${info.actions.length}アクションを取得しました。${ambiguous ? `同じ遷移元の同名アクション ${ambiguous}件はREST APIで指定できません。` : 'アクションを選んで実行条件を確認してください。'}`;
          panel.setStatus(actionNote.textContent, ambiguous || !info.enabled ? 'warn' : 'ok');
        }));
        root.appendChild(actionNote);
        root.appendChild(makeRow(applyActionQuery));
        root.appendChild(makeNote('「対象条件を入力」は現在のクエリを置き換えます。複数アプリでは同じフィールドコード・状態名を使うことを確認してください。実行権限や作業者候補はkintone側で判定されます。'));
        root.appendChild(makeRow(assignee, { label: '次の作業者' }));
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
        addAction({ id: 'status', label: 'ステータスを一括更新', description: '指定条件に合うレコードの状態を更新します。', button: run, writes: true, validate: () => requiredApps() || (action.value.trim() ? '' : '実行するアクションを指定してください。') || (staleActionQuery() ? '前のアクションの対象条件が残っています。条件を入力し直すかクエリを編集してください。' : ''), summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['アクション', action.value.trim()], ['選択した遷移', selectedAction() ? `${selectedAction().from} → ${selectedAction().to}` : '手入力'], ['次の作業者', assignee.value.trim() || '指定なし']] });
        root.appendChild(makeRow(run));
      }
    },
    {
      id: 'attach', label: '添付DL', build: (root) => {
        const query = makeInput({ placeholder: '条件 (任意)', width: 'wide' });
        const fileCode = makeInput({ placeholder: '例: attached_file', width: 'medium' });
        fileCode.setAttribute('aria-label', '添付フィールドコード');
        const tableCode = makeInput({ placeholder: 'テーブル内の場合のみ指定', width: 'medium', ariaLabel: '添付のテーブルコード' });
        const fileSelect = makeSelect([['', '添付フィールドを選択']]);
        fileSelect.setAttribute('aria-label', '取得した添付フィールド');
        const loadFields = makeButton('添付フィールド読込', 'sub');
        const fieldNote = makeNote('先頭アプリのフィールド名から選べます。複数アプリへ実行するときは、各アプリで同じフィールドコードが使われていることを確認してください。');
        let loadedFields: AttachmentFieldChoice[] = [];
        const resetFields = () => {
          loadedFields = [];
          fileSelect.replaceChildren(new Option('添付フィールドを選択', ''));
        };
        resetMetadata.push(() => { resetFields(); fieldNote.textContent = '対象アプリが変わりました。フィールドを再取得し、入力済みのコードを確認してください。'; });
        for (const input of [fileCode, tableCode]) input.addEventListener('input', () => { fileSelect.value = ''; });
        fileSelect.addEventListener('change', () => {
          if (fileSelect.value === '') return;
          const choice = loadedFields[Number(fileSelect.value)];
          if (!choice) return;
          const selected = fileSelect.value;
          fileCode.value = choice.fileFieldCode;
          tableCode.value = choice.tableFieldCode;
          notifyInput(fileCode); notifyInput(tableCode);
          fileSelect.value = selected;
        });
        loadFields.addEventListener('click', () => liteRun(panel, '添付フィールドを取得中…', async () => {
          const version = connectionVersion;
          const [appId] = parseRecordAppIds(tgtApp.value);
          resetFields();
          const fields = await runLoadAttachmentFieldsStandalone({ appId, guestId: tgtGuest.value.trim() },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
          if (version !== connectionVersion) { panel.setStatus('対象アプリが変わりました。フィールドを再取得してください。', 'warn'); return; }
          loadedFields = fields;
          fields.forEach((field, index) => fileSelect.appendChild(new Option(
            `${field.tableFieldCode ? `${field.tableLabel}［${field.tableFieldCode}］ / ` : ''}${field.fileLabel}［${field.fileFieldCode}］`, String(index))));
          fieldNote.textContent = `App ${appId}: 添付フィールド ${fields.length}件。${fields.length ? '名前を選ぶとコードが入力されます。' : '添付フィールドがありません。'}`;
          panel.setStatus(fieldNote.textContent, fields.length ? 'ok' : 'warn');
        }));
        const folderCode = makeInput({ placeholder: '任意（フォルダ名にするフィールド）', width: 'medium' });
        const zipName = makeInput({ placeholder: '空欄で自動命名（添付ファイル_アプリ_日時.zip）', width: 'wide' });
        const useView = makeButton('▼ 一覧から', 'sub');
        useView.addEventListener('click', () => applyViewQuery(query));
        root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
        root.appendChild(makeRow([loadFields, fileSelect], { label: '名前から選択' }));
        root.appendChild(fieldNote);
        root.appendChild(makeRow(fileCode, { label: 'ファイル' }));
        root.appendChild(makeRow(tableCode, { label: 'テーブル' }));
        root.appendChild(makeRow(folderCode, { label: 'フォルダ' }));
        root.appendChild(makeRow(zipName, { label: 'ZIP名' }));
        root.appendChild(makeNote('取得できなかったファイル（閲覧権限なし等）は ZIP 内の download_errors.txt に記録し、完了メッセージに件数を表示します。'));
        root.appendChild(makeNote('テーブル内の添付はレコード・テーブル行ごとに保存します。manifest.json で元レコード、行ID、ファイル名、サイズ、保存先を確認できます。'));
        const run = makeButton('添付ファイルをZIPで保存', 'primary', { icon: '↓' });
        run.style.width = '100%';
        run.addEventListener('click', () => liteRun(panel, '添付ファイル取得中…', async () => {
          await runRecordAppBatchStandalone(tgtApp.value, (appId) => runAttachmentDownloadStandalone(
            {
              appId,
              guestId: tgtGuest.value.trim(),
              query: query.value.trim(),
              fileFieldCode: fileCode.value.trim(),
              tableFieldCode: tableCode.value.trim(),
              folderFieldCode: folderCode.value.trim(),
              zipName: zipName.value.trim()
            },
            (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
          ), (m, e) => panel.setStatus(m, e ? 'err' : 'busy'));
        }));
        addAction({ id: 'attach', label: '添付ファイルを保存', description: '添付ファイルを取得しZIPにまとめます。', button: run, validate: () => requiredApps() || (fileCode.value.trim() ? '' : '添付ファイルのフィールドコードを指定してください。'), summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['添付フィールド', [tableCode.value.trim(), fileCode.value.trim()].filter(Boolean).join(' / ')], ['ZIP名', zipName.value.trim() || '自動命名']] });
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
        root.appendChild(makeNote('ZIPには親レコードの records.csv / records.json と manifest.json を含みます。テーブルがある場合は tables/ に明細CSVを追加し、親レコードの $id で紐付けできます。添付のファイル本体は「添付ファイルも保存」で取得します。'));
        root.appendChild(makeNote('CSVは閲覧・集計用で、CSV取込用の互換形式ではありません。取得できなかった添付・コメント・設定は manifest.json に記録し、完了メッセージに件数を表示します。'));

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
        addAction({ id: 'backup', label: 'バックアップを保存', description: 'レコード・テーブル明細と選択した関連データをZIPで保存します。', button: run, validate: requiredApps, summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['保存内容', ['レコード・テーブル明細', incFiles.checkbox.checked ? '添付ファイル' : '', incComments.checkbox.checked ? 'コメント' : '', incSettings.checkbox.checked ? '選択したアプリ設定' : ''].filter(Boolean).join('、')]] });
        root.appendChild(makeRow(run));
      }
    }
  ]);

  tabHost.appendChild(tabs.bar);
  tabHost.appendChild(tabs.panels);

  tabs.bar.hidden = true;
  tgtGuest.setAttribute('aria-label', '対象のゲストスペースID');
  installLiteWorkflow(panel, { setup: [cardApp.card, tabHost], actions: recordActions, results: [qualityResults], resultActions: ['quality'] });

}
