'use strict';

import { createLitePanel, makeInput, makeButton, makeCheck, makeRow, makeNote, liteRun } from './litePanelTheme.js';
import type { LiteWorkflowAction } from './liteWorkflow.js';
import { runLoadQualityFieldsStandalone, runRecordQualityStandalone, runCsvTemplateStandalone } from '../tabs/record-quality-standalone.js';
import { toPanelTone } from '../tabs/record-standalone.js';
import { qualityRecordPath, qualityReportCsv, type QualityAppResult, type QualityField } from '../tabs/record-quality.js';
import { downloadBlob, buildExportFilename } from '../utils.js';
import { formatCancelledHeadline } from '../tabs/run-cancel-summary.js';

interface QualityContext {
  panel: ReturnType<typeof createLitePanel>;
  tgtApp: HTMLInputElement; tgtGuest: HTMLInputElement;
  resetMetadata: Array<() => void>;
  requiredApps: () => string;
  targetSummary: () => [string, string];
  applyViewQuery: (target: HTMLInputElement) => void;
  resultHost: HTMLElement;
  /** 比較オプション（空白・大小文字の無視）を置く場所。詳細設定やオプションのポップアップ内を渡す。 */
  optionsHost: HTMLElement;
  /** 実行ボタンの直前に置く行（オプションのポップアップを開くボタンなど）。 */
  optionsRow?: HTMLElement;
}

/** record-quality-standalone.ts が中止で手を付けなかったアプリに付ける理由。 */
const NOT_RUN_CANCELLED = '未実行（中止）';

