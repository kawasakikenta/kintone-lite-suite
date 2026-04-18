'use strict';

import { state } from '../state.js';

/** ノード（差分から調整）モードタブがアクティブかどうかを判定します */
export function isReflectNodeModeEffective() {
  return state.activeSubTabs['reflect'] === 'diff';
}
