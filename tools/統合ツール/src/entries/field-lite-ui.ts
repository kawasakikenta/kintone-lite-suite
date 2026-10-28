'use strict';

import { installLiteWorkflow, foldWorkflowSection, connectionSummary } from './liteWorkflow.js';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import {
  runFieldApplyStandalone,
  runLoadFieldsStandalone,
  runBulkRenameFieldStandalone,
  findFieldApplyProblem,
  parseFieldJsonInput,
  parseLookupMapInput,
  type BulkRenameMode
} from '../tabs/field-standalone.js';
import {
  collectFieldValidationIssues,
  summarizeFieldProps,
  collectFieldApplyWarnings
} from '../tabs/field.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeSelect,
  makeButton,
  makeCheck,
  makeTextarea,
  makeCard,
  makeNote,
  makePickList,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { downloadText, buildExportFilename, buildAppFilenameLabel } from '../utils.js';

export function mountFieldLitePanel() {
  const panel = createLitePanel({
    id: 'kus-field-lite',
    title: 'フィールド追加',
    subtitle: 'フィールド定義 JSON を、反映先のプレビューへ追加・更新します。',
    accent: 'field',
    badges: [{ label: 'プレビューへ書き込み', tone: 'preview' }],
    hint: '反映先のプレビューだけを変更します。本番への公開は kintone の設定画面で行います。'
  });

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: 'アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID (任意)', value: DEFAULT_GUEST_ID, width: 'guest' });
  const tgtApp = makeInput({ placeholder: 'アプリID', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID (任意)', width: 'guest' });

  const cardApp = makeCard({ title: 'アプリ', number: 1 });
  cardApp.body.appendChild(makeRow([srcApp, srcGuest], { label: '反映元' }));
  cardApp.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '反映先' }));
  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      // 検索した接続先（通常スペースなら空）に合わせる。以前のゲストIDが残ると別の接続先へ書き込もうとするため。
      { label: '反映元', apply: (id, _name, guestId) => { srcApp.value = id; srcGuest.value = guestId || ''; resetPickList(); } },
      { label: '反映先', apply: (id, _name, guestId) => { tgtApp.value = id; tgtGuest.value = guestId || ''; } }
    ]
  }));
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- フィールド定義JSON ----
  const fieldJson = makeTextarea({ rows: 8, code: true, placeholder: 'フィールド定義 JSON（{ "properties": { ... } } 形式）' });

  const bLoadSrc = makeButton('反映元から読込', 'sub');
  const bLoadTgt = makeButton('反映先から読込', 'sub');
  const bValidate = makeButton('検証', 'sub');
  const bFormat = makeButton('整形', 'sub');
  const bImport = makeButton('ファイル読込', 'sub');
  const bExport = makeButton('保存', 'sub');
  const bClear = makeButton('クリア', 'ghost');
  bClear.addEventListener('click', () => {
    fieldJson.value = '';
    fieldJson.dispatchEvent(new Event('input', { bubbles: true }));
  });
  bFormat.addEventListener('click', () => {
    if (!fieldJson.value.trim()) {
      panel.setStatus('整形する JSON がありません', 'warn');
      return;
    }
    try {
      const parsed = JSON.parse(fieldJson.value || '{}');
      fieldJson.value = JSON.stringify(parsed, null, 2);
      fieldJson.dispatchEvent(new Event('input', { bubbles: true }));
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
      const parsed = JSON.parse(text);
      fieldJson.value = JSON.stringify(parsed, null, 2);
      fieldJson.dispatchEvent(new Event('input', { bubbles: true }));
      panel.setStatus(`「${file.name}」を読み込みました`, 'ok');
    }).catch((e: any) => {
      panel.setStatus(`JSON 読み込みエラー: ${e?.message || String(e)}`, 'err');
    }).finally(() => {
      fileInput.value = '';
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
    const appId = tgtApp.value.trim() || srcApp.value.trim();
    downloadText(buildExportFilename('フィールド定義', 'json', { appLabel: buildAppFilenameLabel(appId, '') }), text, 'application/json');
    panel.setStatus('フィールド JSON を保存しました', 'ok');
  });

  const cardJson = makeCard({ title: 'フィールド定義 JSON', number: 2 });
  cardJson.actions.style.flexWrap = 'wrap';
  cardJson.actions.appendChild(bLoadSrc);
  cardJson.actions.appendChild(bLoadTgt);
  cardJson.actions.appendChild(bValidate);
  cardJson.actions.appendChild(bFormat);
  cardJson.actions.appendChild(bImport);
  cardJson.actions.appendChild(bExport);
  cardJson.actions.appendChild(bClear);
  cardJson.body.appendChild(fileInput);
  cardJson.body.appendChild(fieldJson);
  panel.body.insertBefore(cardJson.card, panel.status);

  bLoadSrc.addEventListener('click', () => liteRun(panel, '反映元のフィールドを取得中…', async () => {
    const props = await runLoadFieldsStandalone(
      { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    fieldJson.value = JSON.stringify({ properties: props }, null, 2);
    fieldJson.dispatchEvent(new Event('input', { bubbles: true }));
  }, '反映元のフィールド定義を JSON に読み込みました'));

  bLoadTgt.addEventListener('click', () => liteRun(panel, '反映先のフィールドを取得中…', async () => {
    const props = await runLoadFieldsStandalone(
      { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: true },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    fieldJson.value = JSON.stringify({ properties: props }, null, 2);
    fieldJson.dispatchEvent(new Event('input', { bubbles: true }));
  }, '反映先のフィールド定義を JSON に読み込みました'));

  // ---- 反映元からフィールドを選んでマージ ----
  const pickDetails = makeCard({ title: '反映元からフィールドを選んでマージ' });
  const bLoadPickList = makeButton('反映元フィールド一覧を取得', 'sub');
  pickDetails.body.appendChild(makeRow(bLoadPickList));
  const bInsertPicked = makeButton('選択したフィールドを JSON に挿入（マージ）', 'primary');
  const bClosePick = makeButton('候補を閉じる', 'ghost');
  const pickList = makePickList({
    ariaLabel: 'マージする反映元フィールド',
    filterPlaceholder: 'コード・ラベル・タイプで絞り込み',
    emptyText: '反映元にフィールドがありません。',
    footer: (selected, total) => `${total}件中 ${selected}件を選択。挿入すると同じコードの既存定義は候補の内容で置き換えます。`
  });
  pickDetails.body.appendChild(pickList.element);
  const pickActions = makeRow([bInsertPicked, bClosePick]);
  pickActions.hidden = true;
  pickActions.style.marginTop = '8px';
  pickDetails.body.appendChild(pickActions);

  let pickedPropsCache: Record<string, any> = {};
  // 反映元を変えたあとに前の反映元の候補を挿入しないよう、候補は反映元の入力が変わったら閉じる
  function resetPickList() {
    pickedPropsCache = {};
    pickList.clear();
    pickActions.hidden = true;
  }
  srcApp.addEventListener('input', resetPickList);
  srcGuest.addEventListener('input', resetPickList);

  bLoadPickList.addEventListener('click', () => liteRun(panel, '反映元のフィールド一覧を取得中…', async () => {
    const props = await runLoadFieldsStandalone(
      { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: true },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    pickedPropsCache = props || {};
    const entries = Object.entries(pickedPropsCache) as Array<[string, any]>;
    entries.sort(([a], [b]) => a.localeCompare(b));
    pickList.setItems(entries.map(([code, def]) => ({
      value: code,
      label: `${code}${def?.label ? ` / ${def.label}` : ''}`,
      sub: String(def?.type || '')
    })));
    pickActions.hidden = false;
    panel.setStatus(`${entries.length}件のフィールド候補を表示中。絞り込んでチェックし、「挿入」で JSON にマージします`, entries.length ? 'ok' : 'warn');
  }));

  bClosePick.addEventListener('click', resetPickList);

  bInsertPicked.addEventListener('click', () => {
    const codes = pickList.selected();
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
    fieldJson.dispatchEvent(new Event('input', { bubbles: true }));
    panel.setStatus(`${added}件のフィールドを JSON にマージしました`, 'ok');
  });

  panel.body.insertBefore(pickDetails.card, panel.status);

  // ---- オプション ----
  const optCard = makeCard({ title: '反映オプション・参照先変換' });
  const lookupMap = makeTextarea({ rows: 2, code: true, placeholder: 'ルックアップ参照先のアプリID変換 JSON（任意）: {"旧":"新", ...}' });
  optCard.body.appendChild(makeRow(lookupMap, { label: 'ルックアップ', block: true }));
  const ow = makeCheck({ label: '既存フィールドを上書き更新', help: '反映先に同じフィールドコードがあれば、定義を更新します（オフの場合はスキップ）' });
  optCard.body.appendChild(makeRow(ow.label));
  optCard.body.appendChild(makeNote('反映前に、追加・更新・スキップの件数を最終確認します。取得後に反映先へ別の更新が入っていた場合（revision 競合）は上書きせず中止するので、読み込み直してから再実行してください。', 'help'));
  panel.body.insertBefore(optCard.card, panel.status);

  bValidate.addEventListener('click', () => {
    try {
      const props = parseFieldJsonInput(fieldJson.value);
      const lmap = parseLookupMapInput(lookupMap.value);
      const summary = summarizeFieldProps(props);
      const issues = collectFieldValidationIssues(props);
      const warnings = collectFieldApplyWarnings(props, {}, lmap);
      const lines = [
        `合計 ${summary.total}件（書込可 ${summary.writable} / システム ${summary.system}${summary.subtable ? ` / サブテーブル ${summary.subtable}` : ''}${summary.lookup ? ` / ルックアップ ${summary.lookup}` : ''}${summary.calc ? ` / 計算 ${summary.calc}` : ''}）`
      ];
      if (issues.length) {
        lines.push(`⚠ 構造上の問題 (${issues.length}件):`, ...issues.map((i) => `  - ${i}`));
      }
      if (warnings.length) {
        lines.push(`確認事項 (${warnings.length}件):`, ...warnings.map((w) => `  - ${w}`));
      }
      panel.setResult(lines.join('\n'));
      panel.setStatus(
        issues.length
          ? `検証完了: ${issues.length}件の問題を検出しました（下のログを確認）`
          : `検証OK: 合計 ${summary.total}件 / 書込可 ${summary.writable}件${warnings.length ? `（確認事項 ${warnings.length}件）` : ''}`,
        issues.length ? 'warn' : 'ok'
      );
    } catch (e: any) {
      panel.setStatus(e?.message || String(e), 'err');
    }
  });

  const bApply = makeButton('反映先プレビューへ反映', 'run', { icon: '⤴' });
  panel.body.insertBefore(bApply, panel.status);

  bApply.addEventListener('click', () => liteRun(panel, '反映先プレビューへ反映中…', async () => {
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
    // 完了・キャンセル・対象なしのメッセージは処理側が出すので、ここでは上書きしない
    panel.setResult(logs.join('\n'));
  }));

  // ---- バルクリネーム ----
  const renameDetails = makeCard({ title: 'プレフィックス一括リネーム（反映先プレビュー）' });
  const renamePrefix = makeInput({ placeholder: '例: dev_', width: 'medium' });
  const removeMode = makeCheck({ label: '付与ではなく除去する' });
  const renameModeSelect = makeSelect(
    [
      ['put-rename', 'コード変更用（既存フィールドのコードを変更）'],
      ['new-keys', '新規追加用（別コードのフィールドとして追加）']
    ],
    'put-rename'
  );
  renameModeSelect.setAttribute('aria-label', 'リネーム出力形式');
  const bRename = makeButton('リネーム結果を JSON にセット', 'sub');
  renameDetails.body.appendChild(makeRow(renamePrefix, { label: '文字列' }));
  renameDetails.body.appendChild(makeRow(removeMode.label));
  renameDetails.body.appendChild(makeRow(renameModeSelect, { label: '出力形式' }));
  renameDetails.body.appendChild(makeRow(bRename));
  const renameNote = makeNote('反映先のフィールドコードを書き換えた JSON を、「フィールド定義 JSON」の入力欄にセットします（反映は別途実行します）。既存フィールドのコードを変えるには「コード変更用」を選びます（「既存フィールドを上書き更新」は自動でオンになります）。', 'help');
  renameDetails.body.appendChild(renameNote);
  panel.body.insertBefore(renameDetails.card, panel.status);

  bRename.addEventListener('click', () => liteRun(panel, 'リネーム生成中…', async () => {
    const renameMode = (renameModeSelect.value as BulkRenameMode) || 'put-rename';
    const out = await runBulkRenameFieldStandalone(
      {
        targetAppId: tgtApp.value.trim(),
        targetGuestId: tgtGuest.value.trim(),
        prefix: renamePrefix.value,
        removeMode: removeMode.checkbox.checked,
        renameMode
      },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    if (!out) return;
    if (renameMode === 'put-rename') {
      ow.checkbox.checked = true;
    }
    fieldJson.value = JSON.stringify({ properties: out.properties }, null, 2);
    fieldJson.dispatchEvent(new Event('input', { bubbles: true }));
    const list = out.renamePairs.slice(0, 50).map((p) => `${p.from}  →  ${p.to}`).join('\n');
    panel.setResult(list + (out.renamePairs.length > 50 ? `\n... 他 ${out.renamePairs.length - 50} 件` : ''));
  }, 'リネーム結果を JSON にセットしました。コードを変更するには「既存フィールドを上書き更新」をオンにして「反映先プレビューへ反映」を実行してください'));

  srcApp.setAttribute('aria-label', '反映元アプリID'); srcGuest.setAttribute('aria-label', '反映元ゲストスペースID');
  tgtApp.setAttribute('aria-label', '反映先アプリID'); tgtGuest.setAttribute('aria-label', '反映先ゲストスペースID');
  fieldJson.setAttribute('aria-label', '反映するフィールド定義JSON');
  lookupMap.setAttribute('aria-label', '参照アプリID変換JSON');
  cardJson.body.appendChild(foldWorkflowSection('JSONファイル・整形・クリア', bImport, bExport, bFormat, bClear));
  const fieldProblem = () => {
    const problem = findFieldApplyProblem({ targetAppId: tgtApp.value, targetGuestId: tgtGuest.value, fieldJson: fieldJson.value, lookupMapJson: lookupMap.value });
    if (problem) return problem;
    const sApp = srcApp.value.trim();
    const sGuest = srcGuest.value.trim();
    if (sApp && !/^\d+$/.test(sApp)) return '反映元アプリIDは数値で入力してください。';
    if (sGuest && !/^\d+$/.test(sGuest)) return '反映元ゲストスペースIDは数値で入力してください。';
    return '';
  };
  const fieldSummary = (): Array<[string, string]> => {
    let codes: string[] = [];
    let detailLabel = '';
    let checkNotes: string[] = [];
    try {
      const props = parseFieldJsonInput(fieldJson.value);
      codes = Object.keys(props);
      const sum = summarizeFieldProps(props);
      const parts = [`書込可 ${sum.writable}`, `システム ${sum.system}`];
      if (sum.subtable) parts.push(`サブテーブル ${sum.subtable}`);
      if (sum.lookup) parts.push(`ルックアップ ${sum.lookup}`);
      if (sum.calc) parts.push(`計算 ${sum.calc}`);
      detailLabel = `（${parts.join(' / ')}）`;
      const lmap = parseLookupMapInput(lookupMap.value);
      const issues = collectFieldValidationIssues(props);
      const warnings = collectFieldApplyWarnings(props, {}, lmap);
      checkNotes = [...issues, ...warnings];
    } catch {
      try {
        const data = JSON.parse(fieldJson.value);
        codes = Object.keys(data.properties || data);
      } catch { /* 入力中 */ }
    }
    const rows: Array<[string, string]> = [
      ['反映先', connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim(), 'プレビュー')],
      ['フィールド', `${codes.length} 件${detailLabel} · ${codes.join('、')}`],
      ['既存フィールド', ow.checkbox.checked ? '上書き更新する' : '既存フィールドはスキップ'],
      ['参照先変換', lookupMap.value.trim() || 'なし']
    ];
    if (checkNotes.length) {
      rows.push(['事前検証', checkNotes.join('\n')]);
    }
    rows.push(['本番公開', 'しません（公開は kintone の設定画面で行います）']);
    return rows;
  };
  installLiteWorkflow(panel, {
    setup: [cardApp.card, cardJson.card],
    advanced: [pickDetails.card, optCard.card, renameDetails.card],
    advancedCopy: 'フィールドのマージ、上書き更新・参照先変換、一括リネームを使うときはこちら。',
    actions: [{ id: 'apply', label: '反映先プレビューへ反映', description: '反映先プレビューへフィールドを追加・更新します（実行前に件数を最終確認します）。', button: bApply, writes: true, validate: fieldProblem, summary: fieldSummary }]
  });

}