export function buildRecordQualityTab(root: HTMLElement, context: QualityContext): LiteWorkflowAction {
  const { panel, tgtApp, tgtGuest, resetMetadata, requiredApps, targetSummary, applyViewQuery, optionsHost, optionsRow } = context;
  const query = makeInput({ placeholder: '空欄で全件。検査対象を一覧から絞り込めます', width: 'wide', ariaLabel: 'データ検査のクエリ' });
  const useView = makeButton('▼ 一覧から', 'sub');
  useView.addEventListener('click', () => applyViewQuery(query));
  root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
  const load = makeButton('検査フィールド読込', 'sub');
  const search = makeInput({ placeholder: 'フィールド名・コードで絞り込み', width: 'wide', ariaLabel: '検査フィールド検索' });
  const clearSelection = makeButton('選択解除', 'sub');
  const countBadge = document.createElement('span');
  countBadge.className = 'kus-lp__count';
  countBadge.textContent = '選択 0 / 5';
  const pickWrap = document.createElement('div');
  pickWrap.className = 'kus-lp__picklist';
  pickWrap.hidden = true;
  const pickHead = document.createElement('div');
  pickHead.className = 'kus-lp__picklist-head';
  pickHead.append(search, countBadge, clearSelection);
  const fieldBox = document.createElement('div');
  fieldBox.className = 'kus-lp__picklist-body';
  fieldBox.setAttribute('role', 'group'); fieldBox.setAttribute('aria-label', '検査するフィールド');
  pickWrap.append(pickHead, fieldBox);
  const note = makeNote('先頭の対象アプリからフィールドを読み込み、1〜5項目を選んでください。');
  const trim = makeCheck({ label: '文字列・リンクの前後の空白を無視', checked: false });
  const ignoreCase = makeCheck({ label: '文字列・リンクの英字の大小を無視', checked: false });
  root.append(makeRow(load), pickWrap, note);
  optionsHost.appendChild(makeRow([trim.label, ignoreCase.label]));
  root.appendChild(makeNote('選んだ項目がすべて一致するレコードを、アプリごとに重複として検出します（項目の順序は問いません）。空の項目があるレコードは、未入力として別に集計します。', 'help'));
  root.appendChild(makeNote('テーブル内・添付・計算・システム項目と、アプリ間の重複は対象外です。取得できたレコードだけを検査し、取得不可の項目は未入力と区別します。', 'help'));
  let fields: QualityField[] = [], selected = new Set<string>(), version = 0, fieldsVersion = 0;
  let results: QualityAppResult[] = [];
  const output = document.createElement('div'); output.setAttribute('aria-label', 'データ検査結果');
  output.setAttribute('aria-live', 'polite');
  const save = makeButton('検査結果をCSVで保存', 'sub'); save.hidden = true;
  const clearResults = () => { version++; results = []; output.replaceChildren(); save.hidden = true; };
  // Do not leave a "completed" message on screen once the result it describes is gone.
  const resetResults = () => {
    const stale = results.length > 0 && panel.status.dataset.tone !== 'busy';
    clearResults();
    if (stale) panel.setStatus('対象や条件が変わりました。もう一度検査してください。', 'warn');
  };
  const isBusy = () => panel.root.getAttribute('aria-busy') === 'true';
  const validate = () => requiredApps() || (selected.size ? '' : '検査フィールドを読み込んで1〜5項目を選んでください。');
  const refreshNote = () => {
    note.textContent = `選択 ${selected.size}/5項目: ${fields.filter(field => selected.has(field.code)).map(field => `${field.label}［${field.code}］`).join('、') || '未選択'}`;
    countBadge.textContent = `選択 ${selected.size} / 5`;
  };
  resetMetadata.push(() => {
    fieldsVersion++; fields = []; selected.clear(); search.value = ''; fieldBox.replaceChildren(); pickWrap.hidden = true; resetResults();
    note.textContent = '対象アプリが変わりました。検査フィールドを再取得してください。';
    countBadge.textContent = '選択 0 / 5';
  });
  clearSelection.addEventListener('click', () => {
    if (!selected.size) return;
    selected.clear();
    fieldBox.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(box => { box.checked = false; });
    resetResults(); refreshNote();
  });
  for (const input of [query, trim.checkbox, ignoreCase.checkbox]) {
    input.addEventListener('input', resetResults); input.addEventListener('change', resetResults);
  }
  function renderFields() {
    const filter = search.value.toLowerCase(); fieldBox.replaceChildren();
    for (const field of fields.filter(field => `${field.label} ${field.code}`.toLowerCase().includes(filter))) {
      const check = makeCheck({ label: `${field.label}［${field.code}］ / ${field.type}`, checked: selected.has(field.code) });
      check.label.classList.add('kus-lp__picklist-item');
      check.checkbox.addEventListener('change', () => {
        if (check.checkbox.checked && selected.size >= 5) { check.checkbox.checked = false; panel.setStatus('フィールドは5項目まで選べます。', 'warn'); return; }
        if (check.checkbox.checked) selected.add(field.code); else selected.delete(field.code);
        resetResults(); refreshNote();
      });
      fieldBox.appendChild(check.label);
    }
    if (fields.length && !fieldBox.childElementCount) fieldBox.appendChild(makeNote('一致するフィールドがありません。検索語を変えてください。'));
  }
  search.addEventListener('input', renderFields);
  load.addEventListener('click', () => isBusy() || liteRun(panel, '検査フィールドを取得中…', async () => {
    const current = ++fieldsVersion;
    fields = []; selected.clear(); search.value = ''; fieldBox.replaceChildren(); pickWrap.hidden = true; resetResults(); refreshNote();
    const loaded = await runLoadQualityFieldsStandalone({ appIdsText: tgtApp.value, guestId: tgtGuest.value.trim() });
    if (current !== fieldsVersion) { panel.setStatus('対象アプリが変わりました。検査フィールドを再取得してください。', 'warn'); return; }
    fields = loaded; pickWrap.hidden = false; renderFields();
    note.textContent = `${fields.length}項目を取得しました。1〜5項目を選んでください。`;
    panel.setStatus(note.textContent, fields.length ? 'ok' : 'warn');
  }));
  const run = makeButton('重複・未入力を検査', 'primary');
  run.addEventListener('click', () => isBusy() || liteRun(panel, 'レコードを検査中…', async () => {
    const problem = validate();
    if (problem) { panel.setStatus(problem, 'warn'); return; }
    resetResults(); const current = version;
    const guestId = tgtGuest.value.trim(), options = { trimText: trim.checkbox.checked, ignoreCase: ignoreCase.checkbox.checked };
    const queryText = query.value.trim();
    const inspected = await runRecordQualityStandalone({ appIdsText: tgtApp.value, guestId, codes: [...selected], query: queryText, ...options }, (message, tone) => panel.setStatus(message, toPanelTone(tone)));
    if (current !== version) { panel.setStatus('対象や条件が変わりました。もう一度検査してください。', 'warn'); return; }
    results = inspected;
    let warning = false;
    const failureLog: string[] = [];
    for (const result of results) {
      const report = result.report;
      if (!report) {
        warning = true;
        if (result.error === NOT_RUN_CANCELLED) { output.appendChild(makeNote(`App ${result.appId}: ${NOT_RUN_CANCELLED}`)); continue; }
        // 画面には原因の 1 行目だけを出し、API の呼び出し内容などの詳細は結果ログへ回す
        const [reason, ...detail] = String(result.error || '不明なエラー').split('\n').map(line => line.trim()).filter(Boolean);
        output.appendChild(makeNote(`App ${result.appId}: 検査に失敗しました（${reason || '不明なエラー'}）`));
        failureLog.push(`App ${result.appId}: ${[reason, ...detail].join('\n  ')}`);
        continue;
      }
      warning ||= report.unavailableRecords > 0;
      output.appendChild(makeNote(`App ${result.appId}: ${report.total}件を検査 / 重複 ${report.duplicateGroups}組・${report.duplicateRecords}件 / 未入力 ${report.emptyRecords}件 / 取得不可 ${report.unavailableRecords}件`));
      const list = document.createElement('ol');
      list.style.cssText = 'max-height:320px;overflow:auto;padding-left:24px;overflow-wrap:anywhere;font-size:12px';
      const renderFindingsList = (limit: number) => {
        list.replaceChildren();
        for (const finding of report.findings.slice(0, limit)) {
          const row = document.createElement('li'), link = document.createElement('a');
          link.textContent = `レコード ${finding.recordId}`;
          const recordPath = qualityRecordPath(result.appId, guestId, finding.recordId);
          if (recordPath) { link.href = recordPath; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
          row.append(document.createTextNode(`${finding.kind}${finding.group ? ` #${finding.group}` : ''} / `), link,
            document.createTextNode(` / ${finding.fields.join(', ')} / ${finding.values.map(value => value.length > 120 ? value.slice(0, 120) + '…' : value).join(' | ')}`));
          list.appendChild(row);
        }
      };
      renderFindingsList(50);
      if (list.childElementCount) output.appendChild(list);
      if (report.findings.length > 50) {
        const moreNote = makeNote(`詳細表示は先頭50件です。CSVには全 ${report.findings.length}件を保存します。`);
        const toggleBtn = makeButton(`全 ${report.findings.length}件を表示`, 'sub');
        let expanded = false;
        toggleBtn.addEventListener('click', () => {
          expanded = !expanded;
          renderFindingsList(expanded ? report.findings.length : 50);
          toggleBtn.textContent = expanded ? '先頭50件のみ表示' : `全 ${report.findings.length}件を表示`;
          moreNote.textContent = expanded
            ? `全 ${report.findings.length}件を表示しています。`
            : `詳細表示は先頭50件です。CSVには全 ${report.findings.length}件を保存します。`;
        });
        output.append(moreNote, makeRow(toggleBtn));
      }
    }
    if (failureLog.length) panel.setResult(failureLog.join('\n'));
    save.onclick = () => {
      if (!results.length || current !== version) return;
      downloadBlob(buildExportFilename('データ検査結果', 'csv'), new Blob([qualityReportCsv(results, guestId, location.origin, options, queryText)], { type: 'text/csv;charset=utf-8' }));
      panel.setStatus('検査結果をCSVで保存しました。', warning ? 'warn' : 'ok');
    };
    save.hidden = false;
    // 失敗・中止したアプリを「検査しました」と数えない（全件失敗は警告ではなくエラーとして示す）。
    const cancelledApps = results.filter(result => !result.report && result.error === NOT_RUN_CANCELLED).length;
    const failedApps = results.filter(result => !result.report && result.error !== NOT_RUN_CANCELLED).length;
    const inspectedApps = results.length - cancelledApps - failedApps;
    if (cancelledApps) {
      panel.setStatus(`${formatCancelledHeadline(results.length - cancelledApps, results.length)}。検査済みの結果だけを表示します${failedApps ? `（失敗 ${failedApps}アプリ）` : ''}。`, 'warn');
    } else if (!inspectedApps) {
      panel.setStatus(`検査に失敗しました（${failedApps}アプリ）。原因は下の結果で確認してください。`, 'err');
    } else if (failedApps) {
      panel.setStatus(`${results.length}アプリ中 ${inspectedApps}アプリを検査し、${failedApps}アプリは失敗しました。失敗の内容は下の結果で確認してください。`, 'warn');
    } else {
      panel.setStatus(`${results.length}アプリを検査しました。${warning ? '取得不可・失敗の詳細を確認してください。' : '結果を確認し、必要ならCSVで保存してください。'}`, warning ? 'warn' : 'ok');
    }
  }));
  if (optionsRow) root.appendChild(optionsRow);
  root.appendChild(makeRow(run));
  context.resultHost.append(output, makeRow(save));
  return { id: 'quality', label: '重複・未入力を検査', description: '選んだ項目の重複と未入力を検査し、該当レコードを一覧で表示します。', button: run,
    validate,
    summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['検査項目', [...selected].join('、')], ['比較', `前後空白 ${trim.checkbox.checked ? '無視' : '区別'} / 大小文字 ${ignoreCase.checkbox.checked ? '無視' : '区別'}`]] };
}

export function buildCsvTemplateTab(root: HTMLElement, context: QualityContext): LiteWorkflowAction {
  const { panel, tgtApp, tgtGuest, requiredApps, targetSummary } = context;
  root.appendChild(makeNote('このツールのCSV取込で使うひな形を、対象アプリのフィールド設定から作ります。フィールドコードを調べて入力する手間を省けます。', 'help'));
  root.appendChild(makeNote('ZIP内のアプリ別フォルダに import.csv、必須・選択肢・初期値などをまとめた fields.csv、除外項目の excluded.csv、使い方の README.txt を保存します。ひな形にはデータ行を入れません。', 'help'));
  root.appendChild(makeNote('取込できないテーブル・添付・計算項目・ルックアップのコピー先フィールドは除外します。設定を取得できなかったアプリは、完了メッセージと manifest.json に記録します。', 'help'));
  const run = makeButton('CSVひな形をZIPで保存', 'primary');
  run.addEventListener('click', () => liteRun(panel, 'CSVひな形を作成中…', async () => {
    const result = await runCsvTemplateStandalone({ appIdsText: tgtApp.value, guestId: tgtGuest.value.trim() }, (message, tone) => panel.setStatus(message, toPanelTone(tone)));
    if (result.warning) panel.setStatus(result.warning, 'warn');
  }));
  root.appendChild(makeRow(run));
  return { id: 'csv-template', label: 'CSV取込ひな形を作成', description: 'アプリのフィールド設定から、取込用CSVのひな形と入力ガイドをZIPで保存します。', button: run, validate: requiredApps,
    summary: () => [targetSummary(), ['保存内容', 'CSVひな形・入力ガイド・除外項目・使い方（ZIP）'], ['データ行', 'なし（2行目から入力してください）']] };
}
