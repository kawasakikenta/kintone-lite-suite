'use strict';

import { downloadText } from '../utils.js';
import {
  buildDiffMarkdownExport,
  type DiffMarkdownContext,
  type DiffMarkdownExport
} from '../diff/markdown-export.js';

/** Markdown は AI が差分の事実を抽出しやすい形式として保存する。 */
export function runExportDiffMarkdown(ctx: DiffMarkdownContext): DiffMarkdownExport {
  const output = buildDiffMarkdownExport(ctx);
  downloadText(output.filename, output.markdown, 'text/markdown;charset=utf-8');
  return output;
}

