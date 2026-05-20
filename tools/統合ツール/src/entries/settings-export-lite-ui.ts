'use strict';

import { SETTINGS_EXPORT_SCOPE_DEFS } from '../constants.js';
import {
  runSettingsExportSearchStandalone,
  runSettingsExportStandalone,
  runSettingsExportAddSpaceStandalone,
  renderSettingsExportSearchResultsHtml
} from '../tabs/settings-export-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeTextarea,
  makeCard,
  makeNote,
  liteRun
} from './litePanelTheme.js';

export function mountSettingsExportLitePanel() {
  const panel = createLitePanel({
    id: 'kus-settings-export-lite',
    title: '設定一括取得',
    subtitle: '複数アプリの設定を JSON または ZIP（1アプリ=1JSON）で保存します。',
    accent: 'settings',
    badges: [{ label: 'Lite' }, { label: '複数アプリ対応' }],
    hint: 'アプリ検索／スペース内アプリ自動追加に対応。ZIP は manifest 付きで保存します。',
    wide: true
  });

  // ---- 対象アプリ ----
  const cardTarget = makeCard({ title: '対象アプリ', number: 1 });
  const appTa = makeTextarea({ rows: 3, code: true, placeholder: 'アプリID（カンマ・改行・スペース区切り）' });
  cardTarget.body.appendChild(appTa);

  const searchKw = makeInput({ placeholder: 'アプリ名の一部', width: 'wide' });
  const searchBtn = makeButton('検索', 'sub');
  cardTarget.body.appendChild(makeRow([searchKw, searchBtn], { label: 'アプリ検索' }));

  const searchOut = document.createElement('div');
  searchOut.className = 'kus-lp__panel-html kus-lp__panel-html--empty';
  searchOut.style.maxHeight = '180px';
  cardTarget.body.appendChild(searchOut);

  const spaceKw = makeInput({ placeholder: 'スペースID', width: 'narrow' });
  const spaceBtn = makeButton('スペース内アプリを追加', 'sub');
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

  // Scope-root として既存 standalone 関数に合うように DOM ラッパを作る
  const scopeRoot = document.createElement('div');
  scopeRoot.style.display = 'none';
  for (const c of chips) {
    // 既存 selectedScopeKeys() は input[type=checkbox][value] を集計する設計
    const inp = c.checkbox.cloneNode(true) as HTMLInputElement;
    inp.checked = c.checkbox.checked;
    c.checkbox.addEventListener('change', () => { inp.checked = c.checkbox.checked; });
    scopeRoot.appendChild(inp);
  }
  cardScope.body.appendChild(scopeRoot);
  panel.body.insertBefore(cardScope.card, panel.status);

  // ---- ゲスト / プレビュー ----
  const cardOpt = makeCard({ title: '接続・出力', number: 3, soft: true });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  const prev = makeCheck({ label: 'プレビュー環境から取得' });
  cardOpt.body.appendChild(makeRow([guestInp, prev.label], { label: '接続' }));

  const btnJson = makeButton('JSON で保存', 'primary', { icon: '↓' });
  const btnZip = makeButton('ZIP で保存', 'primary', { icon: '↓' });
  const btnGrid = document.createElement('div');
  btnGrid.className = 'kus-lp__btn-grid';
  btnGrid.appendChild(btnJson);
  btnGrid.appendChild(btnZip);
  cardOpt.body.appendChild(btnGrid);
  cardOpt.body.appendChild(makeNote('JSON は全アプリを 1 ファイルに、ZIP は app_<id>.json + manifest.json で個別保存します。'));
  panel.body.insertBefore(cardOpt.card, panel.status);

  // ---- 結果サマリ ----
  const summary = document.createElement('div');
  summary.className = 'kus-lp__panel-html kus-lp__panel-html--empty';
  panel.body.insertBefore(summary, panel.status);

  function opts() {
    return {
      appIdsText: appTa.value,
      guestId: guestInp.value.trim(),
      preview: prev.checkbox.checked,
      scopeRoot
    };
  }

  searchBtn.addEventListener('click', () => liteRun(panel, 'アプリ検索中…', async () => {
    const apps = await runSettingsExportSearchStandalone(
      searchKw.value,
      guestInp.value.trim(),
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
    const cur = appTa.value.trim();
    appTa.value = cur ? `${cur}\n${id}` : id;
  });

  spaceBtn.addEventListener('click', () => liteRun(panel, 'スペース内アプリ取得中…', async () => {
    appTa.value = await runSettingsExportAddSpaceStandalone(
      spaceKw.value.trim(),
      guestInp.value.trim(),
      appTa.value,
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
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
