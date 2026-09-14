'use strict';

import { DEFAULT_APP_ID } from '../constants.js';
import { buildRecordQualityTab } from './record-quality-ui.js';
import { createAppSearchControl } from './appSearchControl.js';
import { connectionSummary } from './liteWorkflow.js';
import { createLitePanel, makeCard, makeInput, makeNote, makeRow } from './litePanelTheme.js';
import { parseRecordAppIds } from '../tabs/record-standalone.js';

/** Read-only, focused entry point for the data-quality checks in Record Manager. */
export function mountRecordQualityLitePanel() {
  const panel = createLitePanel({
    id: 'kus-record-quality-lite',
    title: 'データ品質チェック',
    subtitle: 'レコードの重複と未入力を、選んだ項目の組み合わせで検査します。',
    accent: 'record',
    badges: [{ label: 'Lite' }, { label: '読み取り専用' }],
    hint: 'データは書き換えません。結果は画面で確認し、CSVで保存できます。',
    wide: true
  });

  const appId = makeInput({
    placeholder: 'アプリID（カンマ区切りで複数指定）',
    value: DEFAULT_APP_ID || '',
    width: 'wide',
    ariaLabel: '対象アプリID'
  });
  const guestId = makeInput({ placeholder: 'ゲストID（任意）', width: 'guest', ariaLabel: 'ゲストスペースID' });
  const target = makeCard({ title: '対象アプリ', number: 1 });
  target.body.appendChild(makeRow([appId, guestId], { label: '接続先' }));
  target.body.appendChild(makeNote('複数アプリはカンマ、改行、または空白で区切ります。検査項目は先頭アプリから読み込みます。'));
  target.body.appendChild(createAppSearchControl(panel, {
    guestEl: guestId,
    targets: [{ label: '対象アプリ', apply: (id, _name, guest) => {
      appId.value = id;
      if (guest && !guestId.value.trim()) guestId.value = guest;
      appId.dispatchEvent(new Event('input', { bubbles: true }));
    } }]
  }));
  panel.body.insertBefore(target.card, panel.status);

  const conditions = makeCard({ title: '検査条件', number: 2 });
  panel.body.insertBefore(conditions.card, panel.status);
  const resultHost = document.createElement('section');
  resultHost.setAttribute('aria-label', '検査結果');
  panel.body.insertBefore(resultHost, panel.status);

  const resetMetadata: Array<() => void> = [];
  for (const input of [appId, guestId]) {
    input.addEventListener('input', () => resetMetadata.forEach(reset => reset()));
  }
  buildRecordQualityTab(conditions.body, {
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
    applyViewQuery: () => panel.setStatus('この単機能版では、クエリを直接入力してください。', 'warn'),
    resultHost
  });
}
