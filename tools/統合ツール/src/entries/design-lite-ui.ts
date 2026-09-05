'use strict';

import { installLiteWorkflow, foldWorkflowSection, connectionSummary } from './liteWorkflow.js';

import { DEFAULT_APP_ID } from '../constants.js';
import {
  runDesignCopyMdStandalone,
  runDesignDiffMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone,
  runBatchDesignExportXlsxZipStandalone
} from '../tabs/design-standalone.js';
import { pickAllSettingsBundles } from '../settingsBundleImport.js';
import { extractAppNameFromBundle } from '../utils.js';
import {
  createLitePanel,
  makeRow,
  makeButton,
  makeCheck,
  makeAppTable,
  makeCard,
  makeDetails,
  makeNote,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';

export function mountDesignLitePanel() {
  const panel = createLitePanel({
    id: 'kus-design-lite',
    title: '設計書',
    subtitle: 'アプリ設定を取得し、Markdown / JSON / Excel で設計書を出力します。',
    accent: 'design',
    badges: [{ label: 'Lite' }, { label: '4 形式出力' }],
    hint: '対象アプリ表に 1 行入力すれば 1 アプリ出力、複数行で ZIP 一括出力。<strong>アプリごとに別ゲストスペース</strong>も指定できます。'
  });

  // ---- 対象アプリ（表形式：単一/複数を分けない） ----
  const cardTarget = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({
    currentAppId: String(DEFAULT_APP_ID || ''),
    initial: DEFAULT_APP_ID ? [{ appId: String(DEFAULT_APP_ID), guestId: '' }] : []
  });
  cardTarget.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '表に追加', apply: (id, name, guestId) => {
        const result = appTable.putApp(id, guestId || '', { appName: name, focus: true });
        const note = result.action === 'existing' ? '（追加済み）' : result.action === 'filled' ? '（空行へ設定）' : '';
        return {
          message: `アプリ #${id}${name ? ` (${name})` : ''} を対象表に設定しました${note}`,
          tone: result.action === 'existing' ? 'info' : 'ok',
          pickedLabel: result.action === 'existing' ? '追加済み' : '設定済み'
        };
      } }
    ]
  }));
  cardTarget.body.appendChild(appTable.element);
  const prev = makeCheck({ label: 'プレビュー環境から取得（単一出力・2アプリ差分）' });
  cardTarget.body.appendChild(makeRow([prev.label], { label: '取得環境' }));
  cardTarget.body.appendChild(makeNote('単一出力（Markdown / JSON / Excel / コピー）は1行目のアプリが対象です。ZIP 一括出力は表の全行を対象にします。各行「↑コピー」で上の行を複製できます。'));
  panel.body.insertBefore(cardTarget.card, panel.status);

  // ---- 設定JSON読込（任意）：設定一括取得の出力（apps 配列）を取り込んで、API取得なしで設計書を作る ----
  const cardImport = makeCard({ title: '設定JSON読込（任意）', soft: true });
  cardImport.body.appendChild(makeNote('「設定一括取得」で保存したJSON（複数アプリ対応）や単体の設定JSONを指定すると、そのアプリはkintoneへ接続せずJSONの内容だけから設計書を生成します。読み込んだアプリは対象アプリ表に自動追加されます。'));
  const importFile = document.createElement('input');
  importFile.type = 'file';
  importFile.accept = '.json,application/json';
  importFile.className = 'kus-lp__file';
  const clearImportBtn = makeButton('読込解除', 'ghost');
  cardImport.body.appendChild(makeRow(importFile, { label: '設定JSON' }));
  cardImport.body.appendChild(makeRow(clearImportBtn));
  panel.body.insertBefore(cardImport.card, panel.status);

  // appId → 取り込んだ設定バンドル。値があるアプリはAPI取得せずこのバンドルから生成する。
  const importedBundles = new Map<string, any>();
  const appNameLookup = (): Record<string, string> => {
    const map: Record<string, string> = {};
    importedBundles.forEach((b, id) => { const n = extractAppNameFromBundle(b); if (n) map[id] = n; });
    return map;
  };

  importFile.addEventListener('change', () => liteRun(panel, '設定JSONを読み込み中…', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const text = await file.text();
    const bundles = pickAllSettingsBundles(JSON.parse(text));
    let added = 0;
    for (const b of bundles) {
      const appId = String(b?.appId || '').trim();
      if (!appId) continue;
      importedBundles.set(appId, b);
      const result = appTable.putApp(appId, String((b as any)?.guestId || ''), { appName: extractAppNameFromBundle(b) });
      if (result.action === 'added' || result.action === 'filled') added += 1;
    }
    panel.setStatus(`設定JSONから${bundles.length}件のアプリ設定を読み込みました（対象表に新規追加 ${added}件）。読み込んだアプリはAPI取得を行いません。`, 'ok');
  }));
  clearImportBtn.addEventListener('click', () => {
    importedBundles.clear();
    importFile.value = '';
    panel.setStatus('設定JSONの読込を解除しました', 'info');
  });

  // 単一出力用：先頭行を比較元/対象として使う（対応する設定JSONが読み込まれていればそれを使う）
  const source = () => {
    const r = appTable.first();
    return { appId: r.appId, guestId: r.guestId, preview: prev.checkbox.checked, importedBundle: importedBundles.get(r.appId) || null };
  };
  const requireFirstApp = (): boolean => {
    if (!appTable.first().appId) {
      panel.setStatus('対象アプリ表の1行目にアプリIDを入力してください', 'warn');
      return false;
    }
    return true;
  };

  // ---- 単一アプリ出力 ----
  const cardOut = makeCard({ title: '出力（1行目のアプリ）', number: 2 });
  const grid = document.createElement('div');
  grid.className = 'kus-lp__btn-grid';
  const bMd = makeButton('Markdown 保存', 'primary', { icon: '↓' });
  const bJson = makeButton('JSON 保存', 'ghost', { icon: '↓' });
  const bCopy = makeButton('Markdown クリップボード', 'sub', { icon: '⎘' });
  const bXlsx = makeButton('Excel (.xlsx) 保存', 'primary', { icon: '↓' });
  grid.appendChild(bMd);
  grid.appendChild(bXlsx);
  grid.appendChild(bJson);
  grid.appendChild(bCopy);
  cardOut.body.appendChild(grid);
  panel.body.insertBefore(cardOut.card, panel.status);

  bMd.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, '設計書 Markdown 生成中…', async () => {
    await runDesignExportStandalone('md', source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bJson.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, '設計書 JSON 生成中…', async () => {
    await runDesignExportStandalone('json', source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bCopy.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, 'Markdown コピー中…', async () => {
    await runDesignCopyMdStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bXlsx.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, 'Excel 生成中…', async () => {
    await runDesignExportXlsxStandalone({ ...source(), appNameLookup: appNameLookup() }, (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });

  // ---- 複数アプリ ZIP（表の全行） ----
  const cardBatch = makeCard({ title: '複数アプリ一括 ZIP 出力（Excel）', number: 3, soft: true });
  cardBatch.body.appendChild(makeNote('シート選択は最初の 1 アプリで 1 回だけ表示し、以降は同じ設定を全アプリに適用します。アプリごとのゲストスペースは表の各行に従います。設定JSONを読み込んだアプリはAPI取得を行いません。'));
  const bBatchZip = makeButton('対象アプリの設計書 ZIP を保存', 'primary', { icon: '↓' });
  bBatchZip.style.width = '100%';
  cardBatch.body.appendChild(bBatchZip);
  bBatchZip.addEventListener('click', () => {
    const apps = appTable.getApps().map((r) => ({ appId: r.appId, guestId: r.guestId, bundle: importedBundles.get(r.appId) || null }));
    if (!apps.length) { panel.setStatus('対象アプリ表にアプリIDを1件以上入力してください', 'warn'); return; }
    liteRun(panel, '複数アプリ Excel 生成中…', async () => {
      await runBatchDesignExportXlsxZipStandalone(
        { apps },
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
      );
    });
  });
  panel.body.insertBefore(cardBatch.card, panel.status);

  // ---- 2アプリ差分 MD（表の 1行目 ⇔ 2行目） ----
  const diffDetails = makeDetails('2 アプリ間の設計差分を Markdown で出力');
  diffDetails.body.appendChild(makeNote('表の 1 行目を比較元、2 行目を比較先として設計書 MD を生成し、差分レポートを保存します。2 行以上入力してください。簡易行差分のため大きな構造変更は文脈が崩れる場合があります。'));
  const bDiff = makeButton('設計書差分 MD を保存', 'primary', { icon: '↓' });
  bDiff.style.width = '100%';
  diffDetails.body.appendChild(bDiff);
  panel.body.insertBefore(diffDetails.details, panel.status);

  bDiff.addEventListener('click', () => {
    const all = appTable.getAllRows().filter((r) => r.appId);
    if (all.length < 2) { panel.setStatus('差分には対象アプリ表に2行以上のアプリIDが必要です', 'warn'); return; }
    liteRun(panel, '設計書差分 MD 生成中…', async () => {
      await runDesignDiffMdStandalone(
        {
          source: { appId: all[0].appId, guestId: all[0].guestId, preview: prev.checkbox.checked, importedBundle: importedBundles.get(all[0].appId) || null },
          target: { appId: all[1].appId, guestId: all[1].guestId, preview: prev.checkbox.checked, importedBundle: importedBundles.get(all[1].appId) || null }
        },
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
      );
    });
  });

  const singleSummary = (format: string): Array<[string, string]> => [
    ['対象', connectionSummary(appTable.first().appId, appTable.first().guestId, importedBundles.has(appTable.first().appId) ? '読込済みJSON' : prev.checkbox.checked ? 'プレビュー' : '本番')],
    ['取得元', importedBundles.has(appTable.first().appId) ? '読み込んだ設定JSON' : 'アプリから取得'],
    ['出力形式', format], ['対象範囲', '対象表の1行目のみ']
  ];
  const firstRequired = () => appTable.first().appId ? '' : '対象表の1行目にアプリIDを入力してください。';
  installLiteWorkflow(panel, {
    setup: [cardTarget.card, foldWorkflowSection('保存済みの設定JSONを使う', cardImport.card)],
    actions: [
      { id: 'xlsx', label: 'Excel設計書を保存', description: '1行目のアプリをExcelの設計書にします。', button: bXlsx, validate: firstRequired, summary: () => singleSummary('Excel (.xlsx)') },
      { id: 'zip', label: '全対象をExcel ZIPで保存', description: '本番の設定または読込済みJSONから全対象を保存します。', button: bBatchZip, validate: () => appTable.count() ? '' : '対象アプリを1件以上指定してください。', summary: () => [['対象', appTable.getApps().map(r => connectionSummary(r.appId, r.guestId, importedBundles.has(r.appId) ? '読込済みJSON' : '本番')).join('\n')], ['出力', appTable.count() + ' アプリのExcelをZIPに保存'], ['取得環境', 'ZIP一括出力は本番から取得します。設定JSONを読み込んだアプリはその内容を使用します。']] },
      { id: 'md', label: 'Markdown設計書を保存', description: '1行目のアプリを文章で確認できる形式にします。', button: bMd, validate: firstRequired, summary: () => singleSummary('Markdown') },
      { id: 'json', label: '設計書JSONを保存', description: '1行目のアプリの設定をJSONで保存します。', button: bJson, validate: firstRequired, summary: () => singleSummary('JSON') },
      { id: 'copy', label: 'Markdownをコピー', description: '1行目の設計書をクリップボードにコピーします。', button: bCopy, validate: firstRequired, summary: () => singleSummary('クリップボード') },
      { id: 'diff', label: '2アプリの設計差分を保存', description: '表の先頭2アプリを比較したMarkdownを保存します。', button: bDiff, validate: () => appTable.count() >= 2 ? '' : '対象アプリを2件以上指定してください。', summary: () => appTable.getApps().slice(0, 2).map((r, i) => [i ? '比較先' : '比較元', connectionSummary(r.appId, r.guestId, importedBundles.has(r.appId) ? '読込済みJSON' : prev.checkbox.checked ? 'プレビュー' : '本番')]) }
    ]
  });

}
