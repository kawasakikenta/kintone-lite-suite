'use strict';

import './register-api.js';
import { runKintoneUnifiedSuite } from './boot.js';

if (typeof window !== 'undefined' && window.__KUS_AUTOBOOT__ !== false) {
  runKintoneUnifiedSuite({});
}
