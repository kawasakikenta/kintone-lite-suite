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
import { createAppSearchControl } from './appSearchControl.js';
import { downloadText } from '../utils.js';

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
  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '比較元', apply: (id, _name, guestId) => { srcApp.value = id; if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId; } },
      { label: '比較先', apply: (id, _name, guestId) => { tgtApp.value = id; if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId; } }
    ]
  }));
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- フィールド定義JSON ----
  const fieldJson = makeTextarea({ rows: 8, code: true, placeholder: 'フィールド定義 JSON（{ "properties": { ... } } 形式）' });

  const bLoadSrc = makeButton('比較元から読込', 'sub');
  const bLoadTgt = makeButton('比較先から読込', 'sub');
  const bFormat = makeButton('整形', 'sub');
  const bImport = makeButton('ファイル読込', 'sub');
  const bExport = makeButton('保存', 'sub');
  const bClear = makeButton('クリア', 'ghost');
  bClear.addEventListener('click', () => { fieldJson.value = ''; });
  bFormat.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(fieldJson.value || '{}');
      fieldJson.value = JSON.stringify(parsed, null, 2);
      panel.setStatus('JSON を整形しました', 'ok');
    } catch (e: any) {
      panel.setStatus(`JSON が壊れています: ${e?.message || String(e)}`, 'err');
    }
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text);
        fieldJson.value = JSON.stringify(parsed, null, 2);
        panel.setStatus(`「${file.name}」を読み込みました`, 'ok');
      } catch (e: any) {
        panel.setStatus(`JSON 読み込みエラー: ${e?.message || String(e)}`, 'err');
      } finally {
        fileInput.value = '';
      }
    });
  });
  bImport.addEventListener('click', () => fileInput.click());
  bExport.addEventListener('click', () => {
    const text = fieldJson.value.trim();
    if (!text) {
      panel.setStatus('保存する JSON がありません', 'warn');
      return;
    }
    try {
      JSON.parse(text); // 妥当性のみチェック
    } catch (e: any) {
      panel.setStatus(`JSON が壊れています: ${e?.message || String(e)}`, 'err');
      return;
    }
    const stamp = new Date().toISOString().replace(/[^\dT]/g, '').slice(0, 15);
    const appLabel = (tgtApp.value.trim() || srcApp.value.trim() || 'app');
    downloadText(`fields_${appLabel}_${stamp}.json`, text, 'application/json');
    panel.setStatus('フィールド JSON を保存しました', 'ok');
  });

  const cardJson = makeCard({ title: 'フィールド定義 JSON', number: 2 });
  cardJson.actions.appendChild(bLoadSrc);
  cardJson.actions.appendChild(bLoadTgt);
  cardJson.actions.appendChild(bFormat);
  cardJson.actions.appendChild(bImport);
  cardJson.actions.appendChild(bExport);
  cardJson.actions.appendChild(bClear);
  cardJson.body.appendChild(fileInput);
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

  // ---- 比較元からフィールドを選んでマージ ----
  const pickDetails = makeDetails('比較元からフィールドを選んでマージ', { open: false });
  const bLoadPickList = makeButton('比較元フィールド一覧を取得', 'sub');
  pickDetails.body.appendChild(makeRow(bLoadPickList));
  const pickListBox = document.createElement('div');
  pickListBox.style.cssText = 'display:none;margin-top:8px;max-height:240px;overflow:auto;border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px';
  const pickTable = document.createElement('table');
  pickTable.style.cssText = 'width:100%;font-size:11.5px;border-collapse:collapse';
  const pickHead = document.createElement('thead');
  pickHead.innerHTML = '<tr style="position:sticky;top:-6px;background:#f8fafc;z-index:1;box-shadow:0 1px 0 #e2e8f0">'
    + '<th style="width:30px;text-align:center;padding:4px"><input type="checkbox" id="kus-field-lite-check-all" title="表示中の全行を選択"></th>'
    + '<th style="text-align:left;padding:4px">コード / ラベル</th>'
    + '<th style="text-align:left;padding:4px;width:130px">タイプ</th>'
    + '</tr>';
  const pickBody = document.createElement('tbody');
  pickTable.appendChild(pickHead);
  pickTable.appendChild(pickBody);
  pickListBox.appendChild(pickTable);
  pickDetails.body.appendChild(pickListBox);

  const bInsertPicked = makeButton('選択したフィールドを JSON に挿入（マージ）', 'primary');
  const bClosePick = makeButton('閉じる', 'ghost');
  const pickActions = makeRow([bInsertPicked, bClosePick]);
  pickActions.style.cssText = 'display:none;margin-top:8px';
  pickDetails.body.appendChild(pickActions);

  let pickedPropsCache: Record<string, any> = {};

  bLoadPickList.addEventListener('click', () => liteRun(panel, '比較元フィールド一覧を取得中…', async () => {
    const props = await runLoadFieldsStandalone(
      { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    pickedPropsCache = props || {};
    pickBody.innerHTML = '';
    const entries = Object.entries(pickedPropsCache) as Array<[string, any]>;
    entries.sort(([a], [b]) => a.localeCompare(b));
    for (const [code, def] of entries) {
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid #f1f5f9';
      const tdCb = document.createElement('td');
      tdCb.style.cssText = 'padding:4px;text-align:center';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.code = code;
      tdCb.appendChild(cb);
      const tdCode = document.createElement('td');
      tdCode.style.cssText = 'padding:4px;font-family:ui-monospace,monospace';
      tdCode.textContent = `${code}${def?.label ? `  /  ${def.label}` : ''}`;
      const tdType = document.createElement('td');
      tdType.style.cssText = 'padding:4px;color:#475569';
      tdType.textContent = String(def?.type || '');
      tr.appendChild(tdCb);
      tr.appendChild(tdCode);
      tr.appendChild(tdType);
      pickBody.appendChild(tr);
    }
    pickListBox.style.display = 'block';
    pickActions.style.display = 'flex';
  }, `${Object.keys(pickedPropsCache).length}件のフィールド候補を表示中（左クリックで選択）`));

  pickHead.querySelector<HTMLInputElement>('#kus-field-lite-check-all')?.addEventListener('change', (ev) => {
    const all = (ev.target as HTMLInputElement).checked;
    pickBody.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((cb) => { cb.checked = all; });
  });

  bClosePick.addEventListener('click', () => {
    pickListBox.style.display = 'none';
    pickActions.style.display = 'none';
  });

  bInsertPicked.addEventListener('click', () => {
    const codes = Array.from(pickBody.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked'))
      .map((cb) => cb.dataset.code || '')
      .filter(Boolean);
    if (!codes.length) {
      panel.setStatus('挿入するフィールドにチェックを入れてください', 'warn');
      return;
    }
    let current: { properties?: Record<string, any> } = {};
    if (fieldJson.value.trim()) {
      try {
        const parsed = JSON.parse(fieldJson.value);
        current = parsed && typeof parsed === 'object'
          ? (parsed.properties ? parsed : { properties: parsed })
          : { properties: {} };
      } catch (e: any) {
        panel.setStatus(`既存 JSON が壊れています: ${e?.message || String(e)}`, 'err');
        return;
      }
    } else {
      current = { properties: {} };
    }
    const props = current.properties = { ...(current.properties || {}) };
    let added = 0;
    for (const code of codes) {
      const def = pickedPropsCache[code];
      if (def) {
        props[code] = JSON.parse(JSON.stringify(def));
        added++;
      }
    }
    fieldJson.value = JSON.stringify(current, null, 2);
    panel.setStatus(`${added}件のフィールドを JSON にマージしました`, 'ok');
  });

  panel.body.insertBefore(pickDetails.details, panel.status);

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
