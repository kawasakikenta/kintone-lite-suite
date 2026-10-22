'use strict';

import { installLiteWorkflow, foldWorkflowSection, connectionSummary } from './liteWorkflow.js';

import { SETTINGS_EXPORT_SCOPE_DEFS, DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import {
  runSettingsExportStandalone,
  runSettingsExportListSpaceAppsStandalone
} from '../tabs/settings-export-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeAppTable,
  makeCard,
  makeNote,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { createAppLookupCache, createAppTableLookup } from './appNameHint.js';

export function mountSettingsExportLitePanel() {
  const panel = createLitePanel({
    id: 'kus-settings-export-lite',
    title: '設定一括取得',
    subtitle: '複数アプリの設定を JSON または ZIP（1アプリ=1JSON）で保存します。',
    accent: 'settings',
    badges: [{ label: 'Lite' }, { label: '複数アプリ対応' }],
    hint: '1 行だけ入力すれば 1 アプリ、複数行で一括取得。<strong>アプリごとに別のゲストスペース</strong>を指定できます。',
    wide: true
  });
  const appLookup = createAppLookupCache();

  // ---- 対象アプリ（表形式：アプリID × ゲストスペース） ----
  const cardTarget = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({
    currentAppId: String(DEFAULT_APP_ID || ''),
    currentGuestId: DEFAULT_GUEST_ID,
    initial: DEFAULT_APP_ID ? [{ appId: String(DEFAULT_APP_ID), guestId: DEFAULT_GUEST_ID }] : [],
    lookupAppName: createAppTableLookup(appLookup)
  });

  // ---- アプリ検索 / スペース取込（検索用ゲストIDで照会し、表に行を追加） ----
  const searchGuest = makeInput({ placeholder: '検索用ゲストID（任意）', width: 'guest' });
  const searchControl = createAppSearchControl(panel, {
    guestEl: searchGuest,
    targets: [{ apply: (appId, appName, guestId) => {
      const result = appTable.putApp(appId, guestId, { appName, focus: true });
      return { message: `アプリ #${appId}${appName ? ` (${appName})` : ''} を対象表に設定しました${result.action === 'existing' ? '（追加済み）' : ''}` };
    } }]
  });

  const prev = makeCheck({ label: 'プレビュー環境から取得' });
  const spaceKw = makeInput({ placeholder: 'スペースID', width: 'narrow' });
  const spaceBtn = makeButton('スペース内アプリを表に追加', 'sub');
  const spaceRow = makeRow([spaceKw, searchGuest, spaceBtn], { label: 'スペース' });

  cardTarget.body.appendChild(searchControl);
  cardTarget.body.appendChild(appTable.element);
  cardTarget.body.appendChild(makeRow([prev.label], { label: '取得環境' }));
  cardTarget.body.appendChild(foldWorkflowSection('スペースから追加', spaceRow));
  cardTarget.body.appendChild(makeNote('各行に「↑コピー」で上の行のアプリID・ゲストIDを複製できます。同じゲストスペースの複数アプリを素早く並べられます。'));
  panel.body.insertBefore(cardTarget.card, panel.status);

  // ---- 取得セクション ----
  const cardScope = makeCard({ title: '取得セクション', number: 2 });
  cardScope.actions.style.flexWrap = 'wrap';
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  chipBox.setAttribute('role', 'group');
  chipBox.setAttribute('aria-label', '取得するセクション');
  const chips = SETTINGS_EXPORT_SCOPE_DEFS.map((s) => makeChip({ label: s.label, value: s.key, checked: true }));
  chips.forEach((c) => chipBox.appendChild(c.label));

  const countBadge = document.createElement('span');
  countBadge.className = 'kus-lp__count';
  const updateScopeCount = () => {
    const selectedCount = chips.filter((c) => c.checkbox.checked).length;
    countBadge.textContent = `選択 ${selectedCount} / ${chips.length}`;
  };
  updateScopeCount();
  chipBox.addEventListener('change', updateScopeCount);

  const applyScopeSelection = (predicate: (key: string) => boolean) => {
    chips.forEach((c) => {
      c.checkbox.checked = predicate(c.checkbox.value);
    });
    updateScopeCount();
    chips[0]?.checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(countBadge);
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => applyScopeSelection(() => true));
  noneBtn.addEventListener('click', () => applyScopeSelection(() => false));

  const SCOPE_PRESETS: Array<{ label: string; keys: Set<string> }> = [
    {
      label: '基本のみ',
      keys: new Set([
        'appSettings',
        'appInfo',
        'fieldSettings',
        'layoutSettings',
        'formSettings',
        'viewSettings',
        'reportSettings',
        'processSettings',
        'actionSettings',
        'categories'
      ])
    },
    {
      label: '権限のみ',
      keys: new Set(['appAcl', 'fieldAcl', 'recordPermissions'])
    },
    {
      label: '通知のみ',
      keys: new Set(['notifications', 'perRecordNotifications', 'reminderNotifications'])
    },
    {
      label: 'カスタマイズのみ',
      keys: new Set(['pluginSettings', 'customizeSettings'])
    }
  ];
  const presetToolbar = document.createElement('div');
  presetToolbar.className = 'kus-lp__toolbar';
  for (const preset of SCOPE_PRESETS) {
    const btn = makeButton(preset.label, 'sub');
    btn.addEventListener('click', () => applyScopeSelection((key) => preset.keys.has(key)));
    presetToolbar.appendChild(btn);
  }
  cardScope.body.appendChild(presetToolbar);
  cardScope.body.appendChild(chipBox);

  // selectedScopeKeys() は配下の input[type=checkbox]:checked を集計するので
  // chipBox をそのまま scopeRoot として渡す（クローン同期は change 未発火で壊れる）
  const scopeRoot = chipBox;
  panel.body.insertBefore(cardScope.card, panel.status);

  const btnJson = makeButton('JSON で保存', 'primary', { icon: '↓' });
  const btnZip = makeButton('ZIP で保存', 'primary', { icon: '↓' });

  // ---- 結果サマリ ----
  const summary = document.createElement('div');
  summary.className = 'kus-lp__panel-html kus-lp__panel-html--empty';
  panel.body.insertBefore(summary, panel.status);

  // 取得に失敗したアプリだけを対象表に残して再実行しやすくする
  const retryBox = document.createElement('div');
  const retryBtn = makeButton('失敗したアプリだけを対象に残す', 'sub');
  retryBtn.hidden = true;
  retryBox.appendChild(retryBtn);
  let failedRows: Array<{ appId: string; guestId: string; appName: string }> = [];
  const showResult = (summaryHtml: string, results: Array<{ appId: string; appName: string; guestId: string; ngCount: number }>) => {
    summary.innerHTML = summaryHtml;
    summary.classList.remove('kus-lp__panel-html--empty');
    failedRows = results.filter(r => r.ngCount > 0).map(r => ({ appId: r.appId, guestId: r.guestId, appName: r.appName }));
    retryBtn.hidden = !failedRows.length;
  };

  function opts() {
    return {
      apps: appTable.getApps(),
      preview: prev.checkbox.checked,
      scopeRoot
    };
  }

  spaceBtn.addEventListener('click', () => liteRun(panel, 'スペース内アプリ取得中…', async () => {
    const guest = searchGuest.value.trim();
    const apps = await runSettingsExportListSpaceAppsStandalone(
      spaceKw.value.trim(),
      guest,
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    // 対象アプリが無い警告は取得処理側のステータスを残し、成功メッセージで上書きしない。
    if (!apps.length) return;
    let added = 0;
    for (const app of apps) {
      const result = appTable.putApp(app.appId, guest, { appName: app.name });
      if (result.action === 'added' || result.action === 'filled') added += 1;
    }
    panel.setStatus(`スペースのアプリ ${apps.length}件を読み込みました（新規追加 ${added}件）`, 'ok');
  }));

  btnJson.addEventListener('click', () => liteRun(panel, '設定一括取得（JSON）中…', async () => {
    const { summaryHtml, results } = await runSettingsExportStandalone(
      'json',
      opts(),
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    showResult(summaryHtml, results);
  }));

  btnZip.addEventListener('click', () => liteRun(panel, '設定一括取得（ZIP）中…', async () => {
    const { summaryHtml, results } = await runSettingsExportStandalone(
      'zip',
      opts(),
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    showResult(summaryHtml, results);
  }));

  const exportProblem = () => {
    const rows = appTable.getApps();
    if (!rows.length) return '対象アプリを1件以上指定してください。';
    if (rows.some(row => !/^\d+$/.test(row.appId) || (row.guestId && !/^\d+$/.test(row.guestId)))) return 'アプリID・ゲストIDは数値で入力してください。';
    return chips.some(c => c.checkbox.checked) ? '' : '取得する設定を1つ以上選んでください。';
  };
  const exportSummary = (format: string): Array<[string, string]> => [
    ['対象アプリ', appTable.getApps().map(r => connectionSummary(r.appId, r.guestId, prev.checkbox.checked ? 'プレビュー' : '本番', r.appName)).join('\n')],
    ['取得する設定', chips.filter(c => c.checkbox.checked).map(c => c.label.textContent || '').join('、')],
    ['保存形式', format]
  ];
  const workflow = installLiteWorkflow(panel, {
    setup: [cardTarget.card, cardScope.card], results: [summary, retryBox],
    beforeRun: () => { summary.replaceChildren(); summary.classList.add('kus-lp__panel-html--empty'); retryBtn.hidden = true; failedRows = []; },
    actions: [
      { id: 'json', label: '設定をJSONで保存', description: '全対象アプリの設定を1つのJSONにまとめます。', button: btnJson, validate: exportProblem, summary: () => exportSummary('全アプリを1つのJSON') },
      { id: 'zip', label: '設定をZIPで保存', description: 'アプリごとのJSONと取得結果をZIPにまとめます。', button: btnZip, validate: exportProblem, summary: () => exportSummary('1アプリ1JSONとmanifest.jsonをZIPに保存') }
    ]
  });

  retryBtn.addEventListener('click', () => {
    if (!failedRows.length) return;
    appTable.setApps(failedRows);
    panel.setStatus(`失敗した ${failedRows.length} アプリを対象表に残しました。取得セクションを確認して再実行してください`, 'info');
    workflow.show(0);
  });
}
