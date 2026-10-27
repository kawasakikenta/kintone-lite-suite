'use strict';

import { DEFAULT_APP_ID, DEFAULT_GUEST_ID } from '../constants.js';
import { buildRecordQualityTab } from './record-quality-ui.js';
import { createAppSearchControl } from './appSearchControl.js';
import { connectionSummary, installLiteWorkflow } from './liteWorkflow.js';
import { createLitePanel, makeButton, makeCard, makeInput, makeNote, makeRow, makeSelect, liteRun } from './litePanelTheme.js';
import { parseRecordAppIds, runLoadViewsStandalone } from '../tabs/record-standalone.js';
import type { RecordViewChoice } from '../tabs/record-metadata.js';

/** Read-only, focused entry point for the data-quality checks in Record Manager. */
export function mountRecordQualityLitePanel() {
  const panel = createLitePanel({
    id: 'kus-record-quality-lite',
    title: 'データ品質チェック',
    subtitle: 'レコードの重複と未入力を、選んだ項目の組み合わせで検査します。',
    accent: 'record',
    badges: [{ label: '読み取り専用', tone: 'read' }],
    hint: 'kintone のレコードは書き換えません。検査結果は画面で確認でき、CSVでも保存できます。',
    wide: true
  });

  const appId = makeInput({
    placeholder: 'アプリID（カンマ区切りで複数指定）',
    value: DEFAULT_APP_ID || '',
    width: 'wide',
    ariaLabel: '対象アプリID'
  });
  const guestId = makeInput({ placeholder: 'ゲストID（任意）', value: DEFAULT_GUEST_ID, width: 'guest', ariaLabel: 'ゲストスペースID' });
  let connectionVersion = 0;
  const resetMetadata: Array<() => void> = [];
  for (const input of [appId, guestId]) {
    for (const event of ['input', 'change']) {
      input.addEventListener(event, () => {
        connectionVersion++;
        resetMetadata.forEach(reset => reset());
      });
    }
  }
  function notifyInput(input: HTMLInputElement) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const target = makeCard({ title: '対象アプリ', number: 1 });
  target.body.appendChild(makeRow([appId, guestId], { label: '対象アプリ' }));
  target.body.appendChild(makeNote('複数アプリはカンマ・改行・空白で区切ります。検査するフィールドは、先頭の対象アプリから読み込みます。', 'help'));
  target.body.appendChild(createAppSearchControl(panel, {
    guestEl: guestId,
    targets: [{ label: '対象アプリ', apply: (id, _name, guest) => {
      appId.value = id;
      if (guest && !guestId.value.trim()) guestId.value = guest;
      notifyInput(appId);
    } }]
  }));

  const viewSelect = makeSelect([['', '一覧を選択（任意）']]);
  viewSelect.setAttribute('aria-label', '取得した一覧');
  const loadViewsBtn = makeButton('一覧読込', 'sub');
  target.body.appendChild(makeRow([loadViewsBtn, viewSelect], { label: '一覧から条件' }));
  const viewNote = makeNote('先頭の対象アプリの一覧を読み込むと、「▼ 一覧から」で絞り込みと並び順をクエリに反映できます。');
  target.body.appendChild(viewNote);
  let loadedViews: RecordViewChoice[] = [];
  resetMetadata.push(() => {
    loadedViews = [];
    viewSelect.replaceChildren(new Option('一覧を選択（任意）', ''));
    viewNote.textContent = '対象アプリが変わりました。「一覧読込」で再取得してください。';
  });
  viewSelect.addEventListener('change', () => {
    const view = loadedViews.find(item => item.id === viewSelect.value);
    const scopeNote = view?.type === 'CALENDAR' ? '（カレンダーの表示月による絞り込みは含みません）'
      : view?.type === 'CUSTOM' ? '（カスタマイズ画面の独自処理は含みません）' : '';
    viewNote.textContent = view ? `${view.name} / 条件: ${view.filter || '全件'} / 並び順: ${view.sort || 'レコードID順'}${scopeNote}` : '適用する一覧を選んでください。';
  });
  loadViewsBtn.addEventListener('click', () => liteRun(panel, '一覧情報を取得中…', async () => {
    const version = connectionVersion;
    const [firstAppId] = parseRecordAppIds(appId.value);
    loadedViews = [];
    viewSelect.replaceChildren(new Option('一覧を選択（任意）', ''));
    const views = await runLoadViewsStandalone(
      { appId: firstAppId, guestId: guestId.value.trim() },
      (m: string, e?: boolean) => panel.setStatus(m, e ? 'err' : 'busy')
    );
    if (version !== connectionVersion) { panel.setStatus('対象アプリが変わりました。一覧を再取得してください。', 'warn'); return; }
    loadedViews = views;
    for (const v of views) {
      const opt = document.createElement('option');
      opt.value = v.id;
      const typeLabel = { LIST: '表', CALENDAR: 'カレンダー', CUSTOM: 'カスタマイズ' }[v.type] || v.type;
      opt.textContent = `${v.name}（${typeLabel}）`;
      viewSelect.appendChild(opt);
    }
    viewNote.textContent = `App ${firstAppId} から ${views.length}件を取得しました。選択した一覧の絞り込み・並び順をクエリに反映できます。`;
    panel.setStatus(viewNote.textContent, views.length ? 'ok' : 'warn');
  }));

  function applyViewQuery(targetInput: HTMLInputElement) {
    const view = loadedViews.find(item => item.id === viewSelect.value);
    if (!view) { panel.setStatus('対象アプリで一覧を読み込み、適用する一覧を選んでください。', 'warn'); return; }
    targetInput.value = view.query;
    notifyInput(targetInput);
    panel.setStatus(`「${view.name}」をクエリに反映しました: ${view.query || '全件'}`, 'ok');
  }

  panel.body.insertBefore(target.card, panel.status);

  const conditions = makeCard({ title: '検査条件', number: 2 });
  panel.body.insertBefore(conditions.card, panel.status);
  // 空白・大小文字の扱いは「詳細設定…」のポップアップへ（既定は区別する）
  const compareOptions = makeCard({ title: '比較の扱い', soft: true });
  const resultHost = document.createElement('section');
  resultHost.setAttribute('aria-label', '検査結果');
  panel.body.insertBefore(resultHost, panel.status);

  const qualityAction = buildRecordQualityTab(conditions.body, {
    panel,
    tgtApp: appId,
    tgtGuest: guestId,
    resetMetadata,
    requiredApps: () => {
      try {
        return parseRecordAppIds(appId.value).length ? '' : '対象アプリIDを入力してください。';
      } catch (error: any) {
        return error?.message || String(error);
      }
    },
    targetSummary: () => ['対象アプリ', connectionSummary(appId.value.trim(), guestId.value.trim())],
    applyViewQuery,
    resultHost,
    optionsHost: compareOptions.body
  });

  installLiteWorkflow(panel, {
    setup: [target.card, conditions.card],
    advanced: [compareOptions.card],
    advancedCopy: '文字列・リンクの前後の空白や英字の大小を無視して比較できます。',
    actions: [qualityAction],
    results: [resultHost],
    resultActions: ['quality']
  });
}
