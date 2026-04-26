'use strict';

import { state } from '../state.js';

export type ReflectNodeMode = 'src' | 'tgt';

export interface ReflectRowLike {
  _id?: string;
  left?: any;
  right?: any;
  [key: string]: any;
}

/** 反映ノードの比較元/比較先モード（state のみ依存。apply / tabs で二重定義しない） */
export function reflectRowModeById(rowId: string): ReflectNodeMode {
  return state.reflectNodeModes[rowId] === 'tgt' ? 'tgt' : 'src';
}

export function reflectRowDesiredValue(row: ReflectRowLike): any {
  return reflectRowModeById(row._id || '') === 'tgt' ? row.right : row.left;
}
