'use strict';

import { ui } from '../state.js';

/** 簡易表示ON時はノードモード扱いにしない（UIとプラン/反映の一貫性用） */
export function isReflectNodeModeEffective() {
  return !!ui.nodeMode?.checked && !ui.reflectSimpleMode?.checked;
}
