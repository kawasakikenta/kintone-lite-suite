'use strict';

import { installLiteWorkflow } from './liteWorkflow.js';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import {
  runGenerateERDiagramStandalone,
  runExportERDiagramHtmlStandalone,
  runExportERMarkdownStandalone,
  runExportERMermaidStandalone,
  runExportERRelationsCsvStandalone,
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
import { normalizeIdInputText } from '../utils.js';
import { readSettingsZip } from '../settingsZipImport.js';
import { looksLikeZip } from '../archive/zip-read.js';
import { buildErOfflineSource, listOfflineSpaceApps, type ErOfflineSource } from '../tabs/er-offline.js';

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
  const appInp = makeInput({ placeholder: 'アプリID（複数はカンマ区切り）', value: DEFAULT_APP_ID || '', width: 'wide', idInput: true });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', value: DEFAULT_GUEST_ID, width: 'guest', idInput: true });
  cardMain.body.appendChild(makeRow([appInp, guestInp], { label: '起点ID' }));
  // 設定JSON・ZIP を読み込んでいる間だけ、kintone に問い合わせずに作ることを 1 画面目でも示す
  const offlineBadge = document.createElement('div');
  offlineBadge.className = 'kus-lp__pill kus-lp__pill--ok';
  offlineBadge.setAttribute('data-er-offline', '');
  offlineBadge.style.overflowWrap = 'anywhere';
  offlineBadge.hidden = true;
  cardMain.body.appendChild(offlineBadge);
  cardMain.body.appendChild(createAppSearchControl(panel, {
    guestEl: guestInp,
    targets: [{
      apply: (id, _name) => { appInp.value = id; },
      // 候補すべてを起点ID欄へ入れる（置き換え）。ID は 1 つのゲストスペース内のものなので、ゲストIDも候補に合わせる
      applyAll: (apps, guestId) => {
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
  const bMarkdown = makeButton('仕様書をMarkdownで保存', 'ghost', { icon: '↓' });
  const bMermaid = makeButton('Mermaidで保存', 'ghost', { icon: '↓' });
  const bRelations = makeButton('関連一覧をCSVで保存', 'ghost', { icon: '↓' });
  const btnRow = makeRow([bOpen, bSave, bMarkdown, bMermaid, bRelations]);
  btnRow.style.marginTop = '6px';
  cardMain.body.appendChild(btnRow);
  panel.body.insertBefore(cardMain.card, panel.status);

  // ---- プリセット ----
  const presetCard = makeCard({ title: 'プリセット', soft: true });
  const presetRow = document.createElement('div');
  presetRow.className = 'kus-lp__btn-row';
  type ErPresetCfg = { label: string; desc: string; layout: string; density: string; depth: string; subtable: boolean; reverse: boolean; focusSpace?: boolean };
  const ER_PRESETS: Record<string, ErPresetCfg> = {
    current:      { label: '直接の関連 (深さ1)', desc: '起点アプリと、起点に直接つながるアプリを表示します',                 layout: 'dagre',        density: 'standard', depth: '1', subtable: true,  reverse: false },
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
  const extra = makeInput({ placeholder: 'カンマ区切り (例: 100, 120)', width: 'wide', idInput: true });
  const spaceInp = makeInput({ placeholder: 'スペースID', width: 'narrow', idInput: true });
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
  let offlineSource: ErOfflineSource | null = null;
  // 設定JSONを読み込んでいる間は、スペース内のアプリも読み込んだ設定から探す（キーを分けて、kintone から読んだ一覧と混ぜない）
  const spaceCacheKey = () => `${offlineSource ? `json:${offlineSource.fileName}|` : ''}${normalizeIdInputText(spaceInp.value).trim()}|${normalizeIdInputText(guestInp.value).trim()}`;

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
    const spaceId = normalizeIdInputText(spaceInp.value).trim();
    if (!/^\d+$/.test(spaceId)) throw new Error('スペースIDを数値で入力してください');
    const key = spaceCacheKey();
    let apps: Array<{ appId: string; name: string }>;
    if (spaceAppsCache && spaceAppsCache.key === key) {
      apps = spaceAppsCache.apps;
    } else if (offlineSource) {
      apps = listOfflineSpaceApps(offlineSource, spaceId);
      spaceAppsCache = { key, apps };
    } else {
      apps = await fetchAppsInSpace(spaceId, normalizeIdInputText(guestInp.value).trim());
      spaceAppsCache = { key, apps };
    }
    renderSpacePicker(spaceId, apps);
    panel.setStatus(`スペース ${spaceId} のアプリ ${apps.length}件を${offlineSource ? '読み込んだ設定JSONから探しました' : '読み込みました'}。起点にするアプリを選択してください`, 'info');
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
    return normalizeIdInputText(value || '').split(/[\s,，]+/).map((v) => v.trim()).filter(Boolean);
  }
  panel.body.insertBefore(details.card, panel.status);

  // ---- 設定JSON・ZIP から作る（任意）: 設定取得で保存したファイルから、kintone に問い合わせずに図を作る ----
  const importCard = makeCard({ title: '設定JSON・ZIP から作る（任意）', soft: true });
  importCard.body.appendChild(makeNote('「設定取得」で保存した設定JSON（「設定をZIPで保存」の ZIP も可）を読み込むと、kintone に問い合わせず、ファイルにあるアプリの設定（フィールド・ルックアップ・関連レコード一覧・アクション）から図を作ります。読み込んだ中に無い参照先は「未取得の参照先」として出ます。読み込むと、起点を読み込んだすべてのアプリにします（起点・探索の深さ・逆引きはあとから変えられます）。', 'help'));
  const importFile = document.createElement('input');
  importFile.type = 'file';
  importFile.accept = '.json,.zip,application/json,application/zip';
  importFile.className = 'kus-lp__file';
  importFile.setAttribute('aria-label', '設定JSON・ZIP を読み込む');
  const clearImportBtn = makeButton('読込解除', 'ghost');
  const importStatus = document.createElement('span');
  importStatus.className = 'kus-lp__pill';
  importStatus.style.overflowWrap = 'anywhere';
  importStatus.setAttribute('data-import-status', 'empty');
  importStatus.textContent = '設定JSON: 未読込';
  importCard.body.appendChild(makeRow(importFile, { label: '設定JSON' }));
  importCard.body.appendChild(makeRow([clearImportBtn, importStatus]));
  panel.body.insertBefore(importCard.card, panel.status);

  function syncOfflineState() {
    const loaded = offlineSource;
    importStatus.className = loaded ? 'kus-lp__pill kus-lp__pill--ok' : 'kus-lp__pill';
    importStatus.setAttribute('data-import-status', loaded ? 'loaded' : 'empty');
    importStatus.textContent = loaded ? `読込中: ${loaded.fileName}（${loaded.appIds.length}アプリ）` : '設定JSON: 未読込';
    offlineBadge.hidden = !loaded;
    offlineBadge.textContent = loaded ? `設定JSON「${loaded.fileName}」の ${loaded.appIds.length}アプリから作ります（kintone に問い合わせません）` : '';
    // 取得環境は読み込んだ設定のとおりになるため、プレビュー環境の切り替えは使わない
    prevCb.checkbox.disabled = !!loaded;
    prevCb.label.title = loaded ? '設定JSONから作るときは、読み込んだ設定の取得環境のとおりになります' : '';
    // スペースの一覧の読み込み元が変わるので、読み込んだ一覧は使わない
    spacePicker.clear();
    importCard.card.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // 読み込み中は入力欄がまとめて無効になり、終わると元に戻るため、表示（プレビューの切り替えの無効など）は読み込みの後にそろえる
  importFile.addEventListener('change', () => { void liteRun(panel, '設定JSONを読み込み中…', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let raw: unknown;
    const warnings: string[] = [];
    if (looksLikeZip(bytes)) {
      // 設定取得の「設定をZIPで保存」の ZIP: manifest.json にあるアプリごとの設定 JSON を読む（JS/CSS の本体は読まない）
      const zip = await readSettingsZip(bytes);
      raw = zip.raw;
      warnings.push(...zip.warnings);
    } else {
      try { raw = JSON.parse(new TextDecoder('utf-8').decode(bytes)); }
      catch { throw new Error('設定JSONとして読み込めません。設定取得で保存した JSON または ZIP か確認してください'); }
    }
    const loaded = buildErOfflineSource(raw, file.name);
    warnings.push(...loaded.warnings);
    offlineSource = loaded;
    appInp.value = loaded.appIds.join(', ');
    appInp.dispatchEvent(new Event('input', { bubbles: true }));
    panel.setStatus(`設定JSON「${file.name}」から${loaded.appIds.length}アプリの設定を読み込みました。起点を読み込んだ${loaded.appIds.length}アプリにしました（それまでの起点は置き換えました）。kintone には問い合わせずに図を作ります${warnings.length ? `。注意: ${warnings.join('。')}` : ''}`, warnings.length ? 'warn' : 'ok');
  }).then(() => syncOfflineState()); });
  clearImportBtn.addEventListener('click', () => {
    const wasLoaded = !!offlineSource;
    offlineSource = null;
    importFile.value = '';
    syncOfflineState();
    panel.setStatus(wasLoaded ? '設定JSONの読込を解除しました。kintone から設定を読み取って図を作ります' : '読み込んでいる設定JSONはありません', 'info');
  });

  function source() {
    // ピッカーで読み込み済みの一覧・選択状態を引き渡す（生成時の再取得を防ぐ）
    const spaceId = normalizeIdInputText(spaceInp.value).trim();
    const cacheHit = !!(spaceAppsCache && spaceAppsCache.key === spaceCacheKey());
    const pickerMatches = cacheHit && pickerSpaceId === spaceId && !spacePicker.element.hidden;
    const selectedIds = pickerMatches ? spacePicker.selected() : null;
    return {
      appId: normalizeIdInputText(appInp.value).trim(),
      appIds: parseAppIds(appInp.value),
      guestId: normalizeIdInputText(guestInp.value).trim(),
      preview: prevCb.checkbox.checked,
      layoutName: layoutSel.value,
      fieldDensity: densitySel.value,
      maxDepth: depthInp.value.trim(),
      includeSubtableFields: subtableCb.checkbox.checked,
      includeReverseLookup: reverseCb.checkbox.checked,
      extraAppIds: parseAppIds(extra.value),
      spaceId,
      spaceApps: cacheHit ? spaceAppsCache.apps : undefined,
      spaceSelectedAppIds: selectedIds ?? undefined,
      offlineSource: offlineSource || undefined
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

  const bindExport = (button: HTMLButtonElement, busy: string, run: (opts: any, setStatus: (m: string, e?: boolean | 'warn') => void) => Promise<unknown>) => {
    button.addEventListener('click', () => liteRun(panel, busy, async () => {
      const validationError = validateErOptions(source());
      if (validationError) { panel.setStatus(validationError, 'warn'); return; }
      await run(source(), (m: string, e?: boolean | 'warn') => panel.setStatus(m, e === 'warn' ? 'warn' : e ? 'err' : 'busy'));
    }));
  };
  bindExport(bMarkdown, 'Markdown 生成中…', runExportERMarkdownStandalone);
  bindExport(bMermaid, 'Mermaid 生成中…', runExportERMermaidStandalone);
  bindExport(bRelations, 'CSV 生成中…', runExportERRelationsCsvStandalone);

  appInp.setAttribute('aria-label', '起点アプリID');
  guestInp.setAttribute('aria-label', 'ゲストスペースID');
  const erSummary = (): Array<[string, string]> => [
    // 起点が複数のときは件数と先頭 20 件までを示す（全アプリを起点にしても確認画面が数千行にならない）
    ['起点', recordTargetSummary(appInp.value, guestInp.value, offlineSource ? '設定JSON' : prevCb.checkbox.checked ? 'プレビュー' : '本番')[1]],
    // 取得元は、設定JSONから作るときだけ示す（kintone から読むときの確認画面は今までどおり）
    ...(offlineSource ? [['取得元', `読み込んだ設定JSON「${offlineSource.fileName}」（${offlineSource.appIds.length}アプリ）。kintone には問い合わせません`] as [string, string]] : []),
    ['参照環境', offlineSource ? `設定JSONのとおり（${offlineSource.connectionText}）` : prevCb.checkbox.checked ? 'プレビュー環境を参照' : '本番環境'],
    ['追加起点', extra.value.trim() || 'なし'],
    ['スペース', (() => {
      const spaceId = spaceInp.value.trim();
      if (!spaceId) return '指定なし';
      const picked = source().spaceSelectedAppIds;
      return picked ? `${spaceId}（読み込んだ ${spacePicker.count()} アプリ中 ${picked.length} 件を起点にする）` : `${spaceId}（スペース内の全アプリを起点にする）`;
    })()],
    ['探索の深さ', !depthInp.value.trim() || Number(depthInp.value) === 0 ? '無制限（関連アプリを最後まで探索します）' : depthInp.value.trim()],
    ['表示', (layoutSel.selectedOptions[0]?.textContent || '') + ' / ' + (densitySel.selectedOptions[0]?.textContent || '')],
    ['逆引き', reverseCb.checkbox.checked ? (offlineSource ? '逆引きあり（読み込んだアプリの中から探します）' : '逆引きあり（テナント内のアプリを走査するため時間がかかる場合があります）') : 'なし'],
    ...(parseAppIds(appInp.value).length >= 50 ? [['起点が多い場合', `${parseAppIds(appInp.value).length}アプリを起点に、設定を数アプリずつ並行して読み取ります。数百アプリを超えると数分かかり、図やHTMLも大きくなります。途中で「中止」できます。`] as [string, string]] : [])
  ];
  const erProblem = () => validateErOptions(source());
  installLiteWorkflow(panel, {
    setup: [cardMain.card, presetCard.card],
    advanced: [details.card, importCard.card],
    advancedCopy: '追加起点・スペースID・レイアウト・表示密度・探索の深さ・サブテーブル・逆引きを変える、設定JSON・ZIP から作るときはこちら。',
    actions: [
      { id: 'open', label: 'ER図を開く', description: '関連アプリの設定を読み取り、アプリ同士のつながりを別画面の図で表示します。', button: bOpen, validate: erProblem, summary: erSummary },
      { id: 'save', label: 'ER図をHTMLで保存', description: '選んだ条件のER図を、共有できるHTMLファイルとして保存します。', button: bSave, validate: erProblem, summary: erSummary },
      { id: 'markdown', label: '仕様書をMarkdownで保存', description: 'アプリ一覧・関連一覧・循環や孤立の確認結果・項目定義をMarkdownファイルで保存します。', button: bMarkdown, validate: erProblem, summary: erSummary },
      { id: 'mermaid', label: 'Mermaidで保存', description: 'GitHubなどで描画できるMermaid形式のER図を保存します。', button: bMermaid, validate: erProblem, summary: erSummary },
      { id: 'relations', label: '関連一覧をCSVで保存', description: 'アプリ同士の関連を1行ずつ並べたCSVファイルを保存します。', button: bRelations, validate: erProblem, summary: erSummary }
    ]
  });

}
