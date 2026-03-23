'use strict';

import { state } from '../state.js';

/** 反映ノードの比較元/比較先モード（state のみ依存。apply / tabs で二重定義しない） */
export function reflectRowModeById(rowId) {
  return state.reflectNodeModes[rowId] === 'tgt' ? 'tgt' : 'src';
}

export function reflectRowDesiredValue(row) {
  return reflectRowModeById(row._id) === 'tgt' ? row.right : row.left;
}
