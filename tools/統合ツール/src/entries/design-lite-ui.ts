'use strict';

import { installLiteWorkflow, connectionSummary, summarizeList } from './liteWorkflow.js';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import {
  runDesignCopyAiMdStandalone,
  runDesignCopyMdStandalone,
  runDesignDiffMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone,
  runBatchDesignExportXlsxZipStandalone,
  validateDesignTarget,
  validateDesignExportTargets
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
    subtitle: 'アプリ設定を取得し、Excel（人向け）または AI向けMarkdown（AIへの受け渡し用）で設計書を出力します。',
    accent: 'design',
    badges: [{ label: '読み取り専用', tone: 'read' }],
    hint: 'アプリの設定を読み取り、設計書として保存またはコピーします。kintone のアプリや設定は変更しません。'
  });

  // ---- 対象アプリ（表形式：単一/複数を分けない） ----
  const cardTarget = makeCard({ title: '対象アプリ', number: 1 });
  const appTable = makeAppTable({
    currentAppId: String(DEFAULT_APP_ID || ''),
    currentGuestId: DEFAULT_GUEST_ID,
    initial: DEFAULT_APP_ID ? [{ appId: String(DEFAULT_APP_ID), guestId: DEFAULT_GUEST_ID }] : []
  });
  cardTarget.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '表に追加', apply: (id, name, guestId) => {
        const result = appTable.putApp(id, guestId || '', { appName: name, focus: true });
        const note = result.action === 'existing' ? '（追加済み）' : result.action === 'filled' ? '（空行へ設定）' : '';
        return {
          message: `アプリ #${id}${name ? ` (${name})` : ''} を対象アプリ表に設定しました${note}`,
          tone: result.action === 'existing' ? 'info' : 'ok',
          pickedLabel: result.action === 'existing' ? '追加済み' : '設定済み'
        };
      }, applyAll: (apps) => {
        const result = appTable.putApps(apps.map((a) => ({ appId: a.appId, guestId: a.guestId, appName: a.appName })));
        const fresh = result.added + result.filled;
        return {
          message: `${apps.length}件のアプリを対象アプリ表に設定しました（新規追加 ${fresh}件 / 追加済み ${result.existing}件）。単一出力は1行目、ZIP一括出力は全行が対象です`,
          tone: fresh ? 'ok' : 'info',
          pickedLabel: fresh ? `${fresh}件を追加済み` : '追加済み'
        };
      } }
    ]
  }));
  cardTarget.body.appendChild(appTable.element);
  const prev = makeCheck({ label: 'プレビュー環境から取得（単一出力・2アプリ差分）' });
  cardTarget.body.appendChild(makeRow([prev.label], { label: '取得環境' }));
  cardTarget.body.appendChild(makeNote('出力は対象アプリ表の1行目が対象です（ZIP 一括出力だけは全行）。Excel は人が読む用、AI向けMarkdown は AI に渡す用です。', 'help'));
  cardTarget.body.appendChild(makeNote('アプリごとに別のゲストスペースを指定できます。各行の「↑コピー」で上の行を複製できます。', 'help'));
  panel.body.insertBefore(cardTarget.card, panel.status);

  // ---- 設定JSON読込（任意）：設定一括取得の出力（apps 配列）を取り込んで、API取得なしで設計書を作る ----
  const cardImport = makeCard({ title: '設定JSON読込（任意）', soft: true });
  cardImport.body.appendChild(makeNote('「設定一括取得」で保存した JSON を読み込むと、そのアプリは kintone から取得せず、JSON の内容だけで設計書を作ります。読み込んだアプリは対象アプリ表に追加されます。', 'help'));
  const importFile = document.createElement('input');
  importFile.type = 'file';
  importFile.accept = '.json,application/json';
  importFile.className = 'kus-lp__file';
  const clearImportBtn = makeButton('読込解除', 'ghost');
  const importStatus = document.createElement('span');
  importStatus.className = 'kus-lp__pill';
  importStatus.setAttribute('data-import-status', 'empty');
  importStatus.textContent = '設定JSON: 未読込';
  cardImport.body.appendChild(makeRow(importFile, { label: '設定JSON' }));
  cardImport.body.appendChild(makeRow([clearImportBtn, importStatus]));
  panel.body.insertBefore(cardImport.card, panel.status);

  // `${appId}::${guestId}` および `${appId}` → 取り込んだ設定バンドル。
  // `{ source, target }` 形式の差分バンドル読込時は行スロット（0=source, 1=target）別にも保持し、
  // 同一アプリIDの2時点・2環境比較でも別バンドルとして扱えるようにする。
  const importedBundles = new Map<string, any>();
  const importedSlotBundles = new Map<number, any>();

  const storeImportedBundle = (b: any, slotIndex?: number) => {
    const appId = String(b?.appId || '').trim();
    if (!appId) return '';
    const guestId = String((b as any)?.guestId || '').trim();
    importedBundles.set(`${appId}::${guestId}`, b);
    if (!importedBundles.has(appId) || !guestId) {
      importedBundles.set(appId, b);
    }
    if (slotIndex !== undefined) {
      importedSlotBundles.set(slotIndex, b);
    }
    return appId;
  };

  const findImportedBundle = (appId: string, guestId = '', slotIndex?: number): any => {
    const id = String(appId || '').trim();
    const g = String(guestId || '').trim();
    if (!id) return null;
    if (slotIndex !== undefined && importedSlotBundles.has(slotIndex)) {
      const slotBundle = importedSlotBundles.get(slotIndex);
      const slotAppId = String(slotBundle?.appId || '').trim();
      const slotGuestId = String(slotBundle?.guestId || '').trim();
      if (slotAppId === id && (!g || !slotGuestId || slotGuestId === g)) {
        return slotBundle;
      }
    }
    return importedBundles.get(`${id}::${g}`) || importedBundles.get(id) || null;
  };

  const hasImportedBundle = (appId: string, guestId = '', slotIndex?: number): boolean =>
    Boolean(findImportedBundle(appId, guestId, slotIndex));

  const appNameLookup = (): Record<string, string> => {
    const map: Record<string, string> = {};
    importedBundles.forEach((b) => {
      const id = String(b?.appId || '').trim();
      const g = String((b as any)?.guestId || '').trim();
      const n = extractAppNameFromBundle(b);
      if (id && n) {
        if (g) map[`${id}::${g}`] = n;
        if (!map[id]) map[id] = n;
      }
    });
    return map;
  };

  importFile.addEventListener('change', () => liteRun(panel, '設定JSONを読み込み中…', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const text = await file.text();
    let raw: any;
    try { raw = JSON.parse(text); }
    catch { throw new Error('設定JSONとして読み込めません。JSON形式のファイルか確認してください'); }
    // AI向けMarkdownでは入力JSONの型・空値・未知キーを原文として扱うため、
    // 読み込み時に normalize して情報を失わない。
    importedBundles.clear();
    importedSlotBundles.clear();
    let added = 0;
    const loadedLabels: string[] = [];
    const warnings: string[] = [];

    if (raw && typeof raw === 'object' && raw.source && raw.target) {
      const srcBundles = pickAllSettingsBundles(raw, 'source', true, true);
      const tgtBundles = pickAllSettingsBundles(raw, 'target', true, true);
      const pair = [srcBundles[0], tgtBundles[0]].filter(Boolean);
      pair.forEach((b, idx) => {
        const appId = storeImportedBundle(b, idx);
        if (!appId) {
          warnings.push(`${idx ? '比較先' : '比較元'}の設定にアプリIDが無いため読み込めませんでした`);
          return;
        }
        const guestId = String((b as any)?.guestId || '').trim();
        const appName = extractAppNameFromBundle(b);
        loadedLabels.push(`#${appId}${guestId ? `(guest:${guestId})` : ''}`);
        const res = appTable.putApp(appId, guestId, { appName });
        if (res.action === 'added' || res.action === 'filled') {
          added += 1;
        } else if (idx === 1 && appTable.getAllRows().filter((r) => r.appId).length < 2) {
          appTable.addRow(appId, guestId, { appName });
          added += 1;
        }
      });
    } else {
      const bundles = pickAllSettingsBundles(raw, undefined, true, true);
      // アプリIDの無いバンドルは使えず、同じアプリID・ゲストIDが複数あると後のものだけが残るため、
      // 件数を数えて利用者に示す（黙って捨てない）。
      let missingAppId = 0;
      const seenKeys = new Set<string>();
      const duplicated = new Set<string>();
      for (const b of bundles) {
        const appId = String(b?.appId || '').trim();
        if (!appId) { missingAppId += 1; continue; }
        const guestId = String((b as any)?.guestId || '').trim();
        const label = `#${appId}${guestId ? `(guest:${guestId})` : ''}`;
        const key = `${appId}::${guestId}`;
        const isDuplicate = seenKeys.has(key);
        seenKeys.add(key);
        if (isDuplicate) duplicated.add(label);
        storeImportedBundle(b);
        if (!isDuplicate) loadedLabels.push(label);
        const result = appTable.putApp(appId, guestId, { appName: extractAppNameFromBundle(b) });
        if (result.action === 'added' || result.action === 'filled') added += 1;
      }
      if (missingAppId) warnings.push(`アプリIDの無い設定 ${missingAppId}件は読み込めませんでした`);
      if (duplicated.size) warnings.push(`同じアプリIDが複数あったため後の設定を使用しました（${[...duplicated].join(', ')}）`);
    }
    if (!loadedLabels.length) {
      importStatus.className = 'kus-lp__pill';
      importStatus.setAttribute('data-import-status', 'empty');
      importStatus.textContent = '設定JSON: 未読込';
      cardImport.card.dispatchEvent(new Event('input', { bubbles: true }));
      panel.setStatus(`読み込めるアプリ設定がありません。${warnings.join('。')}`, 'warn');
      return;
    }
    importStatus.className = 'kus-lp__pill kus-lp__pill--ok';
    importStatus.setAttribute('data-import-status', 'loaded');
    importStatus.textContent = `読込中: ${file.name} (App ${loadedLabels.join(', ')})`;
    cardImport.card.dispatchEvent(new Event('input', { bubbles: true }));
    panel.setStatus(`設定JSON「${file.name}」から${loadedLabels.length}件のアプリ設定を読み込みました（対象アプリ表に新規追加 ${added}件）。読み込んだアプリは kintone から取得しません。${warnings.length ? `注意: ${warnings.join('。')}` : ''}`, warnings.length ? 'warn' : 'ok');
  }));
  clearImportBtn.addEventListener('click', () => {
    importedBundles.clear();
    importedSlotBundles.clear();
    importFile.value = '';
    importStatus.className = 'kus-lp__pill';
    importStatus.setAttribute('data-import-status', 'empty');
    importStatus.textContent = '設定JSON: 未読込';
    cardImport.card.dispatchEvent(new Event('input', { bubbles: true }));
    panel.setStatus('設定JSONの読込を解除しました', 'info');
  });

  // 単一出力用：先頭行を比較元/対象として使う（対応する設定JSONが読み込まれていればそれを使う）
  const source = () => {
    const r = appTable.first();
    return { appId: r.appId, guestId: r.guestId, preview: prev.checkbox.checked, importedBundle: findImportedBundle(r.appId, r.guestId, 0) };
  };
  const requireFirstApp = (): boolean => {
    const message = validateDesignTarget(source(), '対象アプリ表の1行目: ');
    if (message) {
      panel.setStatus(message, 'warn');
      return false;
    }
    return true;
  };

  // ---- 単一アプリ出力 ----
  const cardOut = makeCard({ title: '出力（1行目のアプリ）', number: 2 });
  const grid = document.createElement('div');
  grid.className = 'kus-lp__btn-grid';
  const bMd = makeButton('Markdown 保存', 'primary', { icon: '↓' });
  const bAiMd = makeButton('AI向けMarkdown 保存', 'primary', { icon: '↓' });
  const bJson = makeButton('JSON 保存', 'ghost', { icon: '↓' });
  const bCopy = makeButton('Markdown クリップボード', 'sub', { icon: '⎘' });
  const bAiCopy = makeButton('AI向けMarkdown コピー', 'sub', { icon: '⎘' });
  const bXlsx = makeButton('Excel (.xlsx) 保存', 'primary', { icon: '↓' });
  grid.appendChild(bMd);
  grid.appendChild(bAiMd);
  grid.appendChild(bXlsx);
  grid.appendChild(bJson);
  grid.appendChild(bCopy);
  grid.appendChild(bAiCopy);
  cardOut.body.appendChild(grid);
  panel.body.insertBefore(cardOut.card, panel.status);

  bMd.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, '設計書 Markdown 生成中…', async () => {
    await runDesignExportStandalone('md', source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bAiMd.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, 'AI向けMarkdown 生成中…', async () => {
    await runDesignExportStandalone('ai-md', { ...source(), rawSettings: true }, (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bJson.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, '設計書 JSON 生成中…', async () => {
    await runDesignExportStandalone('json', source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bCopy.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, 'Markdown コピー中…', async () => {
    await runDesignCopyMdStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bAiCopy.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, 'AI向けMarkdown コピー中…', async () => {
    await runDesignCopyAiMdStandalone({ ...source(), rawSettings: true }, (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });
  bXlsx.addEventListener('click', () => { if (!requireFirstApp()) return; liteRun(panel, 'Excel 生成中…', async () => {
    await runDesignExportXlsxStandalone({ ...source(), appNameLookup: appNameLookup() }, (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });

  // ---- 複数アプリ ZIP（表の全行） ----
  const cardBatch = makeCard({ title: '複数アプリ一括 ZIP 出力（Excel）', number: 3, soft: true });
    const bBatchZip = makeButton('対象アプリの設計書 ZIP を保存', 'primary', { icon: '↓' });
  bBatchZip.style.width = '100%';
  cardBatch.body.appendChild(bBatchZip);
  bBatchZip.addEventListener('click', () => {
    const apps = appTable.getApps().map((r, i) => ({ appId: r.appId, guestId: r.guestId, bundle: findImportedBundle(r.appId, r.guestId, i) }));
    const targetError = validateDesignExportTargets(apps, '対象アプリ表: ');
    if (targetError) { panel.setStatus(targetError, 'warn'); return; }
    liteRun(panel, '複数アプリ Excel 生成中…', async () => {
      await runBatchDesignExportXlsxZipStandalone(
        { apps },
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
      );
    });
  });
  panel.body.insertBefore(cardBatch.card, panel.status);

  // ---- 2アプリ差分 MD（表の 1行目 ⇔ 2行目） ----
  // ZIP 一括出力と設計差分の補足は、表面に出さず詳細設定のポップアップで読めるようにする
  const cardOutputInfo = makeCard({ title: 'まとめて出力・設計差分について', soft: true });
  cardOutputInfo.body.appendChild(makeNote('ZIP 一括出力: シート選択は最初の1アプリで1回だけ表示し、以降の全アプリに同じ選択を適用します。設定JSONを読み込んだアプリは kintone から取得しません。'));
  cardOutputInfo.body.appendChild(makeNote('設計差分: 対象アプリ表の1行目を比較元、2行目を比較先として、設計書の差分レポートを Markdown で保存します（2行以上の入力が必要です）。簡易な行単位の差分のため、大きな構造変更では前後の文脈が崩れることがあります。'));

  const diffDetails = makeDetails('2 アプリ間の設計差分を Markdown で出力');
  const bDiff = makeButton('設計書差分 MD を保存', 'primary', { icon: '↓' });
  bDiff.style.width = '100%';
  diffDetails.body.appendChild(bDiff);
  panel.body.insertBefore(diffDetails.details, panel.status);

  const diffTargetRows = () => appTable.getAllRows().filter((r) => r.appId).slice(0, 2);

  bDiff.addEventListener('click', () => {
    // 確認画面の検証と同じ行（diffTargetRows）を使う。同一アプリの2時点比較（設定JSONの source/target）
    // では重複行も比較元・比較先として扱うため、重複を除く getApps ではなく先頭2行を使う。
    const all = diffTargetRows();
    if (all.length < 2) { panel.setStatus('差分には対象アプリ表に2行以上のアプリIDが必要です', 'warn'); return; }
    liteRun(panel, '設計書差分 MD 生成中…', async () => {
      await runDesignDiffMdStandalone(
        {
          source: { appId: all[0].appId, guestId: all[0].guestId, preview: prev.checkbox.checked, importedBundle: findImportedBundle(all[0].appId, all[0].guestId, 0) },
          target: { appId: all[1].appId, guestId: all[1].guestId, preview: prev.checkbox.checked, importedBundle: findImportedBundle(all[1].appId, all[1].guestId, 1) }
        },
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
      );
    });
  });

  const singleSummary = (format: string): Array<[string, string]> => {
    const first = appTable.first();
    const isImported = hasImportedBundle(first.appId, first.guestId, 0);
    return [
      ['対象', connectionSummary(first.appId, first.guestId, isImported ? '読込済みJSON' : prev.checkbox.checked ? 'プレビュー' : '本番')],
      ['取得元', isImported ? '読み込んだ設定JSON' : 'アプリから取得'],
      ['出力形式', format], ['対象範囲', '対象表の1行目のみ']
    ];
  };
  const firstTargetRequired = () => validateDesignTarget(source(), '対象表の1行目: ');
  installLiteWorkflow(panel, {
    setup: [cardTarget.card],
    advanced: [cardImport.card, cardOutputInfo.card],
    advancedCopy: '保存済みの設定JSONを使う、ZIP一括出力や設計差分の補足を読むときはこちら。',
    actions: [
      { id: 'xlsx', label: 'Excel設計書を保存', description: '1行目のアプリの設計書をExcel（.xlsx）で保存します。', button: bXlsx, validate: firstTargetRequired, summary: () => singleSummary('Excel (.xlsx)') },
      { id: 'zip', label: '全対象をExcel ZIPで保存', description: '全対象アプリの設計書をExcelにして、1つのZIPで保存します。', button: bBatchZip, validate: () => validateDesignExportTargets(appTable.getApps().map((r, i) => ({ ...r, bundle: findImportedBundle(r.appId, r.guestId, i) })), '対象アプリ表: '), summary: () => [['対象', summarizeList(appTable.getApps().map((r, i) => connectionSummary(r.appId, r.guestId, hasImportedBundle(r.appId, r.guestId, i) ? '読込済みJSON' : '本番')))], ['出力', appTable.count() + ' アプリのExcelをZIPに保存'], ['取得環境', 'ZIP一括出力は本番から取得します。設定JSONを読み込んだアプリはその内容を使用します。'], ...(appTable.count() >= 50 ? [['件数が多い場合', 'アプリごとに順に取得するため、時間とメモリを使います。途中で「中止」でき、その場合ZIPは保存しません。'] as [string, string]] : [])] },
      { id: 'ai-md', label: 'AI向けMarkdownを保存', description: '1行目のアプリの設定を、AIに渡す用のMarkdownファイルで保存します。', button: bAiMd, validate: firstTargetRequired, summary: () => singleSummary('AI向けMarkdown（AIへの受け渡し）') },
      { id: 'md', label: 'Markdown設計書を保存', description: '1行目のアプリの設計書をMarkdownファイルで保存します。', button: bMd, validate: firstTargetRequired, summary: () => singleSummary('Markdown') },
      { id: 'ai-copy', label: 'AI向けMarkdownをコピー', description: '1行目のアプリの設定を、AIに渡す用のMarkdownとしてコピーします。', button: bAiCopy, validate: firstTargetRequired, summary: () => singleSummary('AI向けMarkdown（クリップボード）') },
      { id: 'json', label: '設計書JSONを保存', description: '1行目のアプリの設定をJSONファイルで保存します。', button: bJson, validate: firstTargetRequired, summary: () => singleSummary('JSON') },
      { id: 'copy', label: 'Markdownをコピー', description: '1行目のアプリの設計書をMarkdownとしてクリップボードにコピーします。', button: bCopy, validate: firstTargetRequired, summary: () => singleSummary('クリップボード') },
      { id: 'diff', label: '2アプリの設計差分を保存', description: '対象アプリ表の1行目（比較元）と2行目（比較先）の設計差分をMarkdownファイルで保存します。', button: bDiff, validate: () => {
        const rows = diffTargetRows();
        if (rows.length < 2) return '対象アプリを2件以上指定してください。';
        return validateDesignExportTargets(rows.map((r, i) => ({ ...r, bundle: findImportedBundle(r.appId, r.guestId, i) })), '比較対象: ');
      }, summary: () => diffTargetRows().map((r, i) => [i ? '比較先' : '比較元', connectionSummary(r.appId, r.guestId, hasImportedBundle(r.appId, r.guestId, i) ? '読込済みJSON' : prev.checkbox.checked ? 'プレビュー' : '本番')]) }
    ]
  });

}
