'use strict';

import { mountSettingsExportLitePanel } from './settings-export-lite-ui.js';

if (!window.kintone?.api || !window.kintone?.app) {
  alert('kintone画面で実行してください');
} else {
  mountSettingsExportLitePanel();
}
