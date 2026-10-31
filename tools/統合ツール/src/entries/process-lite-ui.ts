'use strict';

import { installLiteWorkflow, foldWorkflowSection, connectionSummary, summarizeList } from './liteWorkflow.js';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import {
  runRenderProcessFlowStandalone,
  validateProcessConnection,
  runProcessBatchZipStandalone,
  validateProcessBatchTargets,
  formatProcessBatchResultLines,
  buildProcessSpecMarkdown,
  formatProcessSimulationHistory
} from '../tabs/process-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeAppTable,
  makeCard,
  makeNote,
  attachCardHelp,
  liteRun,
  copyTextToClipboard
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { downloadText, buildExportFilename, buildAppFilenameLabel } from '../utils.js';

export function mountProcessLitePanel() {
  const panel = createLitePanel({
    id: 'kus-process-lite',
    title: 'プロセス図',
    subtitle: 'プロセス管理を Mermaid フロー図で描画し、シミュレーションで動きを確認します。',
    accent: 'process',
    badges: [{ label: '読み取り専用', tone: 'read' }],
    hint: 'プロセス管理の流れと状態遷移を図で確認できます。シミュレーションは画面上だけで動き、レコードや設定は変更しません。'
  });

  // ---- 入力 ----
  const cardApp = makeCard({ title: '対象アプリ', number: 1 });
  const appInp = makeInput({ placeholder: 'アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', value: DEFAULT_GUEST_ID, width: 'guest' });
  const prevCb = makeCheck({ label: 'プレビュー環境を参照', checked: false });
  const singleAppRow = makeRow([appInp, guestInp], { label: 'アプリ' });
  cardApp.body.appendChild(singleAppRow);

  // まとめて出力する対象（複数アプリ / 環境内の全アプリ）。ZIP 出力を選んだときだけ表示する
  const batchBox = document.createElement('div');
  batchBox.hidden = true;
  const batchLabel = document.createElement('div');
  batchLabel.className = 'kus-lp__label';
  batchLabel.textContent = 'まとめて出力する対象';
  const appTable = makeAppTable({
    currentAppId: String(DEFAULT_APP_ID || ''),
    currentGuestId: DEFAULT_GUEST_ID,
    initial: DEFAULT_APP_ID ? [{ appId: String(DEFAULT_APP_ID), guestId: DEFAULT_GUEST_ID }] : []
  });
  // 単体の対象アプリ欄のゲストスペースIDとは連動させない（検索結果の流し込み先は対象表だけ）
  const batchSearch = createAppSearchControl(panel, {
    title: 'アプリを検索して対象表に追加（名前・コード・ID）',
    targets: [{
      apply: (appId, appName, guestId) => {
        const result = appTable.putApp(appId, guestId, { appName, focus: true });
        return { message: `アプリ #${appId}${appName ? ` (${appName})` : ''} を対象表に${result.action === 'existing' ? '追加済みです' : '追加しました'}` };
      },
      applyAll: (apps, guestId) => {
        const result = appTable.putApps(apps.map((app) => ({ appId: app.appId, guestId, appName: app.appName })));
        const parts = [`新規 ${result.added + result.filled}件`, result.existing ? `追加済み ${result.existing}件` : ''].filter(Boolean);
        return { message: `候補 ${apps.length}件を対象表に追加しました（${parts.join(' / ')}）`, pickedLabel: '追加済み' };
      }
    }]
  });
  batchBox.append(batchLabel, appTable.element, batchSearch,
    makeNote('「環境内の全アプリ」で、閲覧できるアプリをまとめて対象表に追加できます。ゲストスペースのアプリは含まれないため、ゲストスペースIDごとに追加してください。「プレビュー環境を参照」はここにも適用されます。', 'help'));
  cardApp.body.appendChild(batchBox);

  cardApp.body.appendChild(makeRow(prevCb.label));
  let notifyConnectionChange: () => void = () => {};
  const singleSearch = createAppSearchControl(panel, {
    guestEl: guestInp,
    targets: [{ apply: (id, _name, guestId) => { appInp.value = id; guestInp.value = guestId || ''; notifyConnectionChange(); } }]
  });
  cardApp.body.appendChild(singleSearch);
  const singleEls: HTMLElement[] = [singleAppRow, singleSearch];
  const showBatchTarget = (batch: boolean) => {
    for (const el of singleEls) el.hidden = batch;
    batchBox.hidden = !batch;
  };

  const runBtn = makeButton('フロー図を描画', 'run', { icon: '◐' });
  const batchBtn = makeButton('複数アプリのプロセス図をZIPで保存', 'run', { icon: '↓' });
  cardApp.body.appendChild(runBtn);
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- 描画 ----
  const cardDiag = makeCard({ title: 'プロセス図', number: 2, soft: true });
  const summaryEl = document.createElement('div');
  summaryEl.style.cssText = 'margin-bottom:8px';
  cardDiag.body.appendChild(summaryEl);
  const viewEl = document.createElement('div');
  viewEl.style.cssText = 'min-height:64px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;overflow:auto;max-height:340px';
  viewEl.innerHTML = '<span class="kus-lp__small">描画結果がここに表示されます</span>';
  cardDiag.body.appendChild(viewEl);
  panel.body.insertBefore(cardDiag.card, panel.status);

  // ---- Mermaid テキスト ----
  const cardText = makeCard({ title: 'Mermaid ソース', soft: true });
  const textEl = document.createElement('textarea');
  textEl.className = 'kus-lp__textarea kus-lp__textarea--code';
  textEl.rows = 5;
  textEl.readOnly = true;
  textEl.placeholder = 'Mermaid 用ソースがここに表示されます';
  cardText.body.appendChild(textEl);
  cardText.body.appendChild(makeNote('このソースを Mermaid Live Editor や Markdown の ```mermaid ブロックに貼り付けると、同じ図を共有できます。', 'help'));
  const copySource = makeButton('ソースをコピー', 'sub', { icon: '⎘' });
  const saveSource = makeButton('.mmd で保存', 'sub', { icon: '↓' });
  const saveSvg = makeButton('SVGで保存', 'sub', { icon: '↓' });
  const copySpecMd = makeButton('仕様書MDをコピー', 'sub', { icon: '⎘' });
  const saveSpecMd = makeButton('仕様書.mdで保存', 'sub', { icon: '↓' });
  cardText.actions.style.flexWrap = 'wrap';
  if (cardText.actions.parentElement) cardText.actions.parentElement.style.flexWrap = 'wrap';
  cardText.actions.appendChild(copySource);
  cardText.actions.appendChild(saveSource);
  cardText.actions.appendChild(saveSvg);
  cardText.actions.appendChild(copySpecMd);
  cardText.actions.appendChild(saveSpecMd);
  copySource.addEventListener('click', async () => {
    const text = textEl.value.trim();
    if (!text) { panel.setStatus('コピーするソースがありません。先にフロー図を描画してください', 'warn'); return; }
    if (await copyTextToClipboard(text)) {
      panel.setStatus('Mermaid ソースをクリップボードにコピーしました', 'ok');
    } else {
      textEl.focus();
      textEl.select();
      panel.setStatus('クリップボードを使えないため、ソースを選択しました。Ctrl/Cmd+C でコピーしてください', 'warn');
    }
  });
  saveSource.addEventListener('click', () => {
    const text = textEl.value.trim();
    if (!text) { panel.setStatus('保存するソースがありません。先にフロー図を描画してください', 'warn'); return; }
    const appId = appInp.value.trim();
    const guestId = guestInp.value.trim();
    const header = [
      `%% kintone プロセス図 / アプリ ${appId || '?'}${guestId ? ` / ゲストスペース ${guestId}` : ''} / 生成 ${new Date().toLocaleString('ja-JP', { hour12: false })}`,
      '%% Mermaid Live Editor（https://mermaid.live）や Markdown の ```mermaid ブロックに貼り付けると図として表示できます。'
    ].join('\n');
    downloadText(buildExportFilename('プロセス図', 'mmd', { appLabel: buildAppFilenameLabel(appId, '') }), `${header}\n${text}\n`, 'text/plain');
    panel.setStatus('Mermaid ソースを保存しました', 'ok');
  });
  saveSvg.addEventListener('click', () => {
    const svg = viewEl.querySelector('svg');
    if (!svg) { panel.setStatus('保存できるSVGがありません。先にフロー図を描画してください', 'warn'); return; }
    const clone = svg.cloneNode(true) as SVGElement;
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const xml = new XMLSerializer().serializeToString(clone);
    const appId = appInp.value.trim();
    downloadText(buildExportFilename('プロセス図', 'svg', { appLabel: buildAppFilenameLabel(appId, '') }), xml, 'image/svg+xml;charset=utf-8');
    panel.setStatus('フロー図をSVGとして保存しました', 'ok');
  });
  let renderedFlowData: { states: any; actions: any[]; orphanActionCount?: number; summary?: any } | null = null;
  const buildCurrentSpecMd = (): string => {
    if (!renderedFlowData || !textEl.value.trim()) return '';
    return buildProcessSpecMarkdown({
      appId: appInp.value.trim(),
      guestId: guestInp.value.trim(),
      preview: prevCb.checkbox.checked,
      states: renderedFlowData.states,
      actions: renderedFlowData.actions,
      orphanActionCount: renderedFlowData.orphanActionCount,
      summary: renderedFlowData.summary
    });
  };
  copySpecMd.addEventListener('click', async () => {
    const specMd = buildCurrentSpecMd();
    if (!specMd) { panel.setStatus('コピーする仕様書がありません。先にフロー図を描画してください', 'warn'); return; }
    if (await copyTextToClipboard(specMd)) {
      panel.setStatus('プロセス管理仕様書 (Markdown) をクリップボードにコピーしました', 'ok');
    } else {
      panel.setStatus('クリップボードにコピーできませんでした', 'warn');
    }
  });
  saveSpecMd.addEventListener('click', () => {
    const specMd = buildCurrentSpecMd();
    if (!specMd) { panel.setStatus('保存する仕様書がありません。先にフロー図を描画してください', 'warn'); return; }
    const appId = appInp.value.trim();
    downloadText(buildExportFilename('プロセス管理仕様書', 'md', { appLabel: buildAppFilenameLabel(appId, '') }), specMd, 'text/markdown;charset=utf-8');
    panel.setStatus('プロセス管理仕様書 (.md) を保存しました', 'ok');
  });
  attachCardHelp(cardText.card); // 結果画面側のカードなので、「?」への移動はここで行う
  panel.body.insertBefore(cardText.card, panel.status);
  const sourceFold = foldWorkflowSection('図のソースを確認する', cardText.card);

  // ---- シミュレーション ----
  const cardSim = makeCard({ title: 'シミュレーション', number: 3 });
  cardSim.card.style.display = 'none';
  const curRow = document.createElement('div');
  curRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap';
  const curLabel = document.createElement('span');
  curLabel.className = 'kus-lp__label';
  curLabel.textContent = '現在状態';
  const curEl = document.createElement('span');
  curEl.className = 'kus-lp__pill';
  curEl.setAttribute('aria-live', 'polite');
  curEl.textContent = '未開始';
  curRow.appendChild(curLabel);
  curRow.appendChild(curEl);
  cardSim.body.appendChild(curRow);

  const simSelect = document.createElement('select');
  simSelect.className = 'kus-lp__select kus-lp__input--full';
  simSelect.innerHTML = '<option value="">--</option>';
  cardSim.body.appendChild(makeRow(simSelect, { label: 'アクション' }));

  const simStartBtn = makeButton('最初から開始', 'sub', { icon: '⟲' });
  const simUndoBtn = makeButton('1手戻す', 'sub', { icon: '↶' });
  simUndoBtn.disabled = true;
  const simExecBtn = makeButton('アクション実行', 'primary', { icon: '▶' });
  const simCopyHistoryBtn = makeButton('履歴をコピー', 'sub', { icon: '⎘' });
  simCopyHistoryBtn.disabled = true;
  simCopyHistoryBtn.addEventListener('click', async () => {
    const getter = (simCopyHistoryBtn as any).__getSimHistoryText;
    const curState = curEl.textContent && curEl.textContent !== '未開始' ? curEl.textContent : null;
    const text = typeof getter === 'function' ? getter() : (curState ? formatProcessSimulationHistory([], curState, renderedFlowData?.states) : '');
    if (!text) {
      panel.setStatus('コピーするシミュレーション履歴がありません。先に「最初から開始」を押してください', 'warn');
      return;
    }
    if (await copyTextToClipboard(text)) {
      panel.setStatus('シミュレーション遷移履歴をクリップボードにコピーしました', 'ok');
    } else {
      panel.setStatus('クリップボードにコピーできませんでした', 'warn');
    }
  });
  cardSim.body.appendChild(makeRow([simStartBtn, simUndoBtn, simExecBtn, simCopyHistoryBtn]));
  const simDetailEl = makeNote('「最初から開始」を押すと、各状態の作業者設定と選択アクションの実行条件を表示します。');
  const simHistoryEl = makeNote('遷移履歴: まだ開始していません');
  cardSim.body.appendChild(simDetailEl);
  cardSim.body.appendChild(simHistoryEl);
  cardSim.body.appendChild(makeNote('アクションを選んで「アクション実行」を押すと、画面上で状態が進み、遷移履歴に記録されます。レコードは変更されません。', 'help'));
  attachCardHelp(cardSim.card);
  panel.body.insertBefore(cardSim.card, panel.status);

  // 図を出せなかった実行（中止・取得失敗など）では、空の「プロセス図」「ソース」カードを結果画面に残さない
  const setDiagramVisible = (visible: boolean) => {
    cardDiag.card.style.display = visible ? '' : 'none';
    sourceFold.style.display = visible ? '' : 'none';
  };
  setDiagramVisible(false);
  let renderedConnection = '';
  let renderPending = false;
  let connectionVersion = 0;
  const connectionKey = () => `${appInp.value.trim()}::${guestInp.value.trim()}::${prevCb.checkbox.checked ? '1' : '0'}`;
  const clearSimulationHandlers = () => {
    simStartBtn.onclick = null;
    simUndoBtn.onclick = null;
    simExecBtn.onclick = null;
    simSelect.onchange = null;
    (simCopyHistoryBtn as any).__getSimHistoryText = null;
  };
  const clearRenderedFlow = () => {
    renderedConnection = '';
    clearSimulationHandlers();
    textEl.value = '';
    summaryEl.innerHTML = '';
    viewEl.innerHTML = '<span class="kus-lp__small">対象アプリが変わりました。フロー図を再描画してください。</span>';
    cardSim.card.style.display = 'none';
    setDiagramVisible(false);
    curEl.textContent = '未開始';
    curEl.style.background = '#e2e8f0';
    simSelect.replaceChildren(new Option('--'));
    simSelect.disabled = true;
    simUndoBtn.disabled = true;
    simCopyHistoryBtn.disabled = true;
    renderedFlowData = null;
    simDetailEl.textContent = '';
    simHistoryEl.textContent = '';
  };
  notifyConnectionChange = () => {
    connectionVersion++;
    if (!renderedConnection && !renderPending) return;
    clearRenderedFlow();
    panel.setStatus('対象アプリが変わりました。フロー図を再描画してください。', 'warn');
  };
  for (const input of [appInp, guestInp, prevCb.checkbox]) {
    input.addEventListener('input', notifyConnectionChange);
    input.addEventListener('change', notifyConnectionChange);
  }

  runBtn.addEventListener('click', () => liteRun(panel, 'プロセスフロー生成中…', async () => {
    const runVersion = connectionVersion;
    const runConnection = connectionKey();
    const isCurrent = () => connectionVersion === runVersion && connectionKey() === runConnection;
    renderPending = true;
    try {
      const result = await runRenderProcessFlowStandalone(
        { appId: appInp.value.trim(), guestId: guestInp.value.trim(), preview: prevCb.checkbox.checked },
        // 実行完了後（シミュレーション操作）の通知は tone を指定し、処理中スピナーのまま残さない。
        // err 指定は Mermaid の簡易表示切替など描画は継続できる通知なので warn で示す
        (m: string, e?: boolean, tone?: 'ok' | 'warn') => { if (isCurrent()) panel.setStatus(m, e ? 'warn' : (tone || 'busy')); },
        {
          textEl,
          viewEl,
          summaryEl,
          isCurrent,
          // 読み込み先 URL などの技術的な詳細は、状態表示ではなくログへ出す
          log: (text: string) => panel.setResult(text),
          simUi: {
            container: cardSim.card,
            current: curEl,
            select: simSelect,
            startBtn: simStartBtn,
            undoBtn: simUndoBtn,
            execBtn: simExecBtn,
            detailEl: simDetailEl,
            historyEl: simHistoryEl,
            copyHistoryBtn: simCopyHistoryBtn
          }
        }
      );
      if (!isCurrent()) {
        panel.setStatus('対象アプリが変わりました。フロー図を再描画してください。', 'warn');
        return;
      }
      renderedConnection = runConnection;
      renderedFlowData = result || null;
      // 図（またはプロセス管理が無効という案内）を出せた実行だけ、結果画面にカードを見せる
      setDiagramVisible(viewEl.childNodes.length > 0);
      // 描画側が警告（Mermaid 読込失敗 / from-to 未設定のアクション除外）を出している場合は残す
      if (result && panel.status.dataset.tone !== 'err' && panel.status.dataset.tone !== 'warn') {
        panel.setStatus(`プロセス図を表示しました（状態 ${Object.keys(result.states || {}).length}件 / アクション ${(result.actions || []).length}件）`, 'ok');
      }
    } finally {
      renderPending = false;
    }
  }));

  appInp.setAttribute('aria-label', '対象アプリID');
  guestInp.setAttribute('aria-label', 'ゲストスペースID');
  simSelect.setAttribute('aria-label', 'シミュレーションのアクション');
  textEl.setAttribute('aria-label', 'プロセス図のMermaidソース');
  batchBtn.addEventListener('click', () => liteRun(panel, 'プロセス図を一括取得中…', async () => {
    const result = await runProcessBatchZipStandalone(
      { apps: appTable.getApps(), preview: prevCb.checkbox.checked },
      // 一部失敗・中止の最終報告（isError）は警告色にする。途中経過は処理中表示
      (m: string, e?: boolean) => panel.setStatus(m, e || /^中止しました/.test(m) ? 'warn' : 'busy')
    );
    const { enabled, disabled, failed, notRun } = result.counts;
    panel.setResult([
      `結果 ${result.rows.length}件: プロセス管理あり ${enabled} / 無効 ${disabled} / 取得失敗 ${failed} / 未実行（中止） ${notRun}`,
      ...formatProcessBatchResultLines(result.rows)
    ].join('\n'));
  }));

  const batchAppLabel = (r: { appId: string; guestId: string; appName?: string }) =>
    `#${r.appId}${r.appName ? ` ${r.appName}` : ''}${r.guestId ? `（ゲスト ${r.guestId}）` : ''}`;

  installLiteWorkflow(panel, {
    setup: [cardApp.card], results: [cardDiag.card, cardSim.card, sourceFold], resultActions: ['render'],
    beforeRun: (actionId) => {
      if (actionId !== 'render') return;
      connectionVersion++;
      renderedConnection = '';
      clearSimulationHandlers();
      textEl.value = '';
      summaryEl.innerHTML = '';
      viewEl.replaceChildren();
      setDiagramVisible(false);
      cardSim.card.style.display = 'none';
      simSelect.replaceChildren(new Option('--'));
      simSelect.disabled = true;
      simUndoBtn.disabled = true;
      simCopyHistoryBtn.disabled = true;
      renderedFlowData = null;
      simDetailEl.textContent = '';
      simHistoryEl.textContent = '';
    },
    actions: [{ id: 'render', label: 'プロセス図を表示', description: '状態とアクションの流れを図で表示します。結果画面でシミュレーションもできます。', button: runBtn,
      onSelect: () => showBatchTarget(false),
      validate: () => {
        try { validateProcessConnection(appInp.value, guestInp.value); return ''; }
        catch (error: any) { return error?.message || String(error); }
      },
      summary: () => [['対象', connectionSummary(appInp.value.trim(), guestInp.value.trim(), prevCb.checkbox.checked ? 'プレビュー' : '本番')], ['操作', '状態遷移図を表示します。レコードや設定は変更しません。']]
    }, {
      id: 'batch-zip', label: '複数アプリのプロセス図をZIPで保存',
      description: '対象表のアプリ（環境内の全アプリも追加できます）のプロセス図を、アプリごとの .mmd と一覧（overview.md）にまとめて ZIP で保存します。SVG は含みません。',
      button: batchBtn,
      onSelect: () => showBatchTarget(true),
      validate: () => validateProcessBatchTargets(appTable.getApps()),
      summary: () => {
        const apps = appTable.getApps();
        return [
          ['参照環境', prevCb.checkbox.checked ? 'プレビュー' : '本番'],
          ['対象アプリ', `${apps.length}件\n${summarizeList(apps.map(batchAppLabel))}`],
          ['出力', 'アプリごとの .mmd・一覧（overview.md）・manifest.json を ZIP で保存します。'],
          ['操作', 'アプリごとにプロセス管理の設定を読み取ります。レコードや設定は変更しません。取得に失敗したアプリは一覧とログに残します。'],
          ['中止したとき', '取得済みのアプリだけを保存し、残りは未実行として記録します。']
        ];
      }
    }]
  });

}
