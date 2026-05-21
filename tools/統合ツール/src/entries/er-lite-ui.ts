'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import {
  runGenerateERDiagramStandalone,
  runExportERDiagramHtmlStandalone
} from '../tabs/er-standalone.js';
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
  liteRun
} from './litePanelTheme.js';

export function mountErLitePanel() {
  const panel = createLitePanel({
    id: 'kus-er-lite',
    title: 'ER 図',
    subtitle: '起点アプリからルックアップ／関連レコードを辿り ER 図を生成します。',
    accent: 'er',
    badges: [{ label: 'Lite' }, { label: '可視化' }],
    hint: 'Cytoscape を CDN から動的読込します。生成後の HTML 出力でレポートに添付できます。'
  });

  // ---- 起点 ----
  const cardMain = makeCard({ title: '起点アプリ', number: 1 });
  const appInp = makeInput({ placeholder: 'アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  cardMain.body.appendChild(makeRow([appInp, guestInp], { label: '起点ID' }));

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
    ['full', '詳細']
  ], 'standard');
  const depthInp = makeInput({ placeholder: '0=無制限', value: '0', type: 'number', width: 'narrow' });
  depthInp.setAttribute('min', '0');
  const subtableCb = makeCheck({ label: 'サブテーブル展開', checked: true });
  const reverseCb = makeCheck({ label: '逆引き探索', checked: false });

  details.body.appendChild(makeRow(extra, { label: '追加起点' }));
  details.body.appendChild(makeRow(spaceInp, { label: 'スペースID' }));
  details.body.appendChild(makeRow(layoutSel, { label: 'レイアウト' }));
  details.body.appendChild(makeRow(densitySel, { label: '表示密度' }));
  details.body.appendChild(makeRow(depthInp, { label: '探索深さ' }));
  details.body.appendChild(makeRow([subtableCb.label, reverseCb.label]));
  details.body.appendChild(makeNote('追加起点は最初の起点と統合して同一グラフに描画されます。'));
  panel.body.insertBefore(details.details, panel.status);

  function source() {
    return {
      appId: appInp.value.trim(),
      guestId: guestInp.value.trim(),
      preview: false,
      layoutName: layoutSel.value,
      fieldDensity: densitySel.value,
      maxDepth: Number(depthInp.value) || 0,
      includeSubtableFields: subtableCb.checkbox.checked,
      includeReverseLookup: reverseCb.checkbox.checked,
      extraAppIds: extra.value.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean),
      spaceId: spaceInp.value.trim()
    };
  }

  bOpen.addEventListener('click', () => liteRun(panel, 'ER 図を生成中…', async () => {
    await runGenerateERDiagramStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));

  bSave.addEventListener('click', () => liteRun(panel, 'HTML 生成中…', async () => {
    await runExportERDiagramHtmlStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));
}
