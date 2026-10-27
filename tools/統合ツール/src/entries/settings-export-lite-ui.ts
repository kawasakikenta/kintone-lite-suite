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

export function mountSettingsExportLitePanel() {
  const panel = createLitePanel({
    id: 'kus-settings-export-lite',
    title: '設定一括取得',
    subtitle: '複数アプリの設定を JSON または ZIP（1アプリ=1JSON）で保存します。',
    accent: 'settings',
    badges: [{ label: '読み取り専用', tone: 'read' }],
    hint: 'アプリの設定を読み取り、JSON または ZIP で保存します。kintone のアプリや設定は変更しません。',
    wide: true
  });

  // ---- 対象アプリ（表形式：アプリID × ゲストスペース） ----
  const cardTarget = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({
    currentAppId: String(DEFAULT_APP_ID || ''),
    currentGuestId: DEFAULT_GUEST_ID,
    initial: DEFAULT_APP_ID ? [{ appId: String(DEFAULT_APP_ID), guestId: DEFAULT_GUEST_ID }] : []
  });

  // ---- アプリ検索 / スペース取込（検索用ゲストIDで照会し、表に行を追加） ----
  const searchGuest = makeInput({ placeholder: '検索用ゲストID（任意）', width: 'guest' });
  const searchControl = createAppSearchControl(panel, {
    guestEl: searchGuest,
    targets: [{ apply: (appId, appName, guestId) => {
      const result = appTable.putApp(appId, guestId, { appName, focus: true });
      return { message: `アプリ #${appId}${appName ? ` (${appName})` : ''} を対象アプリ表に設定しました${result.action === 'existing' ? '（追加済み）' : ''}` };
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
  cardTarget.body.appendChild(makeNote('1行なら1アプリ、複数行で一括取得します。アプリごとに別のゲストスペースを指定でき、各行の「↑コピー」で上の行のアプリIDとゲストスペースIDを複製できます。', 'help'));
  panel.body.insertBefore(cardTarget.card, panel.status);

  // ---- 取得セクション ----
  // 表面にはプリセットと選択数だけを出し、セクションごとの個別選択は詳細設定のポップアップに置く
  const cardScope = makeCard({ title: '取得セクション', number: 2 });
  cardScope.actions.style.flexWrap = 'wrap';
  const cardChips = makeCard({ title: '取得する設定を個別に選ぶ' });
  cardChips.actions.style.flexWrap = 'wrap';
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
  cardChips.actions.appendChild(allBtn);
  cardChips.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => applyScopeSelection(() => true));
  noneBtn.addEventListener('click', () => applyScopeSelection(() => false));

  const SCOPE_PRESETS: Array<{ label: string; keys: Set<string> }> = [
    {
      label: 'すべて',
      keys: new Set(SETTINGS_EXPORT_SCOPE_DEFS.map((s) => s.key))
    },
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
  cardScope.body.appendChild(makeNote('プリセットで取得する設定をまとめて選べます。1項目ずつ選ぶときは「詳細設定…」を開いてください。', 'help'));
  cardChips.body.appendChild(chipBox);

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
    panel.setStatus(`スペース内のアプリ ${apps.length}件を取得しました（対象アプリ表に新規追加 ${added}件）`, 'ok');
  }));

  btnJson.addEventListener('click', () => liteRun(panel, '設定一括取得（JSON）中…', async () => {
    const { summaryHtml } = await runSettingsExportStandalone(
      'json',
      opts(),
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    summary.innerHTML = summaryHtml;
    summary.classList.remove('kus-lp__panel-html--empty');
  }));

  btnZip.addEventListener('click', () => liteRun(panel, '設定一括取得（ZIP）中…', async () => {
    const { summaryHtml } = await runSettingsExportStandalone(
      'zip',
      opts(),
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    summary.innerHTML = summaryHtml;
    summary.classList.remove('kus-lp__panel-html--empty');
  }));

  const exportProblem = () => {
    const rows = appTable.getApps();
    if (!rows.length) return '対象アプリを1件以上指定してください。';
    if (rows.some(row => !/^\d+$/.test(row.appId) || (row.guestId && !/^\d+$/.test(row.guestId)))) return 'アプリID・ゲストスペースIDは半角数字で入力してください。';
    return chips.some(c => c.checkbox.checked) ? '' : '取得する設定を1つ以上選んでください。';
  };
  const exportSummary = (format: string): Array<[string, string]> => [
    ['対象アプリ', appTable.getApps().map(r => connectionSummary(r.appId, r.guestId, prev.checkbox.checked ? 'プレビュー' : '本番')).join('\n')],
    ['取得する設定', chips.filter(c => c.checkbox.checked).map(c => c.label.textContent || '').join('、')],
    ['保存形式', format]
  ];
  installLiteWorkflow(panel, {
    setup: [cardTarget.card, cardScope.card],
    advanced: [cardChips.card],
    advancedCopy: '取得する設定を1項目ずつ選ぶ（全選択・全解除）ときはこちら。',
    results: [summary],
    beforeRun: () => { summary.replaceChildren(); summary.classList.add('kus-lp__panel-html--empty'); },
    actions: [
      { id: 'json', label: '設定をJSONで保存', description: '全対象アプリの設定を、1つのJSONファイルにまとめて保存します。', button: btnJson, validate: exportProblem, summary: () => exportSummary('全アプリを1つのJSON') },
      { id: 'zip', label: '設定をZIPで保存', description: 'アプリごとのJSONと、取得結果の一覧（manifest.json）をZIPで保存します。', button: btnZip, validate: exportProblem, summary: () => exportSummary('1アプリ1JSONとmanifest.jsonをZIPに保存') }
    ]
  });

}
