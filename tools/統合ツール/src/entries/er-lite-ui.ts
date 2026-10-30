'use strict';

import { installLiteWorkflow } from './liteWorkflow.js';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import {
  runGenerateERDiagramStandalone,
  runExportERDiagramHtmlStandalone,
  validateErOptions
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
  makeNote,
  makePickList,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { joinAppIds, recordTargetSummary } from './recordTargetApps.js';

export function mountErLitePanel() {
  const panel = createLitePanel({
    id: 'kus-er-lite',
    title: 'ER 図',
    subtitle: '起点アプリからルックアップ／関連レコードを辿り ER 図を生成します。',
    accent: 'er',
    badges: [{ label: '読み取り専用', tone: 'read' }],
    hint: 'つながりのあるアプリを、画面で開くか共有用の HTML として保存できます。kintone のアプリや設定は変更しません。'
  });

  // ---- 起点 ----
  const cardMain = makeCard({ title: '起点アプリ', number: 1 });
  const appInp = makeInput({ placeholder: 'アプリID（複数はカンマ区切り）', value: DEFAULT_APP_ID || '', width: 'wide' });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', value: DEFAULT_GUEST_ID, width: 'guest' });
  cardMain.body.appendChild(makeRow([appInp, guestInp], { label: '起点ID' }));
  cardMain.body.appendChild(createAppSearchControl(panel, {
    guestEl: guestInp,
    targets: [{
      apply: (id, _name) => { appInp.value = id; },
      // 候補すべてを起点ID欄へ入れる（置き換え）。ゲストIDは 1 つしか持てないため、1 か所の候補に限り、ゲストIDも候補に合わせる
      singleGuest: true,
      applyAll: (apps) => {
        const guestId = apps[0]?.guestId || '';
        appInp.value = joinAppIds(apps);
        if (guestInp.value.trim() !== guestId) {
          guestInp.value = guestId;
          guestInp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return {
          message: `${apps.length}件のアプリを起点に設定しました（それまでの入力は置き換えました）。起点ごとに設定を読み取るため、件数が多いと時間がかかり、図も大きくなります`,
          tone: 'ok',
          pickedLabel: `${apps.length}件を設定済み`
        };
      },
      applyAllLabel: (count) => `候補 ${count} 件をすべて起点にする`
    }]
  }));

  const prevCb = makeCheck({ label: 'プレビュー環境を参照', checked: false });
  cardMain.body.appendChild(makeRow(prevCb.label));

  const bOpen = makeButton('ER図を開く', 'primary', { icon: '◉' });
  const bSave = makeButton('ER図をHTMLで保存', 'ghost', { icon: '↓' });
  const btnRow = makeRow([bOpen, bSave]);
  btnRow.style.marginTop = '6px';
  cardMain.body.appendChild(btnRow);
  panel.body.insertBefore(cardMain.card, panel.status);

  // ---- プリセット ----
  const presetCard = makeCard({ title: 'プリセット', soft: true });
  const presetRow = document.createElement('div');
  presetRow.className = 'kus-lp__btn-row';
  type ErPresetCfg = { label: string; desc: string; layout: string; density: string; depth: string; subtable: boolean; reverse: boolean; focusSpace?: boolean };
  const ER_PRESETS: Record<string, ErPresetCfg> = {
    current:      { label: '現在のみ',         desc: '起点アプリだけを表示します',                                         layout: 'dagre',        density: 'standard', depth: '1', subtable: true,  reverse: false },
    neighborhood: { label: '周辺 (深さ2)',     desc: '起点から2段先までのアプリを表示します',                               layout: 'dagre',        density: 'standard', depth: '2', subtable: true,  reverse: false },
    reverse:      { label: '逆引きあり',       desc: '起点を参照しているアプリも含めて、2段先まで表示します',               layout: 'dagre',        density: 'standard', depth: '2', subtable: true,  reverse: true  },
    full:         { label: 'すべて辿る',       desc: 'つながるアプリを最後まで表示します（アプリが多いと時間がかかります）', layout: 'cose',         density: 'standard', depth: '0', subtable: true,  reverse: true  },
    space:        { label: 'スペース全体',     desc: 'スペース内のアプリを起点に2段先まで表示します（スペースIDの入力が必要です）', layout: 'dagre',        density: 'standard', depth: '2', subtable: true,  reverse: false, focusSpace: true }
  };
  for (const [key, p] of Object.entries(ER_PRESETS)) {
    const btn = makeButton(p.label, 'sub');
    btn.title = p.desc;
    btn.addEventListener('click', () => {
      layoutSel.value = p.layout;
      densitySel.value = p.density;
      depthInp.value = p.depth;
      subtableCb.checkbox.checked = p.subtable;
      reverseCb.checkbox.checked = p.reverse;
      if (p.focusSpace) {
        // スペースIDは詳細設定のポップアップにあるので、開いてから入力欄へ移る
        panel.root.querySelector<HTMLButtonElement>('.kus-wf-advanced__btn')?.click();
        try { spaceInp.focus(); } catch { /* noop */ }
      }
      panel.setStatus(`ER プリセット「${p.label}」を適用しました（${p.desc}）`, 'info');
    });
    presetRow.appendChild(btn);
  }
  presetCard.body.appendChild(presetRow);
  presetCard.body.appendChild(makeNote('押すと、探索の深さ・密度・レイアウト・逆引きをまとめて設定します。内容は「詳細設定…」の詳細オプションで変更できます。', 'help'));
  panel.body.insertBefore(presetCard.card, panel.status);

  // ---- 詳細 ----
  const details = makeCard({ title: '詳細オプション' });
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
  details.body.appendChild(makeNote('起点IDはカンマ区切りで複数指定でき、追加起点も同じ図にまとめて描画します。スペースIDを入れて「スペース内アプリを読込」を押すと、起点にするアプリを選べます。', 'help'));

  function parseAppIds(value: string): string[] {
    return String(value || '').split(/[\s,，]+/).map((v) => v.trim()).filter(Boolean);
  }
  panel.body.insertBefore(details.card, panel.status);

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
      preview: prevCb.checkbox.checked,
      layoutName: layoutSel.value,
      fieldDensity: densitySel.value,
      maxDepth: depthInp.value.trim(),
      includeSubtableFields: subtableCb.checkbox.checked,
      includeReverseLookup: reverseCb.checkbox.checked,
      extraAppIds: parseAppIds(extra.value),
      spaceId,
      spaceApps: cacheHit ? spaceAppsCache.apps : undefined,
      spaceSelectedAppIds: selectedIds ?? undefined
    };
  }

  bOpen.addEventListener('click', () => liteRun(panel, 'ER 図を生成中…', async () => {
    const validationError = validateErOptions(source());
    if (validationError) { panel.setStatus(validationError, 'warn'); return; }
    await runGenerateERDiagramStandalone(source(), (m: string, e?: boolean | 'warn') => panel.setStatus(m, e === 'warn' ? 'warn' : e ? 'err' : 'busy'));
  }));

  bSave.addEventListener('click', () => liteRun(panel, 'HTML 生成中…', async () => {
    const validationError = validateErOptions(source());
    if (validationError) { panel.setStatus(validationError, 'warn'); return; }
    await runExportERDiagramHtmlStandalone(source(), (m: string, e?: boolean | 'warn') => panel.setStatus(m, e === 'warn' ? 'warn' : e ? 'err' : 'busy'));
  }));

  appInp.setAttribute('aria-label', '起点アプリID');
  guestInp.setAttribute('aria-label', 'ゲストスペースID');
  const erSummary = (): Array<[string, string]> => [
    // 起点が複数のときは件数と先頭 20 件までを示す（全アプリを起点にしても確認画面が数千行にならない）
    ['起点', recordTargetSummary(appInp.value, guestInp.value)[1]],
    ['参照環境', prevCb.checkbox.checked ? 'プレビュー環境を参照' : '本番環境'],
    ['追加起点', extra.value.trim() || 'なし'],
    ['スペース', (() => {
      const spaceId = spaceInp.value.trim();
      if (!spaceId) return '指定なし';
      const picked = source().spaceSelectedAppIds;
      return picked ? `${spaceId}（読み込んだ ${spacePicker.count()} アプリ中 ${picked.length} 件を起点にする）` : `${spaceId}（スペース内の全アプリを起点にする）`;
    })()],
    ['探索の深さ', !depthInp.value.trim() || Number(depthInp.value) === 0 ? '無制限（関連アプリを最後まで探索します）' : depthInp.value.trim()],
    ['表示', (layoutSel.selectedOptions[0]?.textContent || '') + ' / ' + (densitySel.selectedOptions[0]?.textContent || '')],
    ['逆引き', reverseCb.checkbox.checked ? '逆引きあり（テナント内のアプリを走査するため時間がかかる場合があります）' : 'なし'],
    ...(parseAppIds(appInp.value).length >= 50 ? [['起点が多い場合', `${parseAppIds(appInp.value).length}アプリを起点に、設定を順に読み取ります。時間がかかり、図やHTMLも大きくなります。途中で「中止」できます。`] as [string, string]] : [])
  ];
  const erProblem = () => validateErOptions(source());
  installLiteWorkflow(panel, {
    setup: [cardMain.card, presetCard.card],
    advanced: [details.card],
    advancedCopy: '追加起点・スペースID・レイアウト・表示密度・探索の深さ・サブテーブル・逆引きを変えるときはこちら。',
    actions: [
      { id: 'open', label: 'ER図を開く', description: '関連アプリの設定を読み取り、アプリ同士のつながりを別画面の図で表示します。', button: bOpen, validate: erProblem, summary: erSummary },
      { id: 'save', label: 'ER図をHTMLで保存', description: '選んだ条件のER図を、共有できるHTMLファイルとして保存します。', button: bSave, validate: erProblem, summary: erSummary }
    ]
  });

}
