'use strict';

/**
 * Re-exports the pure output builders for layout inspection from Node.
 * Bundled into a single IIFE by tools/test-harness/run-output-layouts.mjs.
 */

import {
  buildDiffHtml,
  buildPatchPayload,
  bundleToMarkdown
} from '../統合ツール/src/diff/export.js';
import { buildHTML as buildErHtml } from '../統合ツール/src/tabs/er.js';
import { computeDiffRows } from '../統合ツール/src/diff/engine.js';
import { enrichDiffRows } from '../統合ツール/src/diff/enrich.js';

declare const globalThis: any;

(globalThis.window || globalThis).__OUT__ = {
  buildDiffHtml,
  buildPatchPayload,
  bundleToMarkdown,
  buildErHtml,
  computeDiffRows,
  enrichDiffRows
};
