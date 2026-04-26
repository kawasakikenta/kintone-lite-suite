'use strict';

import { createDefaultSectionRenderer, SectionRenderer } from './defaultRenderer.js';
import { createAdminSectionRenderer } from './adminSectionRenderer.js';

const defaultRenderer = createDefaultSectionRenderer();
const adminRenderer = createAdminSectionRenderer();

const REGISTRY: Map<string, SectionRenderer> = new Map([
  ['viewSettings', adminRenderer],
  ['layoutSettings', adminRenderer],
  ['processSettings', adminRenderer],
  ['notifications', adminRenderer],
  ['appAcl', adminRenderer],
  ['fieldAcl', adminRenderer],
  ['recordPermissions', adminRenderer]
]);

export function getSectionRenderer(sectionKey: string): SectionRenderer {
  return REGISTRY.get(sectionKey) || defaultRenderer;
}
