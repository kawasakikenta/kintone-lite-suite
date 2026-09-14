'use strict';

import { installLiteWorkflow, connectionSummary } from './liteWorkflow.js';

import { DEFAULT_APP_ID } from '../constants.js';
import {
  runGenerateERDiagramStandalone,
  runExportERDiagramHtmlStandalone
} from '../tabs/er-standalone.js';
import { fetchAppsInSpace } from '../api.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeSelect,
  makeCard,
  makeDetails,
  makeNote,
  makePickList,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';

export function mountErLitePanel() {
  const panel = createLitePanel({
    id: 'kus-er-lite',
    title: 'ER 図',
    subtitle: '起点アプリからルックアップ／関連レコードを辿り ER 図を生成します。',
    accent: 'er',
    badges: [{ label: 'Lite' }, { label: '可視化' }],
    hint: '関連アプリのつながりを確認します。画面で開くか、共有用HTMLとして保存できます。'
  });

  // ---- 起点 ----
  const cardMain = makeCard({ title: '起点アプリ', number: 1 });
  const appInp = makeInput({ placeholder: 'アプリID（複数はカンマ区切り）', value: DEFAULT_APP_ID || '', width: 'wide' });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  cardMain.body.appendChild(makeRow([appInp, guestInp], { label: '起点ID' }));
  cardMain.body.appendChild(createAppSearchControl(panel, {
    guestEl: guestInp,
    targets: [{ apply: (id, _name) => { appInp.value = id; } }]
  }));

  const bOpen = makeButton('ER 図を開く', 'primary', { icon: '◉' });
  const bSave = makeButton('HTML 保存', 'ghost', { icon: '↓' });
  const btnRow = makeRow([bOpen, bSave]);
  btnRow.style.marginTop = '6px';
  cardMain.body.appendChild(btnRow);
  panel.body.insertBefore(cardMain.card, panel.status);

  // ---- プリセット ----
  const presetCard = makeCard({ title: 'プリセット', soft: true });
  const presetRow = document.createElement('div');
  presetRow.className = 'kus-lp__btn-row';
  type ErPresetCfg = { label: string; layout: string; density: string; depth: string; subtable: boolean; reverse: boolean; focusSpace?: boolean };
  const ER_PRESETS: Record<string, ErPresetCfg> = {
    current:      { label: '現在のみ',         layout: 'dagre',        density: 'standard', depth: '1', subtable: true,  reverse: false },
    neighborhood: { label: '周辺 (深さ2)',     layout: 'dagre',        density: 'standard', depth: '2', subtable: true,  reverse: false },
    reverse:      { label: '逆引きあり',       layout: 'dagre',        density: 'standard', depth: '2', subtable: true,  reverse: true  },
    full:         { label: 'すべて辿る',       layout: 'cose',         density: 'standard', depth: '0', subtable: true,  reverse: true  },
    space:        { label: 'スペース全体',     layout: 'dagre',        density: 'standard', depth: '2', subtable: true,  reverse: false, focusSpace: true }
  };
  for (const [key, p] of Object.entries(ER_PRESETS)) {
    const btn = makeButton(p.label, 'sub');
    btn.addEventListener('click', () => {
      layoutSel.value = p.layout;
      densitySel.value = p.density;
      depthInp.value = p.depth;
      subtableCb.checkbox.checked = p.subtable;
      reverseCb.checkbox.checked = p.reverse;
      details.details.open = true;
      if (p.focusSpace) {
        try { spaceInp.focus(); spaceInp.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* noop */ }
      }
      panel.setStatus(`ER プリセット「${p.label}」を適用しました`, 'info');
    });
    presetRow.appendChild(btn);
  }
  presetCard.body.appendChild(presetRow);
  presetCard.body.appendChild(makeNote('クリックで「探索深さ／密度／レイアウト／逆引き」を一括設定します。あとから詳細オプションで微調整できます。'));
  panel.body.insertBefore(presetCard.card, panel.status);

  // ---- 詳細 ----
  const details = makeDetails('詳細オプション');
  const extra = makeInput({ placeholder: 'カンマ区切り (例: 100, 120)', width: 'wide' });
  const spaceInp = makeInput({ placeholder: 'スペースID', width: 'narrow' });
  const layoutSel = makeSelect([
    ['dagre', 'Dagre（推奨）'],
    ['breadthfirst', 'ツリー'],
    ['cose', 'フォース'],
    ['concentric', '同心円'],
    ['grid', 'グリッド'],
    ['circle', '円形']
  ], 'dagre');
  const densitySel = makeSelect([
    ['standard', '標準'],
    ['compact', 'コンパクト'],
    ['full', '詳細'],
    ['none', '結合のみ（項目非表示）']
  ], 'standard');
  const depthInp = makeInput({ placeholder: '0=無制限', value: '0', type: 'number', width: 'narrow' });
  depthInp.setAttribute('min', '0');
  const subtableCb = makeCheck({ label: 'サブテーブル展開', checked: true });
  const reverseCb = makeCheck({ label: '逆引き探索', checked: false });

  // ---- スペース内アプリピッカー（読み込んだ一覧は生成時に再利用しAPIを節約） ----
  const spaceLoadBtn = makeButton('スペース内アプリを読込', 'sub');
  let pickerSpaceId = '';
  const spacePicker = makePickList({
    ariaLabel: '起点にするスペース内アプリ',
    filterPlaceholder: 'アプリ名・IDで絞り込み',
    emptyText: 'このスペースにアプリが見つかりませんでした。',
    footer: (selected, total) => `スペース #${pickerSpaceId} のアプリ ${total}件中 ${selected}件を起点にします。${selected ? '' : '1件以上選ぶか、起点IDを入力してください。'}`
  });
  let spaceAppsCache: { key: string; apps: Array<{ appId: string; name: string }> } | null = null;
  const spaceCacheKey = () => `${spaceInp.value.trim()}|${guestInp.value.trim()}`;

  function renderSpacePicker(spaceId: string, apps: Array<{ appId: string; name: string }>) {
    pickerSpaceId = spaceId;
    spacePicker.setItems(apps.map((a) => ({ value: String(a.appId), label: a.name || `アプリ ${a.appId}`, sub: `#${a.appId}`, checked: true })));
  }
  // 読み込んだスペース・接続先と食い違ったピッカーは使わない
  for (const input of [spaceInp, guestInp]) {
    input.addEventListener('input', () => {
      if (spaceCacheKey() !== (spaceAppsCache?.key || '')) spacePicker.clear();
    });
  }

  async function loadSpaceApps() {
    const spaceId = spaceInp.value.trim();
    if (!/^\d+$/.test(spaceId)) throw new Error('スペースIDを数値で入力してください');
    const key = spaceCacheKey();
    let apps: Array<{ appId: string; name: string }>;
    if (spaceAppsCache && spaceAppsCache.key === key) {
      apps = spaceAppsCache.apps;
    } else {
      apps = await fetchAppsInSpace(spaceId, guestInp.value.trim());
      spaceAppsCache = { key, apps };
    }
    renderSpacePicker(spaceId, apps);
    panel.setStatus(`スペース ${spaceId} のアプリ ${apps.length}件を読み込みました。起点にするアプリを選択してください`, 'info');
  }
  spaceLoadBtn.addEventListener('click', () => liteRun(panel, 'スペース内アプリを取得中…', loadSpaceApps));

  details.body.appendChild(makeRow(extra, { label: '追加起点' }));
  details.body.appendChild(makeRow([spaceInp, spaceLoadBtn], { label: 'スペースID' }));
  details.body.appendChild(spacePicker.element);
  details.body.appendChild(makeRow(layoutSel, { label: 'レイアウト' }));
  details.body.appendChild(makeRow(densitySel, { label: '表示密度' }));
  details.body.appendChild(makeRow(depthInp, { label: '探索深さ' }));
  details.body.appendChild(makeRow([subtableCb.label, reverseCb.label]));
  details.body.appendChild(makeNote('起点ID / 追加起点はいずれもカンマ区切りで複数指定できます。追加起点は最初の起点と統合して同一グラフに描画されます。スペースIDを入れて「スペース内アプリを読込」を押すと、任意のアプリだけを選んで起点にできます（重複するアプリは自動で1回だけ取得されます）。'));

  function parseAppIds(value: string): string[] {
    return String(value || '').split(/[\s,，]+/).map((v) => v.trim()).filter(Boolean);
  }
  panel.body.insertBefore(details.details, panel.status);

  function source() {
    // ピッカーで読み込み済みの一覧・選択状態を引き渡す（生成時の再取得を防ぐ）
    const spaceId = spaceInp.value.trim();
    const cacheHit = !!(spaceAppsCache && spaceAppsCache.key === spaceCacheKey());
    const pickerMatches = cacheHit && pickerSpaceId === spaceId && !spacePicker.element.hidden;
    const selectedIds = pickerMatches ? spacePicker.selected() : null;
    return {
      appId: appInp.value.trim(),
      appIds: parseAppIds(appInp.value),
      guestId: guestInp.value.trim(),
      preview: false,
      layoutName: layoutSel.value,
      fieldDensity: densitySel.value,
      maxDepth: Number(depthInp.value) || 0,
      includeSubtableFields: subtableCb.checkbox.checked,
      includeReverseLookup: reverseCb.checkbox.checked,
      extraAppIds: parseAppIds(extra.value),
      spaceId,
      spaceApps: cacheHit ? spaceAppsCache.apps : undefined,
      spaceSelectedAppIds: selectedIds ?? undefined
    };
  }

  bOpen.addEventListener('click', () => liteRun(panel, 'ER 図を生成中…', async () => {
    await runGenerateERDiagramStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));

  bSave.addEventListener('click', () => liteRun(panel, 'HTML 生成中…', async () => {
    await runExportERDiagramHtmlStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));

  appInp.setAttribute('aria-label', '起点アプリID');
  guestInp.setAttribute('aria-label', 'ゲストスペースID');
  const erSummary = (): Array<[string, string]> => [
    ['起点', connectionSummary(appInp.value.trim(), guestInp.value.trim())],
    ['追加起点', extra.value.trim() || 'なし'],
    ['スペース', (() => {
      const spaceId = spaceInp.value.trim();
      if (!spaceId) return '指定なし';
      const picked = source().spaceSelectedAppIds;
      return picked ? `${spaceId}（読み込んだ ${spacePicker.count()} アプリ中 ${picked.length} 件を起点にする）` : `${spaceId}（スペース内の全アプリを起点にする）`;
    })()],
    ['探索の深さ', depthInp.value === '0' ? '無制限' : depthInp.value],
    ['表示', (layoutSel.selectedOptions[0]?.textContent || '') + ' / ' + (densitySel.selectedOptions[0]?.textContent || '')],
    ['逆引き', reverseCb.checkbox.checked ? 'あり' : 'なし']
  ];
  const erProblem = () => appInp.value.trim() || extra.value.trim() || spaceInp.value.trim() ? '' : '起点アプリまたはスペースを指定してください。';
  installLiteWorkflow(panel, {
    setup: [cardMain.card, presetCard.card, details.details],
    actions: [
      { id: 'open', label: 'ER図を開く', description: '関連アプリを取得し、別の画面で関係図を開きます。', button: bOpen, validate: erProblem, summary: erSummary },
      { id: 'save', label: 'ER図をHTMLで保存', description: '選んだ条件で生成した関係図をファイルに保存します。', button: bSave, validate: erProblem, summary: erSummary }
    ]
  });

}
