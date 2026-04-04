'use strict';

import { TOOL_VERSION } from './constants.js';
import { runDiffStandalone } from './tabs/diff-standalone.js';

if (typeof window !== 'undefined') {
  window.__KUS__ = window.__KUS__ || {};
  window.__KUS__.VERSION = TOOL_VERSION;
  window.__KUS__.runDiffStandalone = runDiffStandalone;
}
