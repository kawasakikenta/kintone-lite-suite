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
  makeInput,
  makeButton,
  makeCheck,
  makeTextarea,
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
    hint: 'Excel 出力は SheetJS / 設計書テンプレートを内蔵。ZIP 一括出力で多アプリを一度に処理できます。'
  });

  // ---- 単アプリ ----
  const cardSingle = makeCard({ title: '単アプリ出力', number: 1 });
  const appInp = makeInput({ placeholder: 'アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const guestInp = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  const prev = makeCheck({ label: 'プレビュー環境から取得' });
  cardSingle.body.appendChild(makeRow([appInp, guestInp, prev.label], { label: '対象' }));

  const source = () => ({
    appId: appInp.value.trim(),
    guestId: guestInp.value.trim(),
    preview: prev.checkbox.checked
  });

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
  cardSingle.body.appendChild(grid);

  bMd.addEventListener('click', () => liteRun(panel, '設計書 Markdown 生成中…', async () => {
    await runDesignExportStandalone('md', source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));
  bJson.addEventListener('click', () => liteRun(panel, '設計書 JSON 生成中…', async () => {
    await runDesignExportStandalone('json', source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));
  bCopy.addEventListener('click', () => liteRun(panel, 'Markdown コピー中…', async () => {
    await runDesignCopyMdStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));
  bXlsx.addEventListener('click', () => liteRun(panel, 'Excel 生成中…', async () => {
    await runDesignExportXlsxStandalone(source(), (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));
  panel.body.insertBefore(cardSingle.card, panel.status);

  // ---- 2アプリ差分 MD ----
  const diffDetails = makeDetails('2 アプリ間の設計差分を Markdown で出力');
  const cmpApp = makeInput({ placeholder: '比較先アプリID', width: 'id' });
  const cmpGuest = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest' });
  const cmpPrev = makeCheck({ label: 'プレビュー環境から取得' });
  diffDetails.body.appendChild(makeRow([cmpApp, cmpGuest, cmpPrev.label], { label: '比較先' }));
  diffDetails.body.appendChild(makeNote('比較元（上のアプリID）と比較先で設計書 MD を生成し、差分レポートを保存します。簡易行差分のため大きな構造変更は文脈が崩れる場合があります。'));
  const bDiff = makeButton('設計書差分 MD を保存', 'primary', { icon: '↓' });
  bDiff.style.width = '100%';
  diffDetails.body.appendChild(bDiff);
  panel.body.insertBefore(diffDetails.details, panel.status);

  bDiff.addEventListener('click', () => liteRun(panel, '設計書差分 MD 生成中…', async () => {
    await runDesignDiffMdStandalone(
      {
        source: source(),
        target: {
          appId: cmpApp.value.trim(),
          guestId: cmpGuest.value.trim(),
          preview: cmpPrev.checkbox.checked
        }
      },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
  }));

  // ---- 複数アプリ ZIP ----
  const batchDetails = makeDetails('複数アプリ一括 ZIP 出力（Excel）');
  const batchIds = makeTextarea({ rows: 3, code: true, placeholder: '例: 74, 120, 305  （カンマ・改行・スペース区切り）' });
  batchDetails.body.appendChild(batchIds);
  batchDetails.body.appendChild(makeNote('シート選択は最初の 1 アプリで 1 回だけ表示し、以降は同じ設定を全アプリに適用します。'));
  const bBatchZip = makeButton('複数アプリの設計書 ZIP を保存', 'primary', { icon: '↓' });
  bBatchZip.style.width = '100%';
  batchDetails.body.appendChild(bBatchZip);
  bBatchZip.addEventListener('click', () => liteRun(panel, '複数アプリ Excel 生成中…', async () => {
    await runBatchDesignExportXlsxZipStandalone(
      { appIdsText: batchIds.value, guestId: guestInp.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
  }));
  panel.body.insertBefore(batchDetails.details, panel.status);

  // ---- アプリ名検索（単アプリ／比較先／一括リストへ流し込み） ----
  cardSingle.body.appendChild(createAppSearchControl(panel, {
    guestEl: guestInp,
    targets: [
      { label: '単アプリ', apply: (id, _name, guestId) => { appInp.value = id; if (guestId && !guestInp.value.trim()) guestInp.value = guestId; } },
      { label: '比較先', apply: (id, _name, guestId) => { cmpApp.value = id; if (guestId && !cmpGuest.value.trim()) cmpGuest.value = guestId; } },
      { label: '一括リスト', apply: (id) => {
        const ids = new Set(batchIds.value.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean));
        ids.add(id);
        batchIds.value = [...ids].join(', ');
        batchDetails.details.open = true;
      } }
    ]
  }));
}
