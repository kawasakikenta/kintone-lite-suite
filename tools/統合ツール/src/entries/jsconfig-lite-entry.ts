'use strict';

import { mountJsconfigLitePanel } from './jsconfig-lite-ui.js';

if (!window.kintone?.api || !window.kintone?.app) {
  alert('kintone画面で実行してください');
} else {
  mountJsconfigLitePanel();
}
