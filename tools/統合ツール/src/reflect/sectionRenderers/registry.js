'use strict';

import { createDefaultSectionRenderer } from './defaultRenderer.js';
import { createAdminSectionRenderer } from './adminSectionRenderer.js';

const defaultRenderer = createDefaultSectionRenderer();
const adminRenderer = createAdminSectionRenderer();

const REGISTRY = new Map([
  ['viewSettings', adminRenderer],
  ['layoutSettings', adminRenderer],
  ['processSettings', adminRenderer],
  ['notifications', adminRenderer],
  ['appAcl', adminRenderer],
  ['fieldAcl', adminRenderer],
  ['recordPermissions', adminRenderer]
]);

export function getSectionRenderer(sectionKey) {
  return REGISTRY.get(sectionKey) || defaultRenderer;
}
