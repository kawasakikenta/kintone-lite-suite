'use strict';

import { installLiteWorkflow, connectionSummary, summarizeList, validateJsonObject } from './liteWorkflow.js';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import { kusConfirm } from '../utils.js';
import {
  buildJsConfigApplyPlan,
  jsConfigMultiTargetProblem,
  runApplyJsConfigMultiStandalone,
  runApplyJsConfigStandalone,
  runExportJsConfigStandalone,
  runFetchJsConfigStandalone,
  runBatchJsConfigDownloadStandalone
} from '../tabs/jsconfig-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeTextarea,
  makeCard,
  makeAppTable,
  makeDetails,
  makeNote,
  liteRun
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';

export function mountJsconfigLitePanel() {
  const panel = createLitePanel({
    id: 'kus-jsconfig-lite',
    title: 'JS / CSS 設定',
    subtitle: 'アプリの JS / CSS 設定を取得し、JSON として編集・保存して、反映先のプレビューへ反映します。',
    accent: 'jsconfig',
    badges: [{ label: 'プレビューへ書き込み', tone: 'preview' }],
    hint: '反映先のプレビューだけを変更します。本番への公開は kintone の設定画面で行います。'
  });

  // 取得
  const cardFetch = makeCard({ title: '取得', number: 1 });
  const srcApp = makeInput({ placeholder: '取得元アプリID', value: DEFAULT_APP_ID || '', width: 'id' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', value: DEFAULT_GUEST_ID, width: 'guest' });
  const srcPrev = makeCheck({ label: 'プレビュー環境から取得' });
  cardFetch.body.appendChild(makeRow([srcApp, srcGuest, srcPrev.label], { label: '取得元' }));
  const fetchAppSearch = createAppSearchControl(panel, {
    guestEl: srcGuest,
    targets: [
      { label: '取得元', apply: (id, _name, guestId) => { srcApp.value = id; if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId; } }
    ]
  });
  cardFetch.body.appendChild(fetchAppSearch);
  const fetchBtn = makeButton('JS/CSS を取得', 'primary', { icon: '⤓' });
  cardFetch.body.appendChild(makeRow(fetchBtn));
  panel.body.insertBefore(cardFetch.card, panel.status);

  // 編集
  const cardJson = makeCard({ title: 'カスタマイズ JSON', number: 2 });
  const jsonTa = makeTextarea({ rows: 9, code: true, placeholder: '取得結果の JSON（手入力も可）' });
  cardJson.body.appendChild(jsonTa);
  const exportBtn = makeButton('JSON ファイル保存', 'sub');
  const formatBtn = makeButton('整形', 'sub');
  const loadFileBtn = makeButton('ファイル読込', 'sub');
  const loadTargetBtn = makeButton('反映先から読込', 'sub');
  const clearBtn = makeButton('クリア', 'sub');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  cardJson.body.appendChild(fileInput);

  formatBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonTa.value);
      jsonTa.value = JSON.stringify(parsed, null, 2);
      panel.setStatus('JSON を整形しました', 'ok');
    } catch (e: any) {
      panel.setStatus('JSON が壊れています: ' + e.message, 'err');
    }
  });
  loadFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      jsonTa.value = JSON.stringify(parsed, null, 2);
      // ファイルの内容は取得結果ではないので、取得元・取得時 revision の情報は外す
      jsonOrigin = null;
      loadedText = '';
      panel.setStatus(`JSON を読み込みました: ${file.name}`, 'ok');
    } catch (e: any) {
      panel.setStatus('JSON ファイルの読込に失敗しました: ' + (e?.message || String(e)), 'err');
    }
  });
  clearBtn.addEventListener('click', () => {
    jsonTa.value = '';
    jsonOrigin = null;
    loadedText = '';
    panel.setStatus('JSON をクリアしました', 'info');
  });
  // 読込・整形・クリアは折りたたみにまとめる。JSON保存は操作の選択肢（exportBtn は実行用に使う）。
  const jsonTools = makeDetails('JSONの読込・整形・保存');
  jsonTools.body.appendChild(makeRow([loadFileBtn, loadTargetBtn, formatBtn, clearBtn]));
  cardJson.body.appendChild(jsonTools.details);
  panel.body.insertBefore(cardJson.card, panel.status);

  // プレビュー（取得済みファイルの一覧）
  const cardPreview = makeCard({ title: '取得結果プレビュー', soft: true });
  const previewBox = document.createElement('div');
  previewBox.className = 'kus-lp__panel-html kus-lp__panel-html--empty';
  cardPreview.body.appendChild(previewBox);
  panel.body.insertBefore(cardPreview.card, panel.status);

  // 反映
  const cardApply = makeCard({ title: '反映先プレビューへ反映', number: 3 });
  const tgtApp = makeInput({ placeholder: '反映先アプリID', width: 'id' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', width: 'guest' });
  cardApply.body.appendChild(makeRow([tgtApp, tgtGuest], { label: '反映先' }));
  cardApply.body.appendChild(createAppSearchControl(panel, {
    guestEl: tgtGuest,
    targets: [
      { label: '反映先', apply: (id, _name, guestId) => { tgtApp.value = id; if (guestId && !tgtGuest.value.trim()) tgtGuest.value = guestId; } }
    ]
  }));
  cardApply.body.appendChild(makeNote('反映先の JS / CSS 一覧は、JSON の内容にすべて置き換わります。JSON に適用範囲（scope: ALL / ADMIN / NONE）が含まれていれば、適用範囲も更新します。', 'help'));
  cardApply.body.appendChild(makeNote('FILE タイプは、別アプリから取得した fileKey をそのまま使うと kintone に拒否されます。反映先で有効なアップロード済みの fileKey に差し替えてください。', 'help'));
  cardApply.body.appendChild(makeNote('反映前に件数を最終確認します。取得後に反映先へ別の更新が入っていた場合（revision 競合）は、上書きせず中止します。', 'help'));
  const applyBtn = makeButton('反映先プレビューへ反映', 'run', { icon: '⤴' });
  cardApply.body.appendChild(applyBtn);
  panel.body.insertBefore(cardApply.card, panel.status);

  // まとめて反映（複数の反映先 / 環境内の全アプリ）
  const cardMulti = makeCard({ title: '複数の反映先プレビューへ反映', number: 3 });
  const multiTable = makeAppTable({ minRows: 1 });
  const multiTargetName = 'まとめて反映先';
  cardMulti.body.appendChild(createAppSearchControl(panel, {
    targets: [{
      label: multiTargetName,
      apply: (id, name, guestId) => {
        const result = multiTable.putApp(id, guestId, { appName: name });
        return { message: `アプリ #${id}${name ? ` (${name})` : ''} を「${multiTargetName}」に${result.action === 'existing' ? '設定済みです（追加していません）' : '追加しました'}` };
      },
      applyAll: (apps, guestId) => {
        const result = multiTable.putApps(apps.map((app) => ({ appId: app.appId, guestId, appName: app.appName })));
        const set = result.added + result.filled;
        return {
          message: `候補 ${apps.length} 件のうち ${set} 件を「${multiTargetName}」に追加しました${result.existing ? `（設定済み ${result.existing} 件は追加していません）` : ''}。反映前に対象を最終確認します。`,
          tone: 'ok',
          pickedLabel: `${apps.length} 件を追加済み`
        };
      },
      applyAllLabel: (count) => `候補 ${count} 件をすべて${multiTargetName}に追加`
    }]
  }));
  cardMulti.body.appendChild(multiTable.element);
  const multiClearBtn = makeButton('反映先をすべてクリア', 'sub');
  multiClearBtn.addEventListener('click', () => { multiTable.clear(); panel.setStatus('まとめて反映先の一覧をクリアしました', 'info'); });
  cardMulti.body.appendChild(makeRow(multiClearBtn));
  cardMulti.body.appendChild(makeNote('各反映先の JS / CSS 一覧は、JSON の内容にすべて置き換わります。1件ずつ順に反映し、失敗や競合があっても残りを続けて、最後に反映先ごとの結果を示します。', 'help'));
  cardMulti.body.appendChild(makeNote('FILE タイプ（アップロード済みファイル）を含む JSON は、別のアプリでは使えない fileKey を持つため、複数の反映先へはまとめて反映できません。URL タイプだけの JSON にするか、ファイルは「プレビュー反映」の別アプリの JS/CSS 転送を使ってください。', 'help'));
  cardMulti.body.appendChild(makeNote('反映前に、各反映先の現在の設定を確認して件数を最終確認します。確認後に反映先へ別の更新が入っていた場合（revision 競合）は、その反映先だけ上書きせず競合として報告します。', 'help'));
  const applyMultiBtn = makeButton('複数の反映先プレビューへ反映', 'run', { icon: '⤴' });
  cardMulti.body.appendChild(applyMultiBtn);
  panel.body.insertBefore(cardMulti.card, panel.status);

  // JSON の出所。取得元の入力欄は後から変えられるため、取得時点の対象を保持して保存名・反映確認に使う。
  let loadedText = '';
  let fetchedRevision = '';
  let jsonOrigin: { appId: string; guestId: string; preview: boolean; revision: string; text: string } | null = null;
  const jsonEdited = () => {
    try { return JSON.stringify(JSON.parse(jsonTa.value)) !== JSON.stringify(JSON.parse(loadedText)); } catch { return jsonTa.value !== loadedText; }
  };
  const originSummary = (): string => !jsonOrigin
    ? '取得結果ではありません（手入力・貼り付け）'
    : jsonOrigin.text + (jsonEdited() ? '（取得後に編集あり）' : '');
  const uiApi = {
    setJson: (t: string) => { jsonTa.value = t; loadedText = t; },
    setRevision: (r: string) => { fetchedRevision = r; },
    setCustomizeHtml: (h: string) => {
      previewBox.innerHTML = h;
      if (h && !h.includes('データがありません')) previewBox.classList.remove('kus-lp__panel-html--empty');
      else previewBox.classList.add('kus-lp__panel-html--empty');
    }
  };

  fetchBtn.addEventListener('click', () => {
    // 取得 JSON は「JSON 保存」「反映」の画面にあり、取得画面からは見えない。編集中の内容を黙って上書きしない。
    if (jsonTa.value.trim() && jsonEdited() && !kusConfirm('カスタマイズ JSON に取得結果以外の内容（手入力・編集）があります。取得結果で上書きしますか？')) {
      panel.setStatus('取得をキャンセルしました（JSON は変更していません）', 'warn');
      return;
    }
    const origin = { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked, revision: '', text: connectionSummary(srcApp.value.trim(), srcGuest.value.trim(), srcPrev.checkbox.checked ? 'プレビュー' : '本番') };
    fetchedRevision = '';
    return liteRun(panel, 'JS/CSS設定を取得中…', async () => {
      await runFetchJsConfigStandalone(
        { sourceAppId: srcApp.value.trim(), sourceGuestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked },
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
        uiApi
      );
      jsonOrigin = { ...origin, revision: fetchedRevision };
    });
  });

  loadTargetBtn.addEventListener('click', () => {
    if (jsonTa.value.trim() && jsonEdited() && !kusConfirm('カスタマイズ JSON に取得結果以外の内容（手入力・編集）があります。反映先の設定で上書きしますか？')) {
      panel.setStatus('読込をキャンセルしました（JSON は変更していません）', 'warn');
      return;
    }
    const appId = tgtApp.value.trim();
    const guestId = tgtGuest.value.trim();
    const origin = { appId, guestId, preview: true, revision: '', text: connectionSummary(appId, guestId, 'プレビュー') };
    fetchedRevision = '';
    return liteRun(panel, '反映先のJS/CSS設定を取得中…', async () => {
      if (!appId) throw new Error('反映先アプリIDを入力してください');
      await runFetchJsConfigStandalone(
        { sourceAppId: appId, sourceGuestId: guestId, preview: true },
        (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
        uiApi
      );
      // 反映先のプレビューから読み込んだ JSON なので、取得時の revision が競合検出の基準になる
      jsonOrigin = { ...origin, revision: fetchedRevision };
    });
  });

  exportBtn.addEventListener('click', () => liteRun(panel, 'JSON 保存中…', async () => {
    runExportJsConfigStandalone(jsonTa.value, jsonOrigin?.appId || '', (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'));
  }));

  // 反映先のプレビューから取得した JSON なら、取得時の revision を競合検出の基準にする。
  const baseRevision = (): string =>
    jsonOrigin && jsonOrigin.preview && jsonOrigin.revision && jsonOrigin.appId === tgtApp.value.trim() && jsonOrigin.guestId === tgtGuest.value.trim() ? jsonOrigin.revision : '';

  applyBtn.addEventListener('click', () => liteRun(panel, '反映先のプレビューへ反映中…', async () => {
    const base = baseRevision();
    const applied = await runApplyJsConfigStandalone(
      { targetAppId: tgtApp.value.trim(), targetGuestId: tgtGuest.value.trim(), jsonText: jsonTa.value, deployAfter: false, baseRevision: base },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
      (html: string) => { panel.setResultHtml(html); }
    );
    // 反映成功で反映先の revision が進むため、続けて反映しても自分の更新を競合と誤検出しない。
    if (base && jsonOrigin && applied) jsonOrigin = { ...jsonOrigin, revision: applied.revision };
  }));

  applyMultiBtn.addEventListener('click', () => liteRun(panel, '複数の反映先のプレビューへ反映中…', async () => {
    const res = await runApplyJsConfigMultiStandalone(
      { targets: multiTable.getApps(), jsonText: jsonTa.value },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy'),
      (html: string) => { panel.setResultHtml(html); }
    );
    // 最終確認で見送った場合は、処理側がキャンセルを伝えている。それ以外は件数つきの結果を、部分成功なら警告色で示す。
    if (!res.declined) panel.setStatus(res.headline, res.tone);
  }));

  // 全アプリ JS/CSS ファイル 一括ダウンロード
  const batchDetails = makeCard({ title: '全アプリの JS/CSS ファイルを一括ダウンロード' });
  batchDetails.body.appendChild(makeNote('アクセスできるアプリを順に調べ、アップロード済み（FILE タイプ）の JS / CSS ファイルを1つの ZIP にまとめます。URL で指定した JS / CSS はファイルがないため含まれません。', 'help'));
  const batchGuest = makeInput({ placeholder: 'ゲストID（任意 / 未指定で全体）', width: 'wide' });
  batchDetails.body.appendChild(makeRow(batchGuest, { label: 'ゲストスペース' }));
  const batchBtn = makeButton('JS/CSS を ZIP で一括取得', 'primary', { icon: '↓' });
  batchBtn.style.width = '100%';
  batchDetails.body.appendChild(batchBtn);
  panel.body.insertBefore(batchDetails.card, panel.status);

  batchBtn.addEventListener('click', () => liteRun(panel, '全アプリの JS/CSS をスキャン中…', async () => {
    const res = await runBatchJsConfigDownloadStandalone(
      { guestId: batchGuest.value.trim() },
      // 中止の報告（「中止しました…」）は失敗ではないので警告色にする
      (m: string, e?: boolean) => panel.setStatus(m, /^中止しました/.test(m) ? 'warn' : e ? 'err' : 'busy')
    );
    const notExecuted = res.notExecuted || [];
    const lines = [
      `走査アプリ数: ${res.apps}件 / 取得ファイル数: ${res.files}件 / 取得失敗: ${res.failed}件${notExecuted.length ? ` / 未実行（中止）: ${notExecuted.length}件` : ''}`,
      ...res.failedApps.map((a) => `[アプリ取得失敗] App #${a.appId} (${a.name || '-'}): ${a.reason}`),
      ...res.failedFiles.map((f) => `[ファイル取得失敗] App #${f.appId} / ${f.fileName}: ${f.reason}`),
      ...notExecuted.map((a) => `[未実行（中止）] App #${a.appId} (${a.name || '-'})`)
    ];
    panel.setResult(lines.join('\n'));
  }));

  srcApp.setAttribute('aria-label', '取得元アプリID'); srcGuest.setAttribute('aria-label', '取得元ゲストスペースID');
  tgtApp.setAttribute('aria-label', '反映先アプリID'); tgtGuest.setAttribute('aria-label', '反映先ゲストスペースID');
  jsonTa.setAttribute('aria-label', 'カスタマイズJSON');
  batchGuest.setAttribute('aria-label', '一括取得のゲストスペースID');
  const selectMode = (mode: string) => {
    cardFetch.card.hidden = mode === 'batch' || mode === 'apply' || mode === 'apply-multi';
    cardJson.card.hidden = mode === 'batch';
    cardApply.card.hidden = mode !== 'apply';
    cardMulti.card.hidden = mode !== 'apply-multi';
    batchDetails.card.hidden = mode !== 'batch';
  };
  const idProblem = (who: string, app: string, guest: string): string => {
    if (!app) return who + 'アプリIDを指定してください。';
    if (!/^\d+$/.test(app)) return who + 'アプリIDは半角数字で指定してください。';
    return guest && !/^\d+$/.test(guest) ? who + 'ゲストスペースIDは半角数字で指定してください。' : '';
  };
  // 反映できない JSON（配列でない一覧・全項目が不正）は確認画面へ進む前に止める。
  const applyProblem = (): string => {
    const problem = validateJsonObject(jsonTa.value);
    if (problem) return problem;
    try { buildJsConfigApplyPlan(JSON.parse(jsonTa.value)); return ''; } catch (e: any) { return e.message; }
  };
  // まとめて反映: 入力行の不備（アプリIDなしでゲストIDだけ、数字以外）→ JSON → FILE タイプの有無の順に止める。
  const multiProblem = (): string => {
    const rows = multiTable.getAllRows();
    for (const [index, row] of rows.entries()) {
      if (!row.appId && row.guestId) return `反映先の${index + 1}行目: アプリIDを指定してください（ゲストスペースIDだけ入力されています）。`;
    }
    const targets = multiTable.getApps();
    if (!targets.length) return 'まとめて反映する反映先を1件以上指定してください。';
    for (const row of targets) {
      const problem = idProblem('反映先', row.appId, row.guestId);
      if (problem) return `アプリID ${row.appId || '未入力'}: ${problem}`;
    }
    const problem = applyProblem();
    if (problem) return problem;
    try { return jsConfigMultiTargetProblem(buildJsConfigApplyPlan(JSON.parse(jsonTa.value))); } catch (e: any) { return e.message; }
  };
  const jsonSummary = (forApply = false): Array<[string, string]> => {
    let data: any = {};
    try { data = JSON.parse(jsonTa.value) || {}; } catch { /* 入力中 */ }
    let plan: ReturnType<typeof buildJsConfigApplyPlan> | null = null;
    if (forApply) { try { plan = buildJsConfigApplyPlan(data); } catch { /* validate が止める */ } }
    // 反映では実際に送る件数（type/url/fileKey 不足の項目を除く）と、有効な適用範囲だけを示す。
    const rows: Array<[string, string]> = plan
      ? [['PC用', 'JS ' + plan.counts.desktopJs + ' / CSS ' + plan.counts.desktopCss], ['モバイル用', 'JS ' + plan.counts.mobileJs + ' / CSS ' + plan.counts.mobileCss], ['適用範囲', plan.scope || '指定なし（反映先の現状維持）']]
      : [['PC用', 'JS ' + (data.desktop?.js?.length || 0) + ' / CSS ' + (data.desktop?.css?.length || 0)], ['モバイル用', 'JS ' + (data.mobile?.js?.length || 0) + ' / CSS ' + (data.mobile?.css?.length || 0)], ['適用範囲', data.scope || '指定なし']];
    if (plan?.dropped) rows.push(['反映しない項目', plan.dropped + '件（種別・URL・fileKey のいずれかが不足）']);
    if (plan) {
      const c = plan.counts;
      if (c.desktopJs + c.desktopCss + c.mobileJs + c.mobileCss === 0) {
        rows.push(['⚠ 注意', '有効なJS/CSSが0件のため、反映先のJS/CSSは0件に初期化されます']);
      }
    }
    return [['JSONの取得元', originSummary()], ...rows];
  };
  installLiteWorkflow(panel, {
    setup: [cardFetch.card, cardJson.card, cardApply.card, cardMulti.card, batchDetails.card], primaryActions: 4, results: [cardPreview.card], resultActions: ['fetch'],
    beforeRun: actionId => { if (actionId === 'fetch') { previewBox.replaceChildren(); previewBox.classList.add('kus-lp__panel-html--empty'); } },
    actions: [
      {
        id: 'fetch',
        label: 'JS/CSS設定を取得',
        description: '取得元アプリの JS / CSS 設定を読み取り、ファイル一覧と JSON を表示します。',
        button: fetchBtn,
        validate: () => idProblem('取得元', srcApp.value.trim(), srcGuest.value.trim()),
        summary: () => [['取得元', connectionSummary(srcApp.value.trim(), srcGuest.value.trim(), srcPrev.checkbox.checked ? 'プレビュー' : '本番')]],
        onSelect: () => selectMode('fetch')
      },
      {
        id: 'save',
        label: 'カスタマイズJSONを保存',
        description: 'カスタマイズ JSON を .json ファイルとして保存します。',
        button: exportBtn,
        validate: () => validateJsonObject(jsonTa.value),
        summary: jsonSummary,
        onSelect: () => selectMode('save')
      },
      {
        id: 'apply',
        label: '反映先プレビューへ反映',
        description: '反映先プレビューの JS / CSS 一覧を、JSON の内容にすべて置き換えます。',
        button: applyBtn,
        writes: true,
        validate: () => idProblem('反映先', tgtApp.value.trim(), tgtGuest.value.trim()) || applyProblem(),
        summary: () => [
          ['反映先', connectionSummary(tgtApp.value.trim(), tgtGuest.value.trim(), 'プレビュー')],
          ...jsonSummary(true),
          ['競合検出', baseRevision() ? '反映先が取得後（revision ' + baseRevision() + '）に更新されていれば、上書きせず中止します。' : '反映直前の状態を基準にします（この JSON は反映先のプレビューから取得したものではないため、取得後の更新は検出できません）。'],
          ['反映方法', 'JS / CSS 一覧をすべて置き換えます。FILE タイプは、反映先で有効な fileKey（アップロード済みファイルの識別子）が必要です。']
        ],
        onSelect: () => selectMode('apply')
      },
      {
        id: 'apply-multi',
        label: '複数の反映先プレビューへ反映',
        description: '同じ JSON の内容で、複数の反映先プレビューの JS / CSS 一覧をすべて置き換えます（環境内の全アプリも選べます）。',
        button: applyMultiBtn,
        writes: true,
        validate: multiProblem,
        summary: () => {
          const targets = multiTable.getApps();
          return [
            ['反映先', `${targets.length}件のプレビュー\n` + summarizeList(targets.map((t) => '・' + connectionSummary(t.appId, t.guestId, 'プレビュー') + (t.appName ? ` ${t.appName}` : '')))],
            ...jsonSummary(true),
            ['競合検出', '反映の直前に各反映先の現在の設定（revision）を確認し、その revision を付けて反映します。確認後に別の更新が入った反映先は、上書きせず「競合」として報告し、残りは続けます。この JSON を取得した後の更新は検出できません。'],
            ['反映方法', 'JS / CSS 一覧をすべて置き換えます。1件ずつ順に反映し、失敗しても残りを続けます。「中止」を押すと、残りは「未実行（中止）」になります。FILE タイプを含む JSON は反映できません。']
          ];
        },
        onSelect: () => selectMode('apply-multi')
      },
      {
        id: 'batch',
        label: '全アプリのJS/CSSをZIP保存',
        description: '対象範囲のアプリの JS / CSS ファイル（FILE タイプ）を、ZIP にまとめて保存します。',
        button: batchBtn,
        validate: () => {
          const guest = batchGuest.value.trim();
          return guest && !/^\d+$/.test(guest) ? 'ゲストスペースIDは半角数字で指定してください。' : '';
        },
        summary: () => [['対象範囲', batchGuest.value.trim() ? 'ゲストスペース ' + batchGuest.value.trim() : 'アクセス可能な全アプリ'], ['対象ファイル', 'FILE形式のJS/CSS。URL形式は含みません。']],
        onSelect: () => selectMode('batch')
      }
    ]
  });

}
