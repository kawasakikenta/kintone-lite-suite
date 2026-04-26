'use strict';

export type DiffType = 'added' | 'removed' | 'changed' | 'moved' | 'same' | string;
export type DiffSeverity = 'high' | 'medium' | 'low' | string;

export interface DiffRow {
  _id?: string;
  sectionKey: string;
  path: string;
  type: DiffType;
  severity?: DiffSeverity;
  moved?: boolean;
  source?: any;
  target?: any;
  [key: string]: any;
}

export interface DiffFetchIssue {
  section?: string;
  sectionKey?: string;
  side?: string;
  sourceError?: string;
  targetError?: string;
  message?: string;
  [key: string]: any;
}

export interface DiffFilterState {
  keyword: string;
  section: string;
  type: string;
  severity: string;
  searchByFieldName: boolean;
  sourceBundle: any;
  targetBundle: any;
  favoritesOnly: boolean;
}
