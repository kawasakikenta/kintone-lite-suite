'use strict';

import '../register-api.js';
import { runKintoneUnifiedSuite } from '../boot.js';

if (!window.kintone?.api || !window.kintone?.app) {
  alert('kintone画面で実行してください');
} else {
  runKintoneUnifiedSuite({ initialTab: 'field' });
}
