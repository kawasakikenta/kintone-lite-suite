'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import {
  runDesignCopyMdStandalone,
  runDesignDiffMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone,
  runBatchDesignExportXlsxZipStandalone
} from '../tabs/design-standalone.js';
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
  const prev = makeCheck({ label: 'プレビュー環境から取得' });
  cardTarget.body.appendChild(makeRow([prev.label], { label: '取得環境' }));
  cardTarget.body.appendChild(makeNote('単一出力（Markdown / JSON / Excel / コピー）は1行目のアプリが対象です。ZIP 一括出力は表の全行を対象にします。各行「↑コピー」で上の行を複製できます。'));
  panel.body.insertBefore(cardTarget.card, panel.status);

  // 単一出力用：先頭行を比較元/対象として使う
  const source = () => {
    const r = appTable.first();
    return { appId: r.appId, guestId: r.guestId, preview: prev.checkbox.checked };
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
    await runDesignExportXlsxStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }); });

  // ---- 複数アプリ ZIP（表の全行） ----
  const cardBatch = makeCard({ title: '複数アプリ一括 ZIP 出力（Excel）', number: 3, soft: true });
  cardBatch.body.appendChild(makeNote('シート選択は最初の 1 アプリで 1 回だけ表示し、以降は同じ設定を全アプリに適用します。アプリごとのゲストスペースは表の各行に従います。'));
  const bBatchZip = makeButton('対象アプリの設計書 ZIP を保存', 'primary', { icon: '↓' });
  bBatchZip.style.width = '100%';
  cardBatch.body.appendChild(bBatchZip);
  bBatchZip.addEventListener('click', () => {
    const apps = appTable.getApps();
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
          source: { appId: all[0].appId, guestId: all[0].guestId, preview: prev.checkbox.checked },
          target: { appId: all[1].appId, guestId: all[1].guestId, preview: prev.checkbox.checked }
        },
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
      );
    });
  });
}
