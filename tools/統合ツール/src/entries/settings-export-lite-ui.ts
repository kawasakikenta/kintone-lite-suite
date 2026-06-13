'use strict';

import { SETTINGS_EXPORT_SCOPE_DEFS, DEFAULT_APP_ID } from '../constants.js';
import {
  runSettingsExportSearchStandalone,
  runSettingsExportStandalone,
  runSettingsExportListSpaceAppsStandalone,
  renderSettingsExportSearchResultsHtml
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
import { extractGuestIdFromInput } from '../handlers/diffFocus.js';

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

  // ---- 対象アプリ（表形式：アプリID × ゲストスペース） ----
  const cardTarget = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({
    currentAppId: String(DEFAULT_APP_ID || ''),
    initial: DEFAULT_APP_ID ? [{ appId: String(DEFAULT_APP_ID), guestId: '' }] : []
  });

  // ---- アプリ検索 / スペース取込（検索用ゲストIDで照会し、表に行を追加） ----
  const searchKw = makeInput({ placeholder: 'アプリ名 / アプリID / URL', width: 'wide' });
  const searchGuest = makeInput({ placeholder: '検索用ゲストID（任意）', width: 'guest' });
  const searchBtn = makeButton('検索', 'sub');
  cardTarget.body.appendChild(makeRow([searchKw, searchGuest, searchBtn], { label: 'アプリ検索' }));

  const searchOut = document.createElement('div');
  searchOut.className = 'kus-lp__panel-html kus-lp__panel-html--empty';
  searchOut.style.maxHeight = '180px';
  cardTarget.body.appendChild(searchOut);

  cardTarget.body.appendChild(appTable.element);
  cardTarget.body.appendChild(makeNote('各行に「↑コピー」で上の行のアプリID・ゲストIDを複製できます。同じゲストスペースの複数アプリを素早く並べられます。'));

  const spaceKw = makeInput({ placeholder: 'スペースID', width: 'narrow' });
  const spaceBtn = makeButton('スペース内アプリを表に追加', 'sub');
  cardTarget.body.appendChild(makeRow([spaceKw, spaceBtn], { label: 'スペース' }));
  panel.body.insertBefore(cardTarget.card, panel.status);

  // ---- 取得セクション ----
  const cardScope = makeCard({ title: '取得セクション', number: 2 });
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  const chips = SETTINGS_EXPORT_SCOPE_DEFS.map((s) => makeChip({ label: s.label, value: s.key, checked: true }));
  chips.forEach((c) => chipBox.appendChild(c.label));
  cardScope.body.appendChild(chipBox);

  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = true; }));
  noneBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = false; }));

  // selectedScopeKeys() は配下の input[type=checkbox]:checked を集計するので
  // chipBox をそのまま scopeRoot として渡す（クローン同期は change 未発火で壊れる）
  const scopeRoot = chipBox;
  panel.body.insertBefore(cardScope.card, panel.status);

  // ---- プレビュー / 出力 ----
  const cardOpt = makeCard({ title: '出力', number: 3, soft: true });
  const prev = makeCheck({ label: 'プレビュー環境から取得' });
  cardOpt.body.appendChild(makeRow([prev.label], { label: '取得環境' }));

  const btnJson = makeButton('JSON で保存', 'primary', { icon: '↓' });
  const btnZip = makeButton('ZIP で保存', 'primary', { icon: '↓' });
  const btnGrid = document.createElement('div');
  btnGrid.className = 'kus-lp__btn-grid';
  btnGrid.appendChild(btnJson);
  btnGrid.appendChild(btnZip);
  cardOpt.body.appendChild(btnGrid);
  cardOpt.body.appendChild(makeNote('JSON は全アプリを 1 ファイルに、ZIP は「アプリ名(appID).json」＋ manifest.json で個別保存します。'));
  panel.body.insertBefore(cardOpt.card, panel.status);

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

  searchBtn.addEventListener('click', () => liteRun(panel, 'アプリ検索中…', async () => {
    const urlGuestId = extractGuestIdFromInput(searchKw.value);
    if (urlGuestId && !searchGuest.value.trim()) searchGuest.value = urlGuestId;
    const apps = await runSettingsExportSearchStandalone(
      searchKw.value,
      searchGuest.value.trim(),
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    searchOut.innerHTML = renderSettingsExportSearchResultsHtml(apps);
    searchOut.classList.toggle('kus-lp__panel-html--empty', !apps.length);
  }));

  searchOut.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest('.kus-se-add');
    if (!btn) return;
    const id = btn.getAttribute('data-app');
    if (!id) return;
    const name = btn.getAttribute('data-name') || '';
    const result = appTable.putApp(id, searchGuest.value.trim(), { appName: name, focus: true });
    const note = result.action === 'existing' ? '（追加済み）' : result.action === 'filled' ? '（空行へ設定）' : '';
    if (btn instanceof HTMLButtonElement) {
      btn.textContent = result.action === 'existing' ? '追加済み' : '設定済み';
      btn.setAttribute('aria-pressed', 'true');
      btn.style.background = '#ecfdf5';
      btn.style.borderColor = '#a7f3d0';
      btn.style.color = '#065f46';
    }
    panel.setStatus(`アプリ #${id}${name ? ` (${name})` : ''} を対象表に設定しました${note}`, result.action === 'existing' ? 'info' : 'ok');
  });

  spaceBtn.addEventListener('click', () => liteRun(panel, 'スペース内アプリ取得中…', async () => {
    const guest = searchGuest.value.trim();
    const apps = await runSettingsExportListSpaceAppsStandalone(
      spaceKw.value.trim(),
      guest,
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    let added = 0;
    for (const app of apps) {
      const result = appTable.putApp(app.appId, guest, { appName: app.name });
      if (result.action === 'added' || result.action === 'filled') added += 1;
    }
    panel.setStatus(`スペースのアプリ ${apps.length}件を読み込みました（新規追加 ${added}件）`, 'ok');
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
}
