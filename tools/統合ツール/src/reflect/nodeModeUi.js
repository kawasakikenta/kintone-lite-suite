'use strict';

import { state } from '../state.js';

/** ノードモードタブがアクティブかどうかを判定します */
export function isReflectNodeModeEffective() {
  return state.activeSubTabs['reflect'] === 'node';
}
