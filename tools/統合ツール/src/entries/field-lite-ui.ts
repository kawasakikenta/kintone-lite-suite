'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import {
  runFieldApplyStandalone,
  runLoadFieldsStandalone,
  runBulkRenameFieldStandalone
} from '../tabs/field-standalone.js';
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

export function mountFieldLitePanel() {
  const panel = createLitePanel({
    id: 'kus-field-lite',
    title: 'フィールド追加',
    subtitle: 'フィールド定義 JSON を比較先プレビューへ追加・更新します。',
    accent: 'field',
    badges: [{ label: 'Lite' }, { label: 'プレビュー反映' }],
    hint: 'プレビュー環境へ POST/PUT します。本番反映は別途 kintone 管理画面で手動デプロイしてください。'
  });

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: 'アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID (任意)', width: 'guest' });
  const tgtApp = makeInput({ placeholder: 'アプリID', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID (任意)', width: 'guest' });

  const cardApp = makeCard({ title: 'アプリ', number: 1 });
  cardApp.body.appendChild(makeRow([srcApp, srcGuest], { label: '比較元' }));
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '比較先' }));
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- フィールド定義JSON ----
  const fieldJson = makeTextarea({ rows: 8, code: true, placeholder: 'フィールド定義 JSON（{ "properties": { ... } } 形式）' });

  const bLoadSrc = makeButton('比較元から読込', 'sub');
  const bLoadTgt = makeButton('比較先から読込', 'sub');
  const bClear = makeButton('クリア', 'ghost');
  bClear.addEventListener('click', () => { fieldJson.value = ''; });

  const cardJson = makeCard({ title: 'フィールド定義 JSON', number: 2 });
  cardJson.actions.appendChild(bLoadSrc);
  cardJson.actions.appendChild(bLoadTgt);
  cardJson.actions.appendChild(bClear);
  cardJson.body.appendChild(fieldJson);
  panel.body.insertBefore(cardJson.card, panel.status);

  bLoadSrc.addEventListener('click', () => liteRun(panel, '比較元フィールド取得中…', async () => {
    const props = await runLoadFieldsStandalone(
      { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    fieldJson.value = JSON.stringify({ properties: props }, null, 2);
  }, '比較元のフィールド定義を読み込みました'));

  bLoadTgt.addEventListener('click', () => liteRun(panel, '比較先フィールド取得中…', async () => {
    const props = await runLoadFieldsStandalone(
      { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: true },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    fieldJson.value = JSON.stringify({ properties: props }, null, 2);
  }, '比較先のフィールド定義を読み込みました'));

  // ---- オプション ----
  const optCard = makeCard({ title: '反映オプション', number: 3, soft: true });
  const lookupMap = makeTextarea({ rows: 2, code: true, placeholder: 'Lookup AppID 変換 JSON（任意）: {"旧":"新", ...}' });
  optCard.body.appendChild(makeRow(lookupMap, { label: 'Lookup', block: true }));
  const ow = makeCheck({ label: '既存フィールドを上書き更新', help: '同一フィールドコードがある場合に PUT で更新します' });
  optCard.body.appendChild(makeRow(ow.label));
  panel.body.insertBefore(optCard.card, panel.status);

  const bApply = makeButton('比較先プレビューへ反映', 'run', { icon: '⤴' });
  panel.body.insertBefore(bApply, panel.status);

  bApply.addEventListener('click', () => liteRun(panel, '反映中…', async () => {
    const logs = await runFieldApplyStandalone(
      {
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        fieldJson: fieldJson.value,
        lookupMapJson: lookupMap.value,
        overwrite: ow.checkbox.checked,
        deploy: false
      },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    panel.setResult(logs.join('\n'));
  }, '反映処理が完了しました（ログは下に表示）'));

  // ---- バルクリネーム ----
  const renameDetails = makeDetails('プレフィックス一括リネーム（比較先プレビュー）');
  const renamePrefix = makeInput({ placeholder: '例: dev_', width: 'medium' });
  const removeMode = makeCheck({ label: '付与ではなく除去する' });
  const bRename = makeButton('リネーム結果を JSON に流し込む', 'sub');
  renameDetails.body.appendChild(makeRow(renamePrefix, { label: '文字列' }));
  renameDetails.body.appendChild(makeRow(removeMode.label));
  renameDetails.body.appendChild(makeRow(bRename));
  const renameNote = makeNote('比較先のフィールドコードを書き換えた JSON を生成して上のテキストエリアにセットします（反映は別途実行）。');
  renameDetails.body.appendChild(renameNote);
  panel.body.insertBefore(renameDetails.details, panel.status);

  bRename.addEventListener('click', () => liteRun(panel, 'リネーム生成中…', async () => {
    const out = await runBulkRenameFieldStandalone(
      {
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        prefix: renamePrefix.value,
        removeMode: removeMode.checkbox.checked
      },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    if (!out) return;
    fieldJson.value = JSON.stringify({ properties: out.properties }, null, 2);
    const list = out.renamePairs.slice(0, 50).map((p) => `${p.from}  →  ${p.to}`).join('\n');
    panel.setResult(list + (out.renamePairs.length > 50 ? `\n... 他 ${out.renamePairs.length - 50} 件` : ''));
  }, '対象を JSON にセットしました。反映するなら上の「反映」ボタンを押してください'));
}
