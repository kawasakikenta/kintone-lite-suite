'use strict';

import { state, ui } from '../state.js';
import { renderResultRows, renderDiffFilterOptions } from './export.js';

function syncFilterStateFromUi() {
  state.diffFilterSection = ui.diffFilterSection?.value || '';
  state.diffFilterType = ui.diffFilterType?.value || '';
  state.diffFilterSeverity = ui.diffFilterSeverity?.value || '';
}

export function applyDiffUiPreset(presetId) {
  if (!ui.diffFilterSection) return;
  const id = String(presetId || '');
  switch (id) {
    case 'reset':
      ui.diffFilterSection.value = '';
      ui.diffFilterType.value = '';
      ui.diffFilterSeverity.value = '';
      state.diffExcludeSections = null;
      break;
    case 'severity_high':
      ui.diffFilterSeverity.value = 'high';
      break;
    case 'type_added':
      ui.diffFilterType.value = 'added';
      break;
    case 'type_removed':
      ui.diffFilterType.value = 'removed';
      break;
    case 'type_changed':
      ui.diffFilterType.value = 'changed';
      break;
    case 'sec_field':
      ui.diffFilterSection.value = 'fieldSettings';
      state.diffExcludeSections = null;
      break;
    case 'sec_layout':
      ui.diffFilterSection.value = 'layoutSettings';
      state.diffExcludeSections = null;
      break;
    case 'sec_view':
      ui.diffFilterSection.value = 'viewSettings';
      state.diffExcludeSections = null;
      break;
    case 'sec_process':
      ui.diffFilterSection.value = 'processSettings';
      state.diffExcludeSections = null;
      break;
    case 'no_acl':
      ui.diffFilterSection.value = '';
      state.diffExcludeSections = ['appAcl', 'fieldAcl', 'recordPermissions'];
      break;
    default:
      return;
  }
  syncFilterStateFromUi();
  renderDiffFilterOptions();
  renderResultRows(state.lastDiffRows || []);
}

export function applyDiffSectionNav(sectionKey) {
  if (!ui.diffFilterSection) return;
  ui.diffFilterSection.value = sectionKey || '';
  syncFilterStateFromUi();
  renderResultRows(state.lastDiffRows || []);
}
