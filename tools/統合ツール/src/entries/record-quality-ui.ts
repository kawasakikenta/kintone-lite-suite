'use strict';

import { createLitePanel, makeInput, makeButton, makeCheck, makeRow, makeNote, liteRun } from './litePanelTheme.js';
import type { LiteWorkflowAction } from './liteWorkflow.js';
import { runLoadQualityFieldsStandalone, runRecordQualityStandalone, runCsvTemplateStandalone } from '../tabs/record-quality-standalone.js';
import { qualityRecordPath, qualityReportCsv, type QualityAppResult, type QualityField } from '../tabs/record-quality.js';
import { downloadBlob, buildExportFilename } from '../utils.js';

interface QualityContext {
  panel: ReturnType<typeof createLitePanel>;
  tgtApp: HTMLInputElement; tgtGuest: HTMLInputElement;
  resetMetadata: Array<() => void>;
  requiredApps: () => string;
  targetSummary: () => [string, string];
  applyViewQuery: (target: HTMLInputElement) => void;
  resultHost: HTMLElement;
}

export function buildRecordQualityTab(root: HTMLElement, context: QualityContext): LiteWorkflowAction {
  const { panel, tgtApp, tgtGuest, resetMetadata, requiredApps, targetSummary, applyViewQuery } = context;
  const query = makeInput({ placeholder: '空欄で全件。検査対象を一覧から絞り込めます', width: 'wide', ariaLabel: 'データ検査のクエリ' });
  const useView = makeButton('▼ 一覧から', 'sub');
  useView.addEventListener('click', () => applyViewQuery(query));
  root.appendChild(makeRow([query, useView], { label: 'クエリ' }));
  const load = makeButton('検査フィールド読込', 'sub');
  const search = makeInput({ placeholder: 'フィールド名・コードで絞り込み', width: 'wide', ariaLabel: '検査フィールド検索' });
  const fieldBox = document.createElement('div');
  fieldBox.setAttribute('role', 'group'); fieldBox.setAttribute('aria-label', '検査するフィールド');
  fieldBox.style.cssText = 'max-height:210px;overflow:auto;display:grid;gap:6px;padding:4px;overflow-wrap:anywhere';
  const note = makeNote('先頭の対象アプリからフィールドを読み込み、1〜5項目を選んでください。');
  const trim = makeCheck({ label: '文字列・リンクの前後の空白を無視', checked: false });
  const ignoreCase = makeCheck({ label: '文字列・リンクの英字の大小を無視', checked: false });
  root.append(makeRow(load), search, fieldBox, note, makeRow([trim.label, ignoreCase.label]));
  root.appendChild(makeNote('選んだ項目すべてが一致するレコードを、アプリごとに重複として検出します。空の項目があるレコードは未入力として別集計します。複数選択は順序を無視して比較します。'));
  root.appendChild(makeNote('テーブル内・添付・計算・システム項目は対象外です。取得できたレコードだけを検査し、取得不可の項目は未入力と区別します。アプリ間の重複は検査しません。'));
  let fields: QualityField[] = [], selected = new Set<string>(), version = 0, fieldsVersion = 0;
  let results: QualityAppResult[] = [];
  const output = document.createElement('div'); output.setAttribute('aria-label', 'データ検査結果');
  output.setAttribute('aria-live', 'polite');
  const save = makeButton('検査結果をCSVで保存', 'sub'); save.hidden = true;
  const resetResults = () => { version++; results = []; output.replaceChildren(); save.hidden = true; };
  const refreshNote = () => { note.textContent = `選択 ${selected.size}/5項目: ${fields.filter(field => selected.has(field.code)).map(field => `${field.label}［${field.code}］`).join('、') || '未選択'}`; };
  resetMetadata.push(() => {
    fieldsVersion++; fields = []; selected.clear(); fieldBox.replaceChildren(); resetResults();
    note.textContent = '対象アプリが変わりました。検査フィールドを再取得してください。';
  });
  for (const input of [query, trim.checkbox, ignoreCase.checkbox]) {
    input.addEventListener('input', resetResults); input.addEventListener('change', resetResults);
  }
  function renderFields() {
    const filter = search.value.toLowerCase(); fieldBox.replaceChildren();
    for (const field of fields.filter(field => `${field.label} ${field.code}`.toLowerCase().includes(filter))) {
      const check = makeCheck({ label: `${field.label}［${field.code}］ / ${field.type}`, checked: selected.has(field.code) });
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
  load.addEventListener('click', () => liteRun(panel, '検査フィールドを取得中…', async () => {
    const current = ++fieldsVersion;
    fields = []; selected.clear(); fieldBox.replaceChildren(); resetResults(); refreshNote();
    const loaded = await runLoadQualityFieldsStandalone({ appIdsText: tgtApp.value, guestId: tgtGuest.value.trim() });
    if (current !== fieldsVersion) { panel.setStatus('対象が変わりました。再取得してください。', 'warn'); return; }
    fields = loaded; renderFields();
    note.textContent = `${fields.length}項目を取得しました。1〜5項目を選んでください。`;
    panel.setStatus(note.textContent, fields.length ? 'ok' : 'warn');
  }));
  const run = makeButton('重複・未入力を検査', 'primary');
  run.addEventListener('click', () => liteRun(panel, 'レコードを検査中…', async () => {
    resetResults(); const current = version;
    const guestId = tgtGuest.value.trim(), options = { trimText: trim.checkbox.checked, ignoreCase: ignoreCase.checkbox.checked };
    const queryText = query.value.trim();
    const inspected = await runRecordQualityStandalone({ appIdsText: tgtApp.value, guestId, codes: [...selected], query: queryText, ...options }, message => panel.setStatus(message, 'busy'));
    if (current !== version) { panel.setStatus('対象や条件が変わりました。もう一度検査してください。', 'warn'); return; }
    results = inspected;
    let warning = false;
    for (const result of results) {
      const report = result.report;
      if (!report) { warning = true; output.appendChild(makeNote(`App ${result.appId}: 検査失敗 / ${result.error}`)); continue; }
      warning ||= report.unavailableRecords > 0;
      output.appendChild(makeNote(`App ${result.appId}: ${report.total}件を検査 / 重複 ${report.duplicateGroups}組・${report.duplicateRecords}件 / 未入力 ${report.emptyRecords}件 / 取得不可 ${report.unavailableRecords}件`));
      const list = document.createElement('ol');
      list.style.cssText = 'max-height:320px;overflow:auto;padding-left:24px;overflow-wrap:anywhere;font-size:12px';
      for (const finding of report.findings.slice(0, 50)) {
        const row = document.createElement('li'), link = document.createElement('a');
        link.textContent = `レコード ${finding.recordId}`;
        const recordPath = qualityRecordPath(result.appId, guestId, finding.recordId);
        if (recordPath) { link.href = recordPath; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        row.append(document.createTextNode(`${finding.kind}${finding.group ? ` #${finding.group}` : ''} / `), link,
          document.createTextNode(` / ${finding.fields.join(', ')} / ${finding.values.map(value => value.length > 120 ? value.slice(0, 120) + '…' : value).join(' | ')}`));
        list.appendChild(row);
      }
      if (list.childElementCount) output.appendChild(list);
      if (report.findings.length > 50) output.appendChild(makeNote(`詳細表示は先頭50件です。CSVには全 ${report.findings.length}件を保存します。`));
    }
    save.onclick = () => {
      if (!results.length || current !== version) return;
      downloadBlob(buildExportFilename('データ検査結果', 'csv'), new Blob([qualityReportCsv(results, guestId, location.origin, options, queryText)], { type: 'text/csv;charset=utf-8' }));
      panel.setStatus('検査結果を保存しました。', warning ? 'warn' : 'ok');
    };
    save.hidden = false;
    panel.setStatus(`${results.length}アプリの検査が完了しました。${warning ? '取得不可・失敗の詳細を確認してください。' : '結果を確認し、必要に応じてCSVを保存できます。'}`, warning ? 'warn' : 'ok');
  }));
  root.appendChild(makeRow(run));
  context.resultHost.append(output, makeRow(save));
  return { id: 'quality', label: '重複・未入力を検査', description: '複数項目の重複・未入力を調べ、該当レコードを確認します。', button: run,
    validate: () => requiredApps() || (selected.size ? '' : '検査フィールドを読み込んで1〜5項目を選んでください。'),
    summary: () => [targetSummary(), ['条件', query.value.trim() || '全件'], ['検査項目', [...selected].join('、')], ['比較', `前後空白 ${trim.checkbox.checked ? '無視' : '区別'} / 大小文字 ${ignoreCase.checkbox.checked ? '無視' : '区別'}`]] };
}

export function buildCsvTemplateTab(root: HTMLElement, context: QualityContext): LiteWorkflowAction {
  const { panel, tgtApp, tgtGuest, requiredApps, targetSummary } = context;
  root.appendChild(makeNote('対象アプリの設定から、このツールのCSV取込に使えるひな形を作成します。フィールドコードを調べて入力する手間を省けます。'));
  root.appendChild(makeNote('ZIP内のアプリ別フォルダに import.csv、必須・選択肢・初期値などをまとめた fields.csv、除外項目の excluded.csv、使い方の README.txt を保存します。ひな形にはデータ行を入れません。'));
  root.appendChild(makeNote('取込に非対応のテーブル・添付・計算項目・ルックアップのコピー先は除外します。設定を取得できなかったアプリは完了メッセージと manifest.json に記録します。'));
  const run = makeButton('CSVひな形をZIPで保存', 'primary');
  run.addEventListener('click', () => liteRun(panel, 'CSVひな形を作成中…', async () => {
    const result = await runCsvTemplateStandalone({ appIdsText: tgtApp.value, guestId: tgtGuest.value.trim() }, message => panel.setStatus(message, 'busy'));
    if (result.warning) panel.setStatus(result.warning, 'warn');
  }));
  root.appendChild(makeRow(run));
  return { id: 'csv-template', label: 'CSV取込ひな形を作成', description: 'アプリのフィールドから取込CSVと入力ガイドを作ります。', button: run, validate: requiredApps,
    summary: () => [targetSummary(), ['保存内容', 'CSVひな形・入力ガイド・除外項目・使い方（ZIP）'], ['データ行', 'なし（2行目から入力してください）']] };
}
