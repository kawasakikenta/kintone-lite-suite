'use strict';

import { runDiffStandalone } from '../tabs/diff-standalone.js';
import { mountDiffLitePanel } from './diff-lite-ui.js';

if (!window.kintone?.api || !window.kintone?.app) {
  alert('kintone画面で実行してください');
} else {
  mountDiffLitePanel(runDiffStandalone);
}
