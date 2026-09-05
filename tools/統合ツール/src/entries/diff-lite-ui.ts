'use strict';

import { installWorkflowNavigation } from './liteWorkflow.js';

import { DIFF_NORMALIZATION_PRESETS, SECTION_DEFS } from '../constants.js';
import {
  buildDiffComparisonProfile,
  parseDiffComparisonProfile,
  serializeDiffComparisonProfile
} from '../diff/comparison-profile.js';
import { buildCharDiffHtml, stringifyRowValueForDiff } from '../diff/export.js';
import {
  decodeExactIgnorePathRule,
  encodeExactIgnorePathRule,
  hasIncompleteActualDiffTruncation
} from '../diff/engine.js';
import { runExportDiffXlsx, type DiffXlsxContext } from '../diff/xlsx-export.js';
import { buildDiffXlsxBatchExport } from '../diff/xlsx-batch-export.js';
import { decodeRow, type DecodedRow } from '../diff/path-decoder.js';
import { downloadBlob, downloadText, esc, extractAppNameFromBundle, nowStamp, readTextFile, stableStringify } from '../utils.js';
import { runExportDiffHtmlStandalone } from '../tabs/diff-export-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeTextarea,
  makeSelect,
  makeCard,
  makeDetails,
  makeNote,
  liteRun,
  type LitePanelHandle
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { readSettingsBundleFile } from '../settingsBundleImport.js';
import {
  DEFAULT_MAX_DIFF_BATCH_PAIRS,
  prepareDiffBatchPairs,
  runSequentialDiffBatch,
  type DiffBatchEndpoint,
  type DiffBatchPairInput,
  type DiffBatchPairIssue
} from '../diff/batch-comparison.js';
import {
  autoMatchDiffBatchFolderBundles,
  parseDiffBatchFolderImport,
  type DiffBatchFolderImportedBundle,
  type DiffBatchFolderImportResult,
  type DiffBatchFolderMatchKind
} from '../diff/batch-folder-import.js';

const SCOPE_OPTS: Array<[string, string, boolean]> = [
  ['fieldSettings', 'フィールド', true],
  ['layoutSettings', 'レイアウト', true],
  ['viewSettings', 'ビュー', true],
  ['reportSettings', 'グラフ', false],
  ['processSettings', 'プロセス', true],
  ['appSettings', 'アプリ設定', false],
  ['formSettings', 'フォーム', false],
  ['customizeSettings', 'JS/CSS', false],
  ['pluginSettings', 'プラグイン', false],
  ['actionSettings', 'アクション', false],
  ['appAcl', 'アプリ権限', false],
  ['fieldAcl', 'フィールド権限', false],
  ['recordPermissions', 'レコード権限', false],
  ['notifications', '通知', false],
  ['perRecordNotifications', 'レコード条件通知', false],
  ['reminderNotifications', 'リマインダー', false],
  ['categories', 'カテゴリ', false]
];

const TYPE_LABEL: Record<string, string> = { added: '追加', removed: '削除', changed: '変更', moved: '移動', same: '同一' };
const FACT_LABEL: Record<string, string> = {
  added: '比較先にのみ存在',
  removed: '比較元にのみ存在',
  changed: '内容が異なる',
  moved: '並び順が異なる',
  same: '内容が一致'
};
const RESULT_PAGE_SIZE = 200;
const XLSX_EXPORT_COOLDOWN_MS = 400;
const VALUE_PREVIEW_MAX_LINES = 8;
const VALUE_PREVIEW_MAX_CHARS = 280;

const RESULT_CSS_ID = 'kus-diff-lite-result-styles';
const RESULT_CSS = `
.kus-dl-result{font:13px/1.58 ui-monospace,Menlo,monospace;color:#10253f}
.kus-dl-overview{font-family:-apple-system,"Segoe UI",sans-serif;border:1px solid #d8e0ea;border-radius:16px;background:#fff;margin-bottom:12px;overflow:hidden;box-shadow:0 16px 34px -30px rgba(15,37,63,.48)}
.kus-dl-overview:focus{outline:3px solid #2563eb;outline-offset:2px}
.kus-dl-overview__direction{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.kus-dl-side{min-width:0}
.kus-dl-side--target{text-align:right}
.kus-dl-side__role{display:block;color:#64748b;font-size:11px;font-weight:700;letter-spacing:.04em}
.kus-dl-side__name{display:block;color:#0f172a;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-side__env{display:block;color:#64748b;font-size:11px}
.kus-dl-overview__arrow{color:#2563eb;font-size:18px;font-weight:800}
.kus-dl-verdict{padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#eff6ff;color:#1e3a8a}
.kus-dl-verdict--same{background:#f0fdf4;color:#166534}
.kus-dl-verdict--warn{background:#fff7ed;color:#9a3412}
.kus-dl-verdict strong{display:block;font-size:13px;margin-bottom:2px}
.kus-dl-verdict span{font-size:11px;line-height:1.55}
.kus-dl-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:10px 12px}
.kus-dl-metric{appearance:none;position:relative;overflow:hidden;border:1px solid #d8e0ea;border-radius:12px;background:#fff;color:#334155;padding:10px 8px;text-align:center;font:inherit}
.kus-dl-metric::before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:#94a3b8}
.kus-dl-metric[data-kus-dl-type-filter="added"]::before{background:#15803d}
.kus-dl-metric[data-kus-dl-type-filter="removed"]::before{background:#b91c1c}
.kus-dl-metric[data-kus-dl-type-filter="changed"]::before{background:#b45309}
.kus-dl-metric[data-kus-dl-type-filter="moved"]::before{background:#7c3aed}
button.kus-dl-metric{cursor:pointer}
button.kus-dl-metric:hover{border-color:#93c5fd;background:#eff6ff}
.kus-dl-metric__num{display:block;color:#10253f;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.15}
.kus-dl-metric__label{display:block;margin-top:3px;font-size:12px;font-weight:700}
.kus-dl-metric__hint{display:block;color:#64748b;font-size:11px;font-weight:400}
.kus-dl-section-nav{display:flex;flex-wrap:wrap;gap:5px;padding:0 12px 10px}
.kus-dl-section-nav__label{width:100%;color:#64748b;font-size:11px;font-weight:700}
.kus-dl-section-jump{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;padding:3px 8px;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-section-jump:hover{border-color:#60a5fa;background:#eff6ff;color:#1d4ed8}
.kus-dl-alert{margin:0 12px 10px;padding:8px 10px;border:1px solid #fdba74;border-radius:7px;background:#fff7ed;color:#9a3412;font:600 11px/1.55 -apple-system,Segoe UI,sans-serif}
.kus-dl-legend{padding:0 12px 10px;color:#64748b;font:11px/1.5 -apple-system,Segoe UI,sans-serif}
.kus-dl-result__summary{margin:0 2px 7px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11px;color:#64748b;display:flex;flex-wrap:wrap;gap:6px 12px}
.kus-dl-sticky{position:sticky;top:0;z-index:4;margin:0 0 10px;padding:0 0 4px;background:linear-gradient(180deg,rgba(248,250,252,.995) 86%,rgba(248,250,252,0));backdrop-filter:blur(7px)}
.kus-dl-contextbar{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:7px;padding:6px;border:1px solid #cbd5e1;border-radius:10px;background:#e2e8f0;box-shadow:0 2px 10px rgba(15,23,42,.08);font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-contextlane{min-width:0;padding:6px 9px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;box-shadow:inset 3px 0 0 #64748b}
.kus-dl-contextlane--after{box-shadow:inset 3px 0 0 #2563eb}
.kus-dl-contextlane__role{display:block;margin-bottom:1px;color:#64748b;font-size:11px;font-weight:900;letter-spacing:.08em}
.kus-dl-contextlane--after .kus-dl-contextlane__role{color:#1d4ed8}
.kus-dl-contextlane__name{display:block;overflow:hidden;color:#0f172a;font-size:11px;font-weight:800;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
.kus-dl-progress{align-self:center;min-width:72px;padding:4px 7px;text-align:center;color:#1e3a8a;font-variant-numeric:tabular-nums}
.kus-dl-progress__numbers{display:flex;align-items:baseline;justify-content:center;gap:3px;line-height:1}
.kus-dl-progress__current{color:#1d4ed8;font-size:18px;font-weight:900}
.kus-dl-progress__total{color:#475569;font-size:11px;font-weight:800}
.kus-dl-progress__label{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:800;letter-spacing:.04em}
.kus-dl-result__summary strong{color:#0f172a}
.kus-dl-section{border:1px solid #d8e0ea;border-radius:14px;margin-bottom:12px;overflow:hidden;background:#fff;box-shadow:0 12px 28px -28px rgba(15,37,63,.55)}
.kus-dl-section>summary{padding:11px 13px;background:linear-gradient(180deg,#fff,#f4f7fa);font:700 13px/1.45 -apple-system,"Segoe UI",sans-serif;cursor:pointer;list-style:none;display:flex;align-items:center;gap:7px}
.kus-dl-section>summary::-webkit-details-marker{display:none}
.kus-dl-section>summary::before{content:"▸";display:inline-block;margin-right:6px;color:#64748b;transition:transform .15s}
.kus-dl-section[open]>summary::before{transform:rotate(90deg)}
.kus-dl-section__heading{display:flex;align-items:baseline;gap:7px;min-width:100px}
.kus-dl-section__label{color:#0f172a;font-weight:800}
.kus-dl-section__count{color:#64748b;font-size:11px;font-weight:500}
.kus-dl-section__breakdown{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;margin-left:auto}
.kus-dl-section__stat{padding:1px 6px;border:1px solid #dbe3ee;border-radius:999px;background:#fff;color:#475569;font-size:11px;font-weight:700;white-space:nowrap}
.kus-dl-section__stat--added{border-color:#bbf7d0;color:#166534}
.kus-dl-section__stat--removed{border-color:#fecaca;color:#991b1b}
.kus-dl-section__stat--changed{border-color:#bfdbfe;color:#1d4ed8}
.kus-dl-section__stat--moved{border-color:#fde68a;color:#92400e}
.kus-dl-section__body{display:grid;gap:9px;padding:10px;background:#f4f7fa}
.kus-dl-row{border:1px solid #d8e0ea;border-left:4px solid transparent;border-radius:12px;padding:12px 13px;background:linear-gradient(180deg,#fff,#fbfdff);font-family:-apple-system,"Segoe UI",sans-serif;font-size:13px;box-shadow:0 10px 24px -24px rgba(15,37,63,.58);transition:background-color .12s,border-color .12s,box-shadow .12s}
.kus-dl-row--added{border-left-color:#22c55e}
.kus-dl-row--removed{border-left-color:#ef4444}
.kus-dl-row--changed{border-left-color:#3b82f6}
.kus-dl-row--moved{border-left-color:#f59e0b}
.kus-dl-row--same{border-left-color:#cbd5e1}
.kus-dl-row:focus,.kus-dl-row.is-current{outline:2px solid #2563eb;outline-offset:1px;background:#f8fbff;box-shadow:0 4px 14px rgba(37,99,235,.13)}
.kus-dl-row__head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;margin-bottom:7px}
.kus-dl-row__identity{min-width:0}
.kus-dl-row__headline{display:flex;flex-wrap:wrap;align-items:center;gap:5px 6px}
.kus-dl-row__title{min-width:150px;flex:1;color:#10253f;font-size:15px;font-weight:800;line-height:1.45}
.kus-dl-row__subtitle{margin:4px 0 0;color:#64748b;font-size:12px;line-height:1.55}
.kus-dl-row__context{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:0 0 6px;color:#64748b}
.kus-dl-row__chip{display:inline-flex;align-items:center;border-radius:999px;background:#e2e8f0;color:#334155;padding:1px 6px;font-size:11px}
.kus-dl-row__technical{margin:0 0 7px;color:#64748b;font:11px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-row__technical>summary{display:inline-flex;align-items:center;gap:4px;padding:1px 4px;border-radius:4px;cursor:pointer;list-style:none;color:#64748b;font-weight:700}
.kus-dl-row__technical>summary::-webkit-details-marker{display:none}
.kus-dl-row__technical>summary::before{content:'›';font-size:12px;transition:transform .12s}
.kus-dl-row__technical[open]>summary::before{transform:rotate(90deg)}
.kus-dl-row__raw{display:block;margin-top:3px;padding:5px 7px;border:1px dashed #cbd5e1;border-radius:5px;background:#f8fafc;color:#475569;font:11px/1.45 ui-monospace,Menlo,monospace;word-break:break-all}
.kus-dl-row__cols{display:grid;grid-template-columns:1fr 1fr;gap:9px;font-family:ui-monospace,Menlo,monospace;font-size:12px}
.kus-dl-row__mobile-toggle{display:none;width:100%;margin:0 0 7px;align-items:center;justify-content:center;border:1px solid #94a3b8;border-radius:7px;background:#f8fafc;color:#1e3a8a;padding:7px 9px;font:700 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-value{position:relative;min-width:0}
.kus-dl-pre{box-sizing:border-box;width:100%;margin:0;padding:7px 8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-word;overflow:auto}
.kus-dl-value.is-collapsed .kus-dl-pre{max-height:126px;overflow:hidden}
.kus-dl-value__footer{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px;padding:3px 2px 0;color:#64748b;font:11px/1.3 -apple-system,Segoe UI,sans-serif}
.kus-dl-value__toggle{margin-left:auto;padding:2px 6px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#1d4ed8;font:700 11px/1.35 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-value__toggle:hover{border-color:#60a5fa;background:#eff6ff}
.kus-dl-pre.del{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
.kus-dl-pre.add{background:#f0fdf4;border-color:#bbf7d0;color:#14532d}
.kus-dl-pre.empty{color:#64748b;font-style:italic}
.kus-dl-badge{display:inline-block;padding:1px 6px;border-radius:4px;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.02em}
.kus-dl-badge--added{background:#dcfce7;color:#166534}
.kus-dl-badge--removed{background:#fee2e2;color:#991b1b}
.kus-dl-badge--changed{background:#dbeafe;color:#1d4ed8}
.kus-dl-badge--moved{background:#fef3c7;color:#92400e}
.kus-dl-badge--same{background:#e2e8f0;color:#475569}
.kus-dl-empty{padding:14px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:8px}
.kus-dl-flag{display:inline-block;padding:1px 6px;border-radius:999px;background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;font:500 11px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-row__action{border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#475569;padding:3px 7px;font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;white-space:nowrap}
.kus-dl-row__action:hover{border-color:#f59e0b;background:#fffbeb;color:#92400e}
.kus-dl-reviewbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:5px 0 0;padding:5px 6px;border:1px solid #bfdbfe;border-radius:8px;background:rgba(239,246,255,.98);font:600 11px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-reviewbar__nav,.kus-dl-reviewbar__tools,.kus-dl-reviewbar__filters{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.kus-dl-reviewbar__filters{min-width:120px;flex:1}
.kus-dl-filter-empty{padding:2px 5px;color:#64748b;font-weight:600}
.kus-dl-filterchip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border:1px solid #93c5fd;border-radius:999px;background:#fff;color:#1e3a8a;font:700 11px/1.35 -apple-system,Segoe UI,sans-serif;cursor:pointer;max-width:180px}
.kus-dl-filterchip>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kus-dl-filterchip::after{content:'×';color:#64748b;font-size:11px}
.kus-dl-filterchip:hover{border-color:#2563eb;background:#dbeafe}
.kus-dl-filterchip--all{border-style:dashed;color:#475569}
.kus-dl-navbtn{border:1px solid #93c5fd;border-radius:6px;background:#fff;color:#1d4ed8;padding:3px 7px;font:700 11px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;white-space:nowrap}
.kus-dl-navbtn:disabled{opacity:.45;cursor:not-allowed}
.kus-dl-result--compact .kus-dl-row{padding:6px 7px;font-size:10.5px}
.kus-dl-result--compact .kus-dl-row__context{display:none}
.kus-dl-result--compact .kus-dl-pre{padding:4px 6px;font-size:10px}
.kus-dl-result--compact .kus-dl-value.is-collapsed .kus-dl-pre{max-height:92px}
.kus-dl-result--compact .kus-dl-section__body{padding:3px}
.kus-dl-result--comfortable .kus-dl-row{padding:9px 10px}
.kus-dl-result--comfortable .kus-dl-value.is-collapsed .kus-dl-pre{max-height:164px}
.kus-dl-result--stacked .kus-dl-row__cols{grid-template-columns:1fr}
.kus-dl-result--stacked .kus-dl-pre::before{content:attr(data-side-label);display:block;margin:0 0 5px;color:#64748b;font:700 11px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.04em}
.kus-dl-result mark.diff-char-del{background:#fecaca;color:#7f1d1d;border-radius:2px;padding:0 1px;text-decoration:line-through}
.kus-dl-result mark.diff-char-add{background:#bbf7d0;color:#14532d;border-radius:2px;padding:0 1px}
.kus-dl-target-field{display:flex;flex:1 1 180px;min-width:180px;flex-direction:column}
.kus-dl-target-field .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-target-name{min-height:1.35em;margin-top:3px;color:#64748b;font-size:11px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-target-name:not(.kus-dl-target-name--empty)::before{content:'アプリ名: ';color:#334155;font-weight:600}
.kus-dl-more{display:flex;justify-content:center;padding:8px 0 2px}
.kus-dl-multi{width:100%;border-collapse:collapse;font:11px/1.45 -apple-system,Segoe UI,sans-serif}
.kus-dl-table-scroll{box-sizing:border-box;width:100%;max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}
.kus-dl-table-scroll:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
.kus-dl-table-scroll>.kus-dl-multi{min-width:720px}
.kus-dl-table-scroll>.kus-dl-multi--pairs{min-width:880px}
.kus-dl-multi caption{text-align:left;color:#475569;font-weight:700;padding:0 0 6px}
.kus-dl-multi th,.kus-dl-multi td{padding:6px 7px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top}
.kus-dl-multi th:first-child,.kus-dl-multi td:first-child{text-align:left}
.kus-dl-multi thead th{position:sticky;top:0;background:#f8fafc;color:#475569;font-size:11px}
.kus-dl-multi__warn{color:#9a3412;font-weight:700}
.kus-dl-multi__ok{color:#166534;font-weight:700}
.kus-dl-multi--pairs th:nth-child(2),.kus-dl-multi--pairs td:nth-child(2),.kus-dl-multi--pairs th:nth-child(3),.kus-dl-multi--pairs td:nth-child(3),.kus-dl-multi--pairs th:nth-child(5),.kus-dl-multi--pairs td:nth-child(5),.kus-dl-multi--pairs th:nth-child(6),.kus-dl-multi--pairs td:nth-child(6){text-align:left}
.kus-dl-pair-breakdown{display:block;min-width:165px}
.kus-dl-pair-breakdown strong,.kus-dl-pair-breakdown small{display:block}
.kus-dl-pair-breakdown small{margin-top:2px;color:#64748b;white-space:nowrap}
.kus-dl-pair-save{display:flex;gap:4px;justify-content:flex-end}
.kus-dl-pair-save .kus-lp__btn{min-height:36px!important;padding:5px 7px!important;font-size:10.5px}
.kus-dl-batch-save{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px;padding:12px 14px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-batch-save__text{min-width:0;color:#1e3a8a}
.kus-dl-batch-save__text strong,.kus-dl-batch-save__text small{display:block}
.kus-dl-batch-save__text strong{color:#10253f;font-size:13px}
.kus-dl-batch-save__text small{margin-top:2px;font-size:11px;line-height:1.45}
.kus-dl-batch-save .kus-lp__btn{flex:0 0 auto;min-width:250px}

/* Diff Lite only: human-first review workspace. Shared litePanelTheme is intentionally untouched. */
#kus-diff-lite.kus-lp{width:min(1000px,calc(100vw - 24px));max-height:min(96vh,1040px);top:max(8px,2vh);right:max(8px,1vw);border-radius:18px;background:#f4f7fa;box-shadow:0 28px 80px -32px rgba(15,37,63,.52)}
#kus-diff-lite .kus-lp__hero{position:relative;padding:17px 22px;background:linear-gradient(135deg,#0f2742 0%,#173b63 72%,#24517f 100%)}
#kus-diff-lite .kus-lp__hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#60a5fa,#22d3ee,#818cf8)}
#kus-diff-lite .kus-lp__badge-row{display:none}
#kus-diff-lite .kus-lp__body{padding:18px 20px 22px}
#kus-diff-lite [hidden]{display:none!important}
#kus-diff-lite .kus-lp__hint{margin-bottom:16px;padding:0 2px;border:0;background:transparent;color:#475569}
#kus-diff-lite button,#kus-diff-lite input:not([type="checkbox"]):not([type="file"]),#kus-diff-lite select{min-height:44px}
#kus-diff-lite input[type="file"]{min-height:44px;padding:8px 0;box-sizing:border-box}
#kus-diff-lite .kus-lp__check{min-height:44px}
#kus-diff-lite button:focus-visible,#kus-diff-lite input:focus-visible,#kus-diff-lite select:focus-visible,#kus-diff-lite textarea:focus-visible,#kus-diff-lite summary:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
.kus-dl-workflow{display:grid;gap:16px}
.kus-dl-step{min-width:0;padding:20px;border:1px solid #d8e0ea;border-radius:16px;background:#fff;box-shadow:0 16px 36px -32px rgba(15,37,63,.62)}
.kus-dl-step__header{display:flex;align-items:flex-start;gap:11px;margin:0 0 15px;padding:0 0 13px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-step__number{display:inline-flex;flex:0 0 30px;width:30px;height:30px;align-items:center;justify-content:center;border-radius:10px;background:linear-gradient(145deg,#16395f,#2563eb);color:#fff;font-size:12px;font-weight:800;box-shadow:0 6px 14px -8px rgba(37,99,235,.8)}
.kus-dl-step__header h2{margin:0;color:#10253f;font-size:16px;line-height:1.35}
.kus-dl-step__header p{margin:3px 0 0;color:#64748b;font-size:11.5px;line-height:1.5}
.kus-dl-step__empty{margin:0;padding:18px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#64748b;text-align:center;font-size:12px}
.kus-dl-step>.kus-lp__card,.kus-dl-disclosure__body>.kus-lp__card{margin:0;border:0;box-shadow:none;background:transparent;padding:0}
.kus-dl-target-card>.kus-lp__card-head,.kus-dl-filter-disclosure .kus-lp__card-head,.kus-dl-output-disclosure .kus-lp__card-head,.kus-dl-step[data-kus-dl-step="review"]>.kus-lp__card>.kus-lp__card-head{display:none}
.kus-dl-mode{display:inline-flex;gap:4px;margin:0 0 12px;padding:3px;border:1px solid #cbd5e1;border-radius:10px;background:#f1f5f9}
.kus-dl-mode .kus-lp__btn{min-width:118px;border-color:transparent;background:transparent;box-shadow:none;color:#475569}
.kus-dl-mode .kus-lp__btn.is-active{background:#fff;border-color:#cbd5e1;color:#10253f;box-shadow:0 1px 2px rgba(15,23,42,.08)}
.kus-dl-pair-editor{display:grid;gap:12px}
.kus-dl-pair-editor__intro{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px;padding:11px 13px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-pair-editor__intro strong{display:block;color:#10253f;font-size:13px}
.kus-dl-pair-editor__intro span{display:block;margin-top:2px;color:#475569;font-size:11px;line-height:1.5}
.kus-dl-pair-count{flex:0 0 auto;padding:3px 8px;border:1px solid #bfdbfe;border-radius:999px;background:#fff;color:#1e3a8a;font-size:11px;font-weight:800;font-variant-numeric:tabular-nums}
.kus-dl-pair-list{display:grid;gap:10px}
.kus-dl-pair-row{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) 38px minmax(0,1fr) minmax(84px,auto);gap:9px;align-items:stretch;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font-family:-apple-system,Segoe UI,sans-serif;box-shadow:0 12px 28px -28px rgba(15,37,63,.7)}
.kus-dl-pair-row.is-invalid{border-color:#f59e0b;background:#fffbeb;box-shadow:0 0 0 2px rgba(245,158,11,.12)}
.kus-dl-pair-row__number{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;background:#e2e8f0;color:#334155;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums}
.kus-dl-pair-side{min-width:0;padding:10px;border:1px solid #d8e0ea;border-left:4px solid #475569;border-radius:10px;background:#f8fafc}
.kus-dl-pair-side--target{border-left-color:#2563eb;background:#eff6ff}
.kus-dl-pair-side__role{display:block;margin:0 0 7px;color:#475569;font-size:11px;font-weight:850;letter-spacing:.05em}
.kus-dl-pair-side__fields{display:grid;grid-template-columns:minmax(125px,1fr) minmax(82px,.55fr);gap:7px;align-items:start}
.kus-dl-pair-side__fields .kus-dl-target-field{min-width:0}
.kus-dl-pair-side__fields .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-pair-field-label{display:block;margin:0 0 4px;color:#475569;font-size:10.5px;font-weight:750;line-height:1.35}
.kus-dl-pair-guest-field{min-width:0}
.kus-dl-pair-side__preview{grid-column:1/-1;min-height:34px!important}
.kus-dl-pair-arrow{display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:20px;font-weight:900}
.kus-dl-pair-actions{display:flex;flex-direction:column;gap:5px;justify-content:center}
.kus-dl-pair-actions .kus-lp__btn{width:100%;min-height:36px!important;padding:6px 8px!important;font-size:11px}
.kus-dl-pair-row__error{grid-column:2/-1;margin:0;padding:7px 9px;border:1px solid #fdba74;border-radius:7px;background:#fff7ed;color:#9a3412;font-size:11px;font-weight:700;line-height:1.5}
.kus-dl-pair-row__match{grid-column:2/-1;margin:0;padding:6px 9px;border:1px solid #bfdbfe;border-radius:7px;background:#eff6ff;color:#1e3a8a;font-size:11px;font-weight:700;line-height:1.5}
.kus-dl-pair-side__file{display:block;margin:8px 0 0;padding:6px 8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#475569;font-size:10.5px;line-height:1.45;overflow-wrap:anywhere}
.kus-dl-pair-toolbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.kus-dl-pair-folder{display:grid;gap:10px;padding:13px;border:1px solid #93c5fd;border-radius:12px;background:#f8fbff;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-pair-folder__head strong{display:block;color:#10253f;font-size:13px}
.kus-dl-pair-folder__head span{display:block;margin-top:3px;color:#475569;font-size:11px;line-height:1.55}
.kus-dl-pair-folder__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.kus-dl-pair-folder__side{min-width:0;padding:10px;border:1px solid #cbd5e1;border-left:4px solid #475569;border-radius:9px;background:#fff}
.kus-dl-pair-folder__side--target{border-left-color:#2563eb;background:#eff6ff}
.kus-dl-pair-folder__side strong{display:block;margin-bottom:7px;color:#334155;font-size:11px}
.kus-dl-pair-folder__actions{display:flex;flex-wrap:wrap;gap:6px}
.kus-dl-pair-folder__summary{margin:7px 0 0;color:#64748b;font-size:10.5px;line-height:1.5;overflow-wrap:anywhere}
.kus-dl-pair-folder__error{margin:0;padding:8px 10px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:10.5px;font-weight:700;line-height:1.5;overflow-wrap:anywhere}
.kus-dl-pair-folder__mapping{border:1px solid #cbd5e1;border-radius:9px;background:#fff;overflow:hidden}
.kus-dl-pair-folder__mapping-scroll{max-width:100%;overflow-x:auto}
.kus-dl-pair-folder__mapping table{width:100%;min-width:700px;border-collapse:collapse;font-size:10.5px}
.kus-dl-pair-folder__mapping th,.kus-dl-pair-folder__mapping td{padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:middle}
.kus-dl-pair-folder__mapping th{background:#f1f5f9;color:#475569;font-weight:800}
.kus-dl-pair-folder__mapping select{box-sizing:border-box;width:100%;min-height:38px;border:1px solid #94a3b8;border-radius:7px;background:#fff;color:#0f172a}
.kus-dl-pair-folder__app{display:block;color:#10253f;font-weight:800}
.kus-dl-pair-folder__meta{display:block;margin-top:2px;color:#64748b;line-height:1.4;overflow-wrap:anywhere}
.kus-dl-pair-folder__badge{display:inline-flex;padding:3px 6px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:10px;font-weight:850;white-space:nowrap}
.kus-dl-pair-folder__badge--app-name{background:#dcfce7;color:#166534}
.kus-dl-pair-folder__badge--app-id,.kus-dl-pair-folder__badge--position{background:#fef3c7;color:#92400e}
.kus-dl-pair-folder__badge--manual{background:#dbeafe;color:#1e40af}
.kus-dl-pair-folder__foot{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:7px;padding:9px 10px;background:#f8fafc}
.kus-dl-pair-folder__review{min-width:0;color:#475569;font-size:11px;font-weight:700;line-height:1.5}
.kus-dl-pair-folder__unused{margin:0;padding:8px 10px;border-top:1px solid #e2e8f0;color:#9a3412;font-size:10.5px;line-height:1.5}
.kus-dl-pair-bulk{margin:0;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc}
.kus-dl-pair-bulk>summary{display:flex;align-items:center;min-height:44px;padding:8px 11px;box-sizing:border-box;cursor:pointer;color:#334155;font-size:12px;font-weight:750}
.kus-dl-pair-bulk__body{display:grid;gap:8px;padding:10px;border-top:1px solid #e2e8f0}
.kus-dl-pair-bulk__body textarea{box-sizing:border-box;width:100%}
.kus-dl-pair-editor .kus-as__result{background:#fff}
.kus-dl-direction-grid{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:10px}
.kus-dl-app-card{min-width:0;padding:16px;border:1px solid #d8e0ea;border-left:4px solid #475569;border-radius:14px;background:#f8fafc}
.kus-dl-app-card--target{border-color:#d8e0ea;border-left-color:#2563eb;background:#eff6ff}
.kus-dl-app-card__role{margin:0 0 2px;color:#64748b;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.kus-dl-app-card h3{margin:0;color:#10253f;font-size:14px}
.kus-dl-app-card__help{margin:3px 0 13px;color:#64748b;font-size:11px}
.kus-dl-app-card .kus-lp__row{align-items:flex-start;margin-bottom:7px}
.kus-dl-app-card .kus-lp__label{width:100%;min-width:0;color:#475569;font-size:11px}
.kus-dl-app-card .kus-lp__input{flex:1;min-width:100px;width:auto;box-sizing:border-box}
.kus-dl-app-card .kus-dl-target-field{min-width:140px}
.kus-dl-swap{align-self:center;justify-self:center;width:88px;padding:8px!important;white-space:normal;line-height:1.3}
.kus-dl-target-list{display:grid;gap:7px;max-height:220px;margin-top:8px;padding-right:2px;overflow-y:auto}
.kus-dl-multi-controls{margin-top:12px!important;padding-top:10px;border-top:1px solid #e2e8f0}
.kus-dl-common-exclusion{margin-top:12px;padding:12px 14px;border:1px solid #bfdbfe;border-left:4px solid #2563eb;border-radius:10px;background:#eff6ff;color:#10253f;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-common-exclusion__heading{margin:0 0 3px;font-size:12px;font-weight:850;letter-spacing:.04em}
.kus-dl-common-exclusion__description{margin:0 0 4px;color:#334155;font-size:11.5px;line-height:1.55}
.kus-dl-common-exclusion .kus-lp__check{min-height:40px!important;color:#10253f;font-size:13px;font-weight:750}
.kus-dl-common-exclusion__note{margin:3px 0 0;color:#475569;font-size:11px;line-height:1.55}
.kus-dl-run-row{margin:13px 0 0!important}
.kus-dl-run-row .kus-lp__btn{width:100%}
.kus-dl-step>.kus-lp__status{margin:10px 0 0;min-height:44px;box-sizing:border-box}
.kus-dl-disclosure{margin-top:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;overflow:hidden}
.kus-dl-disclosure>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;box-sizing:border-box;padding:9px 13px;cursor:pointer;list-style:none;color:#10253f;font-weight:750}
.kus-dl-disclosure>summary::-webkit-details-marker{display:none}
.kus-dl-disclosure>summary::after{content:'＋';margin-left:auto;color:#64748b;font-size:16px}
.kus-dl-disclosure[open]>summary::after{content:'−'}
.kus-dl-disclosure>summary small{color:#64748b;font-size:11px;font-weight:500;text-align:right}
.kus-dl-disclosure__body{display:grid;gap:12px;padding:13px;border-top:1px solid #e2e8f0;background:#f8fafc}
.kus-dl-disclosure__body .kus-lp__details{margin-bottom:0;background:#fff}
.kus-dl-overview{border-color:#cbd5e1;border-radius:10px;box-shadow:none}
.kus-dl-overview__direction{background:#fff}
.kus-dl-overview__arrow{color:#16395f}
.kus-dl-verdict{position:relative;padding:12px 14px 12px 18px;border-left:5px solid #2563eb;background:#f8fafc;color:#10253f}
.kus-dl-verdict--same{border-left-color:#64748b;background:#f8fafc;color:#334155}
.kus-dl-verdict--warn{border-left-color:#b45309;background:#fffbeb;color:#78350f}
.kus-dl-verdict__eyebrow{display:block;margin-bottom:2px;color:inherit;font-size:11px!important;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.kus-dl-alert{position:relative;margin:9px 12px 0;padding:9px 10px 9px 32px;border-color:#d6a85c;background:#fffbeb;color:#713f12;font-weight:550}
.kus-dl-alert::before{content:'!';position:absolute;left:10px;top:9px;display:inline-flex;width:15px;height:15px;align-items:center;justify-content:center;border:1px solid currentColor;border-radius:50%;font-size:9px;font-weight:900}
.kus-dl-alert[role="note"]{border-color:#cbd5e1;background:#f8fafc;color:#475569}
.kus-dl-alert[role="note"]::before{content:'i'}
.kus-dl-metrics{grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:6px;margin:10px 12px;padding:0}
.kus-dl-metric{min-width:0!important;min-height:66px!important;border:1px solid #dbe3ec;border-radius:8px;background:#fff}
button.kus-dl-metric:hover{background:#f1f5f9;border-color:#e2e8f0}
.kus-dl-section-jump,.kus-dl-filterchip,.kus-dl-navbtn,.kus-dl-value__toggle,.kus-dl-row__action{min-height:44px!important}
.kus-dl-section__stat,.kus-dl-section__stat--added,.kus-dl-section__stat--removed,.kus-dl-section__stat--changed,.kus-dl-section__stat--moved{border-color:#cbd5e1;background:#fff;color:#475569}
.kus-dl-section__body{background:#f4f7fa}
.kus-dl-section>summary{min-height:44px;box-sizing:border-box}
.kus-dl-row{border-left-color:#64748b;background:#fff;transition:none}
.kus-dl-row--added{border-left-color:#15803d}
.kus-dl-row--removed{border-left-color:#b91c1c}
.kus-dl-row--changed{border-left-color:#b45309}
.kus-dl-row--moved{border-left-color:#7c3aed}
.kus-dl-row--same{border-left-color:#94a3b8}
.kus-dl-badge{display:inline-flex;align-items:center;gap:4px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:750}
.kus-dl-badge--added{border-color:#bbf7d0;background:#ecfdf5;color:#15803d}
.kus-dl-badge--removed{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
.kus-dl-badge--changed{border-color:#fde68a;background:#fffbeb;color:#b45309}
.kus-dl-badge--moved{border-color:#ddd6fe;background:#f5f3ff;color:#7c3aed}
.kus-dl-badge--same{border-color:#cbd5e1;background:#f8fafc;color:#64748b}
.kus-dl-badge--added::before{content:'＋'}
.kus-dl-badge--removed::before{content:'−'}
.kus-dl-badge--changed::before{content:'≠'}
.kus-dl-badge--moved::before{content:'↕'}
.kus-dl-badge--same::before{content:'＝'}
.kus-dl-badge__type{font-weight:850}
.kus-dl-badge__fact{display:inline-flex;align-items:center;color:#475569;font-weight:650}
.kus-dl-badge__fact::before{content:'｜';margin-right:4px;color:#94a3b8}
.kus-dl-flag{border-color:#cbd5e1;background:#f8fafc;color:#475569}
.kus-dl-row__action:hover{border-color:#94a3b8;background:#f1f5f9;color:#10253f}
.kus-dl-pre,.kus-dl-pre.del,.kus-dl-pre.add{border-color:#dbe3ec;background:#f8fafc;color:#1e293b}
.kus-dl-value__label{display:block;margin:0 0 4px;color:#475569;font:800 11px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.06em}
.kus-dl-presence{grid-column:1/-1;display:grid;grid-template-columns:minmax(150px,.38fr) minmax(0,1fr);gap:10px;align-items:start;padding:10px;border:1px dashed #9fb2c8;border-radius:8px;background:#f8fafc}
.kus-dl-presence>p{margin:1px 0;color:#334155;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-presence>p strong,.kus-dl-presence>p span{display:block}
.kus-dl-presence>p strong{color:#10253f;font-size:12px}
.kus-dl-presence>p span{margin-top:3px;color:#64748b;font-size:11px}
.kus-dl-row__technical>summary{min-height:44px;box-sizing:border-box}
.kus-dl-row__raw>span{display:block;margin-bottom:2px;color:#64748b;font-family:-apple-system,Segoe UI,sans-serif;font-size:11px;font-weight:700}
.kus-dl-conditions strong,.kus-dl-conditions span{display:block}
.kus-dl-conditions strong{margin-bottom:2px;color:#334155}
.kus-dl-completion-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0 0!important}
.kus-dl-completion-row .kus-lp__btn{width:100%}
.kus-dl-reviewbar{border-color:#cbd5e1;background:#f8fafc}
.kus-dl-contextbar{border-color:#cbd5e1;background:rgba(226,232,240,.94);box-shadow:0 12px 30px -22px rgba(15,37,63,.72)}
.kus-dl-contextlane,.kus-dl-contextlane--after{box-shadow:none;border-left:4px solid #475569}
.kus-dl-contextlane--after{border-left-color:#2563eb}
.kus-dl-filter-disclosure,.kus-dl-output-disclosure{margin:0 0 12px}
.kus-dl-filter-disclosure .kus-lp__card,.kus-dl-output-disclosure .kus-lp__card{padding:0}
.kus-dl-result mark.diff-char-del{background:#e2e8f0;color:#1e293b;text-decoration:line-through;text-decoration-thickness:2px}
.kus-dl-result mark.diff-char-add{background:#dbeafe;color:#1e3a8a;text-decoration:underline;text-decoration-thickness:2px}
@media(max-width:768px){
  #kus-diff-lite.kus-lp{width:calc(100vw - 12px);max-height:calc(100vh - 12px);top:6px;right:6px;border-radius:10px}
  #kus-diff-lite .kus-lp__hero{padding:13px 14px}
  #kus-diff-lite .kus-lp__body{padding:13px 12px 18px}
  .kus-dl-step{padding:14px 12px}
  .kus-dl-direction-grid{grid-template-columns:1fr}
  .kus-dl-mode{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;box-sizing:border-box}
  .kus-dl-mode .kus-lp__btn{min-width:0;padding-inline:7px!important}
  .kus-dl-pair-row{grid-template-columns:30px minmax(0,1fr) 30px minmax(0,1fr);padding:10px;gap:7px}
  .kus-dl-pair-actions{grid-column:2/-1;flex-direction:row;justify-content:flex-end}
  .kus-dl-pair-actions .kus-lp__btn{width:auto}
  .kus-dl-pair-row__error{grid-column:2/-1}
  .kus-dl-swap{width:100%;max-width:none}
  .kus-dl-row__cols{grid-template-columns:1fr}
  .kus-dl-presence{grid-template-columns:1fr}
  .kus-dl-sticky{position:sticky;top:0;z-index:6;margin-inline:-2px;padding:2px 2px 5px;background:linear-gradient(180deg,rgba(244,247,250,.98) 84%,rgba(244,247,250,0));backdrop-filter:blur(10px)}
  .kus-dl-disclosure>summary{align-items:flex-start;flex-wrap:wrap}
  .kus-dl-disclosure>summary small{width:100%;padding-right:28px;text-align:left}
}
@media(max-width:640px){
  .kus-dl-pair-folder__grid{grid-template-columns:1fr}
  .kus-dl-pair-folder__mapping-scroll{overflow-x:visible}
  .kus-dl-pair-folder__mapping table{display:block;min-width:0}
  .kus-dl-pair-folder__mapping thead{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .kus-dl-pair-folder__mapping tbody{display:grid;gap:8px;padding:8px}
  .kus-dl-pair-folder__mapping tr{display:grid;border:1px solid #cbd5e1;border-radius:9px;background:#fff;overflow:hidden}
  .kus-dl-pair-folder__mapping td{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;align-items:center;padding:8px;border-bottom:1px solid #e2e8f0}
  .kus-dl-pair-folder__mapping td:last-child{border-bottom:0}
  .kus-dl-pair-folder__mapping td::before{content:attr(data-label);color:#64748b;font-size:10px;font-weight:800;line-height:1.35}
  .kus-dl-pair-folder__mapping select{min-width:0}
  .kus-dl-pair-folder__foot{grid-template-columns:1fr}
  .kus-dl-pair-folder__foot .kus-lp__btn{width:100%}
  .kus-dl-pair-row{grid-template-columns:30px minmax(0,1fr);gap:7px}
  .kus-dl-pair-side{grid-column:2}
  .kus-dl-pair-arrow{grid-column:2;min-height:24px;transform:rotate(90deg)}
  .kus-dl-pair-actions{grid-column:2;justify-content:stretch}
  .kus-dl-pair-actions .kus-lp__btn{flex:1}
  .kus-dl-pair-row__error{grid-column:2}
  .kus-dl-pair-side__fields{grid-template-columns:1fr}
  .kus-dl-pair-side__preview{grid-column:1}
  .kus-dl-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kus-dl-row__mobile-toggle{display:inline-flex;min-height:44px}
  .kus-dl-row__cols{display:none;grid-template-columns:1fr}
  .kus-dl-row__cols.is-expanded{display:grid}
  .kus-dl-contextbar{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:4px;padding:4px}
  .kus-dl-contextlane{padding:5px 6px}
  .kus-dl-contextlane--before{grid-column:1;grid-row:1}
  .kus-dl-contextlane--after{grid-column:3;grid-row:1}
  .kus-dl-contextlane__role{font-size:9px;letter-spacing:.04em}
  .kus-dl-contextlane__name{font-size:10px}
  .kus-dl-progress{grid-column:2;grid-row:1;min-width:42px;padding:2px 3px}
  .kus-dl-progress__current{font-size:15px}
  .kus-dl-progress__total{font-size:9px}
  .kus-dl-progress__label{margin-top:2px;font-size:9px;letter-spacing:0}
  .kus-dl-reviewbar{display:grid;grid-template-columns:1fr;padding:4px}
  .kus-dl-reviewbar__nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;gap:5px}
  .kus-dl-reviewbar__nav .kus-dl-navbtn{width:100%;min-width:0}
  .kus-dl-reviewbar__tools,.kus-dl-reviewbar__filters{display:none}
  .kus-dl-section>summary{align-items:flex-start;flex-wrap:wrap}
  .kus-dl-section__breakdown{width:100%;justify-content:flex-start;margin-left:20px}
  .kus-dl-row__head{grid-template-columns:minmax(0,1fr) auto;gap:8px}
  .kus-dl-row__action{justify-self:end;align-self:start}
  .kus-dl-pre::before{content:attr(data-side-label);display:block;margin:0 0 4px;color:#64748b;font:700 11px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.03em}
  .kus-dl-value__label+.kus-dl-pre::before{content:none;display:none}
  .kus-dl-table-scroll>.kus-dl-multi{white-space:nowrap}
  .kus-dl-batch-save{align-items:stretch;flex-direction:column}
  .kus-dl-batch-save .kus-lp__btn{width:100%;min-width:0}
}
@media(max-width:420px){
  .kus-dl-mode{display:grid;grid-template-columns:1fr 1fr;width:100%;box-sizing:border-box}
  .kus-dl-mode .kus-lp__btn{min-width:0;padding-inline:6px}
  .kus-dl-overview__direction{grid-template-columns:1fr;gap:5px}
  .kus-dl-side--target{text-align:left}
  .kus-dl-overview__arrow{transform:rotate(90deg);justify-self:start;margin-left:12px}
  .kus-dl-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kus-dl-step__header{gap:8px}
  .kus-dl-completion-row{grid-template-columns:1fr}
  .kus-dl-row{padding:11px 10px}
  .kus-dl-row__action{padding-inline:8px!important}
}
@media(prefers-reduced-motion:reduce){
  #kus-diff-lite.kus-lp{animation:none}
  #kus-diff-lite *{scroll-behavior:auto!important;transition:none!important}
  .kus-dl-section>summary::before{transition:none}
}
@media(prefers-contrast:more){
  .kus-dl-row,.kus-dl-section,.kus-dl-pre,.kus-dl-reviewbar,.kus-dl-contextbar,.kus-dl-contextlane{border-color:#334155}
  .kus-dl-row__raw,.kus-dl-filter-empty,.kus-dl-pre.empty{color:#1e293b}
}
@media(forced-colors:active){
  .kus-dl-row,.kus-dl-contextlane{forced-color-adjust:auto;border-left-width:5px}
  .kus-dl-filterchip,.kus-dl-value__toggle,.kus-dl-navbtn{border:1px solid ButtonText}
}
`;

function ensureResultStyles() {
  if (document.getElementById(RESULT_CSS_ID)) return;
  const st = document.createElement('style');
  st.id = RESULT_CSS_ID;
  st.textContent = RESULT_CSS;
  document.head.appendChild(st);
}

export interface DiffRow {
  sectionKey: string;
  section: string;
  type: string;
  severity?: string;
  path: string;
  label?: string;
  left?: any;
  right?: any;
  moved?: boolean;
  reasonSummary?: string;
  notationOnly?: boolean;
  emptyOnly?: boolean;
  _displayOnly?: boolean;
  _nonActionable?: boolean;
  _stateRenameNotice?: boolean;
  renameCandidate?: any;
  arrayKey?: string;
  arrayKeyValue?: any;
}

export interface DiffCache {
  rows: DiffRow[];
  fetchIssues: any[];
  partialIssues: any[];
  sourceBundle: any;
  targetBundle: any;
  scopes: string[];
  ignoreKeys: string;
  normalizationPresetState: any;
  comparedAt?: string | number;
  /** 差分または同一証跡の上限打ち切り情報（打ち切りなしなら null） */
  truncation: any;
}

export type LiteHtmlExportContentMode = 'diffOnly' | 'withCompared';

export function normalizeLiteHtmlExportContentMode(mode: unknown): LiteHtmlExportContentMode {
  return mode === 'withCompared' ? 'withCompared' : 'diffOnly';
}

export function getLiteHtmlExportContentLabel(mode: unknown): string {
  return normalizeLiteHtmlExportContentMode(mode) === 'withCompared'
    ? '比較設定込み（取扱注意）'
    : '差分行のみ（全設定は未収録）';
}

export function buildLiteDiffHtmlContext(
  cache: DiffCache,
  rows: DiffRow[],
  exportMode: string,
  exportLabel: string,
  exportContentMode: unknown = 'diffOnly'
) {
  const safeContentMode = normalizeLiteHtmlExportContentMode(exportContentMode);
  return {
    ...cache,
    rows,
    exportMode,
    exportLabel,
    exportContentMode: safeContentMode,
    exportContentLabel: getLiteHtmlExportContentLabel(safeContentMode)
  };
}

export function buildLiteDiffXlsxContext(
  cache: DiffCache,
  rows: DiffRow[],
  exportMode: string,
  exportLabel: string,
  filterDescription?: string
): DiffXlsxContext {
  return {
    audience: 'customer',
    rows,
    fetchIssues: cache.fetchIssues || [],
    partialIssues: cache.partialIssues || [],
    truncation: cache.truncation || null,
    sourceBundle: cache.sourceBundle,
    targetBundle: cache.targetBundle,
    scopes: cache.scopes,
    ignoreKeys: cache.ignoreKeys,
    normalizationPresetState: cache.normalizationPresetState || {},
    comparedAt: cache.comparedAt,
    exportMode,
    exportLabel,
    filterDescription: filterDescription || (exportMode === 'filtered'
      ? '画面で表示中の結果（詳細条件は未記録）'
      : 'フィルターなし（比較結果の全件）'),
    exportContentMode: 'diffOnly'
  };
}

export function buildLiteDiffFilterDescription(input: {
  section?: string;
  sectionLabel?: string;
  type?: string;
  typeLabel?: string;
  keyword?: string;
}): string {
  const exactValue = (value: string, label: string) => (
    label && label !== value ? `${label} [${value}]` : value
  );
  const section = String(input.section || '').trim();
  const type = String(input.type || '').trim();
  const keyword = String(input.keyword || '').trim();
  const parts = [
    section ? `セクション: ${exactValue(section, String(input.sectionLabel || '').trim())}` : '',
    type ? `変更種別: ${exactValue(type, String(input.typeLabel || '').trim())}` : '',
    keyword ? `検索: ${keyword}` : ''
  ].filter(Boolean);
  return parts.length
    ? `画面の絞り込み: ${parts.join(' / ')}`
    : '画面で表示中の結果（フィルターなし）';
}

interface DiffCounts {
  total: number;
  actual: number;
  added: number;
  removed: number;
  changed: number;
  moved: number;
  same: number;
  displayOnly: number;
}

interface MultiXlsxExportItem {
  label: string;
  cache: DiffCache;
}

function multiXlsxBatchSaveMarkup(count: number): string {
  if (count <= 0) return '';
  const label = `Excelをまとめて保存（${count}件・ZIP）`;
  return `<div class="kus-dl-batch-save"><span class="kus-dl-batch-save__text"><strong>Excelを一括保存</strong><small>成功した比較結果 ${count}件を、1つのZIPにまとめます。</small></span>`
    + `<button type="button" class="kus-lp__btn kus-lp__btn--primary" data-kus-dl-multi-xlsx-all aria-label="${esc(label)}">${esc(label)}</button></div>`;
}

const rowSearchCache = new WeakMap<object, string>();
const SEARCH_VALUE_TEXT_LIMIT = 8000;
const SEARCH_NESTED_STRING_LIMIT = 2000;

function safeDecodeRow(row: DiffRow): DecodedRow | null {
  try { return decodeRow(row); } catch { return null; }
}

export function summarizeLiteDiffRows(rows: DiffRow[]): DiffCounts {
  const counts: DiffCounts = { total: rows.length, actual: 0, added: 0, removed: 0, changed: 0, moved: 0, same: 0, displayOnly: 0 };
  for (const row of rows) {
    if (row._displayOnly) {
      counts.displayOnly += 1;
      continue;
    }
    if (row.type === 'same') {
      counts.same += 1;
      continue;
    }
    counts.actual += 1;
    if (row.type === 'added') counts.added += 1;
    else if (row.type === 'removed') counts.removed += 1;
    else {
      counts.changed += 1;
      if (row.moved) counts.moved += 1;
    }
  }
  return counts;
}

function contentChangedCount(counts: Pick<DiffCounts, 'changed' | 'moved'>): number {
  return Math.max(0, counts.changed - counts.moved);
}

export function isIncompleteLiteDiff(result: { fetchIssues?: any[]; partialIssues?: any[]; truncation?: any } | null | undefined): boolean {
  return hasIncompleteActualDiffTruncation(result?.truncation)
    || (result?.fetchIssues || []).length > 0
    || (result?.partialIssues || []).length > 0;
}

function rowSearchText(row: DiffRow): string {
  const cached = rowSearchCache.get(row);
  if (cached !== undefined) return cached;
  const safe = (v: any) => {
    try {
      if (v === undefined) return '';
      const text = JSON.stringify(v, (_key, value) => (
        typeof value === 'string' && value.length > SEARCH_NESTED_STRING_LIMIT
          ? `${value.slice(0, SEARCH_NESTED_STRING_LIMIT)}…`
          : value
      ));
      return String(text || '').slice(0, SEARCH_VALUE_TEXT_LIMIT);
    } catch {
      return String(v).slice(0, SEARCH_VALUE_TEXT_LIMIT);
    }
  };
  const decoded = safeDecodeRow(row);
  const text = [
    row.section || '', row.sectionKey || '', row.path || '', row.label || '', row.reasonSummary || '',
    safe(row.left), safe(row.right), decoded?.oneLineSummary || '', ...(decoded?.searchableTokens || [])
  ].join('\n').toLowerCase();
  rowSearchCache.set(row, text);
  return text;
}

export function buildLiteDiffRowKey(row: Partial<DiffRow>): string {
  const stateRenameIdentity = row._stateRenameNotice
    ? stableStringify({
      id: row.renameCandidate?.id || '',
      left: row.left,
      right: row.right
    })
    : '';
  const seed = [
    row.sectionKey || '',
    row.type || '',
    row.moved ? 'moved' : '',
    row.path || '',
    row.arrayKey || '',
    stableStringify(row.arrayKeyValue),
    stateRenameIdentity
  ].join('\u001f');
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `diff-${(hash >>> 0).toString(36)}`;
}

export function rowMatchesFilters(row: DiffRow, filters: { section: string; type: string; keyword: string }): boolean {
  if (filters.section && row.sectionKey !== filters.section) return false;
  if (filters.type) {
    if (filters.type === 'moved') {
      if (!row.moved) return false;
    } else if (filters.type === 'changed') {
      if (row.type !== 'changed' || row.moved) return false;
    } else if (row.type !== filters.type) {
      return false;
    }
  }
  if (filters.keyword && !rowSearchText(row).includes(filters.keyword)) return false;
  return true;
}

export function summarizeLiteIgnoreRules(text: string): { total: number; pathRules: number; wildcardRules: number; positionalRules: number; contextualRules: number } {
  const tokens = String(text || '').split(/[\n\r,、，;；]+/).map((token) => token.trim()).filter(Boolean);
  const unique = [...new Map(tokens.map((token) => {
    const exactPath = decodeExactIgnorePathRule(token);
    return [exactPath == null ? token.toLowerCase() : `path:${exactPath}`, token] as const;
  })).values()];
  const representedPath = (token: string) => decodeExactIgnorePathRule(token) ?? token;
  const isPathRule = (token: string) => {
    if (decodeExactIgnorePathRule(token) != null) return true;
    const normalized = token.toLowerCase();
    return normalized.includes('.') || normalized.includes('[') || SCOPE_OPTS.some(([scope]) => scope.toLowerCase() === normalized);
  };
  return {
    total: unique.length,
    pathRules: unique.filter(isPathRule).length,
    wildcardRules: unique.filter((token) => decodeExactIgnorePathRule(token) == null && token.includes('*')).length,
    positionalRules: unique.filter((token) => /\[\d+\]/.test(representedPath(token))).length,
    contextualRules: unique.filter((token) => isPathRule(token) || (decodeExactIgnorePathRule(token) == null && token.includes('*'))).length
  };
}

function rowDisplayIdentity(row: DiffRow, decoded: DecodedRow | null): { title: string; subtitle: string } {
  const path = String(row.path || '').trim();
  const semanticTitle = String(decoded?.oneLineSummary || decoded?.propLabel || '').trim();
  const reason = String(row.reasonSummary || '').trim();
  const label = String(row.label || '').trim();
  const leaf = path.split('.').filter(Boolean).pop()?.replace(/\[\d+\]$/g, '') || '';
  const leafLabels: Record<string, string> = {
    label: '表示名', name: '名称', code: 'フィールドコード', type: '種類', required: '必須設定',
    width: '横幅', height: '高さ', index: '並び順', filterCond: '絞り込み条件', assignee: '作業者',
    enabled: '有効／無効', entities: '対象ユーザー・組織', rights: '権限', fields: '配置フィールド'
  };
  const sectionLabel = SECTION_DEFS.find((definition) => definition.key === row.sectionKey)?.label || row.section || '設定';
  const fallbackTitle = label && label !== path
    ? label
    : `${sectionLabel}の${leafLabels[leaf] || (leaf ? `「${leaf}」` : '設定項目')}`;
  const title = semanticTitle || reason || fallbackTitle;
  const subtitleCandidates = [
    semanticTitle && reason !== semanticTitle ? reason : '',
    label && label !== path && label !== title ? label : ''
  ].filter(Boolean);
  return { title, subtitle: [...new Set(subtitleCandidates)].join(' · ') };
}

function rowColumnsHtml(
  row: DiffRow,
  useCharDiff: boolean,
  decoded: DecodedRow | null,
  rowKey: string,
  expandedValueKeys: ReadonlySet<string>
): { left: string; right: string } {
  const leftStr = decoded?.beforeText ?? stringifyRowValueForDiff(row.left, row.path);
  const rightStr = decoded?.afterText ?? stringifyRowValueForDiff(row.right, row.path);
  const pre = (value: string, className: string, label: string, side: 'before' | 'after', rawHtml = false, measuredValue = value) => {
    const valueKey = `${rowKey}:${side}`;
    const lineCount = Math.max(1, measuredValue.split(/\r?\n/).length);
    const isLong = lineCount > VALUE_PREVIEW_MAX_LINES || measuredValue.length > VALUE_PREVIEW_MAX_CHARS;
    const expanded = isLong && expandedValueKeys.has(valueKey);
    const id = `kus-dl-value-${rowKey}-${side}`;
    const visibleLabel = side === 'before' ? '比較元' : '比較先';
    const preHtml = `<span class="kus-dl-value__label">${visibleLabel}</span><pre id="${esc(id)}" class="kus-dl-pre ${className}" aria-label="${esc(label)}" data-side-label="${esc(label)}">${rawHtml ? value : esc(value)}</pre>`;
    if (!isLong) return `<div class="kus-dl-value">${preHtml}</div>`;
    const stateClass = expanded ? 'is-expanded' : 'is-collapsed';
    const actionLabel = expanded ? 'プレビューに戻す' : '全文を展開';
    return `<div class="kus-dl-value ${stateClass}" data-kus-dl-value-key="${esc(valueKey)}">${preHtml}` +
      `<div class="kus-dl-value__footer"><span>${lineCount}行 · ${measuredValue.length}文字</span>` +
      `<button type="button" class="kus-dl-value__toggle" data-kus-dl-value-toggle="${esc(valueKey)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="${esc(id)}">${actionLabel}</button></div></div>`;
  };
  if (row.type === 'added') {
    return {
      left: '',
      right: `<div class="kus-dl-presence" role="group" aria-label="比較先にのみ存在"><p><strong>比較先にのみ存在</strong><span>比較元にはありません</span></p>${pre(rightStr, 'add', '比較先の値', 'after')}</div>`
    };
  }
  if (row.type === 'removed') {
    return {
      left: `<div class="kus-dl-presence" role="group" aria-label="比較元にのみ存在"><p><strong>比較元にのみ存在</strong><span>比較先にはありません</span></p>${pre(leftStr, 'del', '比較元の値', 'before')}</div>`,
      right: ''
    };
  }
  if (row.type === 'same') {
    return { left: pre(leftStr, 'empty', '比較元の値', 'before'), right: pre('（同一）', 'empty', '比較先の値', 'after') };
  }
  // changed (or moved with both sides)
  if (useCharDiff) {
    const charDiff = buildCharDiffHtml(leftStr, rightStr);
    if (charDiff) {
      return { left: pre(charDiff.left, 'del', '比較元の値', 'before', true, leftStr), right: pre(charDiff.right, 'add', '比較先の値', 'after', true, rightStr) };
    }
  }
  return { left: pre(leftStr, 'del', '比較元の値', 'before'), right: pre(rightStr, 'add', '比較先の値', 'after') };
}

function displayBundleSide(bundle: any, fallbackRole: string): { name: string; environment: string } {
  const appId = String(bundle?.appId || '').trim();
  const appName = extractAppNameFromBundle(bundle);
  const name = appName && appId ? `${appName}（App ${appId}）` : (appName || (appId ? `App ${appId}` : fallbackRole));
  const guest = String(bundle?.guestId || '').trim();
  const environment = `${bundle?.preview ? 'プレビュー' : '運用'}${guest ? ` / ゲスト ${guest}` : ' / 通常スペース'}`;
  return { name, environment };
}

export function renderLiteDiffOverviewHtml(cache: DiffCache, options: { announce?: boolean } = {}): string {
  const counts = summarizeLiteDiffRows(cache.rows || []);
  const contentChanged = contentChangedCount(counts);
  const source = displayBundleSide(cache.sourceBundle, '比較元');
  const target = displayBundleSide(cache.targetBundle, '比較先');
  const fetchIssues = cache.fetchIssues || [];
  const partialIssues = cache.partialIssues || [];
  const ignoreRuleSummary = summarizeLiteIgnoreRules(cache.ignoreKeys || '');
  const normalizationLabels = Object.entries(DIFF_NORMALIZATION_PRESETS)
    .filter(([key]) => cache.normalizationPresetState?.[key] === true)
    .map(([, preset]) => preset.label);
  const truncated = !!cache.truncation?.truncated;
  const actualDiffTruncated = hasIncompleteActualDiffTruncation(cache.truncation);
  const incomplete = isIncompleteLiteDiff(cache);
  const hasNoticeOnlyChanges = counts.actual === 0 && counts.displayOnly > 0;
  const verdictClass = incomplete ? 'kus-dl-verdict--warn' : (counts.actual === 0 && !hasNoticeOnlyChanges ? 'kus-dl-verdict--same' : '');
  const verdictTitle = incomplete
    ? '比較結果は不完全です'
    : (hasNoticeOnlyChanges
      ? `状態名の変更候補が ${counts.displayOnly} 件見つかりました`
      : (counts.actual === 0 ? '選択した設定に差分はありません' : `差分が ${counts.actual} 件見つかりました`));
  const verdictText = incomplete
    ? (counts.actual ? `取得できた範囲では ${counts.actual} 件の差分があります。警告内容を確認してください。` : '差分なしとは判断できません。取得失敗または件数上限を解消して再比較してください。')
    : (hasNoticeOnlyChanges
      ? '参照先の連動変更をまとめた表示用通知です。削除・追加としては数えていません。内容を確認してください。'
      : (counts.actual === 0
        ? `比較元と比較先は一致しています${counts.same ? `（同一 ${counts.same} 件）` : ''}。`
        : `追加 ${counts.added} / 削除 ${counts.removed} / 内容変更 ${contentChanged}${counts.moved ? ` / 移動 ${counts.moved}` : ''}`));
  const metric = (type: string, label: string, hint: string, value: number) =>
    value > 0 ? `<button type="button" class="kus-dl-metric" data-kus-dl-type-filter="${esc(type)}" aria-label="${esc(label)} ${value}件を表示">` +
      `<span class="kus-dl-metric__num">${value}</span><span class="kus-dl-metric__label">${esc(label)}</span><span class="kus-dl-metric__hint">${esc(hint)}</span></button>`
      : '';

  const bySection = new Map<string, DiffRow[]>();
  for (const row of cache.rows || []) {
    const key = row.sectionKey || '(その他)';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(row);
  }
  const orderedKeys: string[] = [];
  for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
  for (const key of bySection.keys()) if (!orderedKeys.includes(key)) orderedKeys.push(key);
  const sectionButtons = orderedKeys.map((key) => {
    const sectionCounts = summarizeLiteDiffRows(bySection.get(key) || []);
    const label = SECTION_DEFS.find((def) => def.key === key)?.label || key;
    const countLabel = sectionCounts.actual
      ? `${sectionCounts.actual}件`
      : (sectionCounts.displayOnly ? `変更候補 ${sectionCounts.displayOnly}件` : `一致 ${sectionCounts.same}件`);
    return `<button type="button" class="kus-dl-section-jump" data-kus-dl-section-filter="${esc(key)}" aria-label="${esc(`${label}で結果を絞り込む（${countLabel}）`)}">${esc(label)} ${esc(countLabel)}</button>`;
  }).join('');

  const alerts: string[] = [];
  if (actualDiffTruncated) {
    const truncationSections = cache.truncation?.sections || [];
    const sections = truncationSections.map((item: any) => item?.section || item?.sectionKey).filter(Boolean);
    const unscanned = truncationSections.filter((item: any) => item?.scanned === false)
      .map((item: any) => item?.section || item?.sectionKey).filter(Boolean);
    const partial = truncationSections.filter((item: any) => item?.scanStatus === 'partial' || item?.partiallyScanned === true)
      .map((item: any) => item?.section || item?.sectionKey).filter(Boolean);
    const sectionText = sections.length ? ` 対象: ${sections.join('、')}` : '';
    const unscannedText = unscanned.length ? ` 後続の ${unscanned.join('、')} は未走査で、未検出件数も不明です。` : '';
    const partialText = partial.length ? ` ${partial.join('、')} は部分走査で、表示件数より多い差分がある可能性があります。` : '';
    alerts.push(`差分上限 ${Number(cache.truncation?.diffLimit || 0).toLocaleString()} 件に到達したため、結果の一部が表示されていません。${partialText}${unscannedText}${sectionText}`);
  } else if (truncated && Number(cache.truncation?.droppedSame || 0) > 0) {
    alerts.push(`同一証跡は上限 ${Number(cache.truncation?.sameLimit || 0).toLocaleString()} 件まで表示し、${Number(cache.truncation?.droppedSame || 0).toLocaleString()} 件を省略しました。実差分の検出結果は完全です。`);
  }
  if (fetchIssues.length) {
    const sections = [...new Set(fetchIssues.map((item: any) => item?.section || item?.sectionKey).filter(Boolean))];
    const sideLabel: Record<string, string> = { source: '比較元', target: '比較先', both: '両側' };
    const details = fetchIssues.slice(0, 3).map((item: any) => {
      const section = item?.section || item?.sectionKey || '不明なセクション';
      const side = sideLabel[String(item?.side || '')] || '取得元不明';
      const message = String(item?.message || item?.sourceError || item?.targetError || '取得できませんでした').replace(/\s+/g, ' ').slice(0, 180);
      return `${section}（${side}）: ${message}`;
    });
    const remainder = fetchIssues.length > details.length ? ` / ほか ${fetchIssues.length - details.length} 件` : '';
    alerts.push(`設定の取得に ${fetchIssues.length} 件失敗しました。${sections.length ? ` 対象: ${sections.join('、')}。` : ''} ${details.join(' / ')}${remainder}`);
  }
  if (partialIssues.length) {
    const sideLabel: Record<string, string> = { source: '比較元', target: '比較先', both: '両側' };
    const details = partialIssues.slice(0, 3).map((item: any) => {
      const section = item?.section || item?.sectionKey || '不明なセクション';
      const side = sideLabel[String(item?.side || '')] || '取得元不明';
      const files = (item?.files || []).slice(0, 3).map((file: any) => file?.fileName || file?.fileKey).filter(Boolean);
      return `${section}（${side}）${files.length ? `: ${files.join('、')}` : ''}`;
    });
    const remainder = partialIssues.length > details.length ? ` / ほか ${partialIssues.length - details.length} 件` : '';
    alerts.push(`本文サイズまたは形式の制約により ${partialIssues.length} 件を fileKey で比較しました。本文内容は未検証です。${details.join(' / ')}${remainder}`);
  }

  const announceAttrs = options.announce === false ? '' : ' role="status"';
  const alertAttrs = options.announce === false ? '' : ' role="alert"';
  const completeness = incomplete ? 'incomplete' : 'complete';
  const alertsHtml = alerts.map((message) => `<div class="kus-dl-alert"${alertAttrs}>${esc(message)}</div>`).join('');
  const ignoreCondition = ignoreRuleSummary.total
    ? `無視ルール ${ignoreRuleSummary.total}件を適用した後の結果です。ルールに一致した設定差分は一覧に含まれません${ignoreRuleSummary.contextualRules ? `（完全パス/パターン ${ignoreRuleSummary.contextualRules}件）` : ''}。`
    : '無視ルールは適用していません。';
  const normalizationCondition = normalizationLabels.length
    ? `正規化 ${normalizationLabels.length}件を適用しています（${normalizationLabels.join('、')}）。`
    : '正規化は適用していません。';
  return `<section id="kus-dl-overview" class="kus-dl-overview" data-kus-dl-overview tabindex="-1" aria-label="比較結果サマリー">` +
    `<div class="kus-dl-overview__direction"><div class="kus-dl-side"><span class="kus-dl-side__role">比較元</span><span class="kus-dl-side__name" title="${esc(source.name)}">${esc(source.name)}</span><span class="kus-dl-side__env">${esc(source.environment)}</span></div>` +
    `<span class="kus-dl-overview__arrow" aria-label="から">→</span>` +
    `<div class="kus-dl-side kus-dl-side--target"><span class="kus-dl-side__role">比較先</span><span class="kus-dl-side__name" title="${esc(target.name)}">${esc(target.name)}</span><span class="kus-dl-side__env">${esc(target.environment)}</span></div></div>` +
    `<div class="kus-dl-verdict ${verdictClass}" data-kus-dl-completeness="${completeness}"${announceAttrs}><span class="kus-dl-verdict__eyebrow">${incomplete ? '確認が必要' : '比較完了'}</span><strong>${esc(verdictTitle)}</strong><span>${esc(verdictText)}</span></div>` +
    alertsHtml +
    `<div class="kus-dl-metrics"><div class="kus-dl-metric"><span class="kus-dl-metric__num">${counts.actual}</span><span class="kus-dl-metric__label">差分</span><span class="kus-dl-metric__hint">同一を除く</span></div>` +
      metric('added', '比較先のみ', '追加として検出', counts.added) + metric('removed', '比較元のみ', '削除として検出', counts.removed) +
      metric('changed', '内容が異なる', '変更として検出', contentChanged) + metric('moved', '並び順', '移動として検出', counts.moved) + '</div>' +
    (sectionButtons ? `<div class="kus-dl-section-nav"><span class="kus-dl-section-nav__label">セクションで絞り込む</span>${sectionButtons}</div>` : '') +
    `<div class="kus-dl-alert kus-dl-conditions" role="note"><strong>適用した比較条件</strong><span>${esc(ignoreCondition)} ${esc(normalizationCondition)}</span></div>` +
    '<div class="kus-dl-legend">「比較先のみ」は追加、「比較元のみ」は削除として検出しています。比較方向は上の矢印で確認できます。</div></section>';
}

export interface LiteRowsRenderOptions {
  collapsedSections?: ReadonlySet<string>;
  currentRowKey?: string;
  expandedValueKeys?: ReadonlySet<string>;
  expandedRowKeys?: ReadonlySet<string>;
}

export function renderRowsHtml(
  rows: DiffRow[],
  useCharDiff: boolean,
  summary: string,
  allFilteredRows: DiffRow[] = rows,
  options: LiteRowsRenderOptions = {}
): string {
  if (!rows.length) return `<div class="kus-dl-empty">該当する差分はありません${summary ? ` — ${summary}` : ''}</div>`;
  const bySection = new Map<string, DiffRow[]>();
  const allBySection = new Map<string, DiffRow[]>();
  for (const r of rows) {
    const key = r.sectionKey || '(その他)';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(r);
  }
  for (const r of allFilteredRows) {
    const key = r.sectionKey || '(その他)';
    if (!allBySection.has(key)) allBySection.set(key, []);
    allBySection.get(key)!.push(r);
  }
  // SECTION_DEFS 順を尊重
  const orderedKeys: string[] = [];
  for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
  for (const k of bySection.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);
  const expandedValueKeys = options.expandedValueKeys || new Set<string>();

  const parts: string[] = [];
  parts.push(`<div class="kus-dl-result__summary">${summary}</div>`);
  for (const k of orderedKeys) {
    const list = bySection.get(k)!;
    const allInSection = allBySection.get(k) || list;
    const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
    const sectionCounts = summarizeLiteDiffRows(allInSection);
    const sectionContentChanged = contentChangedCount(sectionCounts);
    const breakdown = sectionCounts.actual
      ? [
        ['added', '追加', sectionCounts.added],
        ['removed', '削除', sectionCounts.removed],
        ['changed', '内容変更', sectionContentChanged],
        ['moved', '移動', sectionCounts.moved]
      ].filter((entry) => Number(entry[2]) > 0)
        .map(([tone, statLabel, value]) => `<span class="kus-dl-section__stat kus-dl-section__stat--${tone}">${statLabel} ${value}</span>`).join('')
      : `<span class="kus-dl-section__stat">${sectionCounts.same ? `一致 ${sectionCounts.same}` : `変更候補 ${sectionCounts.displayOnly}`}</span>`;
    const countLabel = list.length === allInSection.length ? `${list.length}件` : `${list.length} / ${allInSection.length}件表示`;
    const collapsed = !!options.collapsedSections?.has(k);
    parts.push(`<details class="kus-dl-section" data-kus-dl-section-key="${esc(k)}"${collapsed ? '' : ' open'}><summary><span class="kus-dl-section__heading"><span class="kus-dl-section__label">${esc(label)}</span><span class="kus-dl-section__count">${countLabel}</span></span><span class="kus-dl-section__breakdown" aria-label="差分内訳">${breakdown}</span></summary><div class="kus-dl-section__body">`);
    for (const r of list) {
      const decoded = safeDecodeRow(r);
      const rowKey = buildLiteDiffRowKey(r);
      const cols = rowColumnsHtml(r, useCharDiff, decoded, rowKey, expandedValueKeys);
      const identity = rowDisplayIdentity(r, decoded);
      const rowValuesExpanded = !!options.expandedRowKeys?.has(rowKey);
      const rowValuesId = `kus-dl-row-values-${rowKey}`;
      const current = rowKey === options.currentRowKey;
      const typeKey = r.moved ? 'moved' : (r.type || 'same');
      const factLabel = FACT_LABEL[typeKey] || TYPE_LABEL[typeKey] || typeKey;
      const typeLabel = TYPE_LABEL[typeKey] || typeKey;
      const typeBadge = `<span class="kus-dl-badge kus-dl-badge--${esc(typeKey)}" aria-label="変更種別: ${esc(typeLabel)}。状態: ${esc(factLabel)}"><span class="kus-dl-badge__type">${esc(typeLabel)}</span><span class="kus-dl-badge__fact">${esc(factLabel)}</span></span>`;
      const flagHtml = [
        r.notationOnly ? '<span class="kus-dl-flag" title="型・表記だけが異なり、値としては同じです（例: &quot;100&quot; と 100）">表記のみ</span>' : '',
        r.emptyOnly ? '<span class="kus-dl-flag" title="空文字・null・空配列など、空値同士の差です">空値ゆれ</span>' : ''
      ].join('');
      const contextHtml = decoded
        ? `<div class="kus-dl-row__context">${decoded.whereChips.map((chip) => `<span class="kus-dl-row__chip">${esc(`${chip.icon || ''}${chip.icon ? ' ' : ''}${chip.label}`)}</span>`).join('')}</div>`
        : '';
      const technicalHtml = r.path
        ? `<details class="kus-dl-row__technical" data-kus-dl-technical><summary>技術情報</summary><code class="kus-dl-row__raw"><span>内部パス</span>${esc(r.path)}</code></details>`
        : '';
      const positionalPath = /\[\d+\]/.test(String(r.path || ''));
      const ignoreAction = r.type !== 'same' && r.path
        ? (positionalPath
          ? '<span class="kus-dl-flag" title="並び替え後に別の対象を指す可能性があるため、自動で無視ルールには追加できません">並び順に依存（自動除外不可）</span>'
          : `<button type="button" class="kus-dl-row__action" data-kus-dl-ignore-path="${esc(r.path)}" title="この項目だけを次回比較から除外" aria-label="${esc(`${identity.title}を次回の比較から除外（無視ルールへ追加）`)}">次回から除外</button>`)
        : '';
      const rowValuesAction = rowValuesExpanded ? '閉じる' : '確認';
      parts.push(`<article class="kus-dl-row kus-dl-row--${esc(typeKey)}${current ? ' is-current' : ''}" data-kus-dl-row-key="${esc(rowKey)}" tabindex="-1"${current ? ' aria-current="true"' : ''} aria-label="${esc(`${typeLabel}・${factLabel}: ${identity.title}`)}"><div class="kus-dl-row__head"><div class="kus-dl-row__identity"><div class="kus-dl-row__headline">${typeBadge}<span class="kus-dl-row__title">${esc(identity.title)}</span>${flagHtml}</div>${identity.subtitle ? `<div class="kus-dl-row__subtitle">${esc(identity.subtitle)}</div>` : ''}</div>${ignoreAction}</div>${contextHtml}${technicalHtml}` +
        `<button type="button" class="kus-dl-row__mobile-toggle" data-kus-dl-mobile-row-toggle="${esc(rowKey)}" aria-expanded="${rowValuesExpanded ? 'true' : 'false'}" aria-controls="${esc(rowValuesId)}" aria-label="${esc(`${identity.title}の比較元・比較先の値を${rowValuesAction}`)}">比較元・比較先の値を${rowValuesAction}</button>` +
        `<div id="${esc(rowValuesId)}" class="kus-dl-row__cols${rowValuesExpanded ? ' is-expanded' : ''}">${cols.left}${cols.right}</div></article>`);
    }
    parts.push('</div></details>');
  }
  return parts.join('');
}

export function mountDiffLitePanel(runDiffStandalone: (opts: any) => Promise<any>) {
  ensureResultStyles();
  const panel: LitePanelHandle = createLitePanel({
    id: 'kus-diff-lite',
    title: '差分比較',
    subtitle: 'アプリ設定を1件ずつ、1対多、または複数の1対1ペアで比較し、HTMLとExcelで確認',
    accent: 'diff',
    badges: [{ label: 'Lite' }, { label: '出力対応' }],
    hint: '1対1比較と1対多比較は完了時にレビュー用HTMLを自動保存します。ペア一括比較は結果行から個別保存でき、成功したExcelはZIPでまとめて保存できます。Excelには差分値と取得不完全時のエラー等の原文が含まれるため、共有前に内容を確認してください。',
    wide: true
  });
  panel.status.setAttribute('role', 'status');
  panel.status.setAttribute('aria-live', 'polite');
  panel.status.setAttribute('aria-atomic', 'true');
  panel.root.classList.add('kus-dl-workspace');

  // ---- 1. 比較対象 ----
  const srcApp = makeInput({ placeholder: 'アプリID', width: 'id', ariaLabel: '比較元アプリID' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', width: 'guest', ariaLabel: '比較元ゲストスペースID' });
  const srcPrev = makeCheck({ label: 'プレビューで取得' });
  const tgtApp = makeInput({ placeholder: 'アプリID（カンマ区切り可）', width: 'medium', ariaLabel: '比較先1アプリID' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', width: 'guest', ariaLabel: '比較先1ゲストスペースID' });
  const tgtPrev = makeCheck({ label: 'プレビューで取得' });
  srcPrev.checkbox.setAttribute('aria-label', '比較元をプレビュー環境から取得');
  tgtPrev.checkbox.setAttribute('aria-label', '比較先をプレビュー環境から取得');
  type ComparisonMode = 'single' | 'multi' | 'pairs';
  let comparisonMode: ComparisonMode = 'single';
  let completionReady = false;
  let applyComparisonMode: (mode: ComparisonMode) => void = (mode) => { comparisonMode = mode; };

  interface TargetRowEntry { app: HTMLInputElement; guest: HTMLInputElement; row: HTMLElement; name: HTMLElement; appName: string }
  const cardApp = makeCard({ title: '比較するアプリ', number: 1 });
  cardApp.card.classList.add('kus-dl-target-card');
  const makeTargetName = () => {
    const el = document.createElement('div');
    el.className = 'kus-dl-target-name kus-dl-target-name--empty';
    return el;
  };
  const makeTargetField = (app: HTMLInputElement, name: HTMLElement) => {
    const wrap = document.createElement('div');
    wrap.className = 'kus-dl-target-field';
    wrap.appendChild(app);
    wrap.appendChild(name);
    return wrap;
  };
  const setTargetName = (entry: TargetRowEntry, appName: string) => {
    entry.appName = String(appName || '').trim();
    entry.name.textContent = entry.appName;
    entry.name.title = entry.appName ? `アプリ名: ${entry.appName}` : '';
    entry.name.classList.toggle('kus-dl-target-name--empty', !entry.appName);
  };
  const srcName = makeTargetName();
  let sourceAppName = '';
  const setSourceName = (appName: string) => {
    sourceAppName = String(appName || '').trim();
    srcName.textContent = sourceAppName;
    srcName.title = sourceAppName ? `アプリ名: ${sourceAppName}` : '';
    srcName.classList.toggle('kus-dl-target-name--empty', !sourceAppName);
  };
  const sourceRow = makeRow([makeTargetField(srcApp, srcName), srcGuest, srcPrev.label], { label: 'アプリID・環境' });
  const tgtName = makeTargetName();
  const firstTargetRow = makeRow([makeTargetField(tgtApp, tgtName), tgtGuest, tgtPrev.label], { label: 'アプリID・環境' });
  const modeSwitch = document.createElement('div');
  modeSwitch.className = 'kus-dl-mode';
  modeSwitch.setAttribute('role', 'group');
  modeSwitch.setAttribute('aria-label', '比較方法');
  const singleModeBtn = makeButton('1対1比較', 'sub');
  singleModeBtn.dataset.kusDlMode = 'single';
  const multiModeBtn = makeButton('1対多比較', 'sub');
  multiModeBtn.dataset.kusDlMode = 'multi';
  const pairModeBtn = makeButton('ペア一括比較', 'sub');
  pairModeBtn.dataset.kusDlMode = 'pairs';
  modeSwitch.append(singleModeBtn, multiModeBtn, pairModeBtn);
  cardApp.body.appendChild(modeSwitch);

  const directionGrid = document.createElement('div');
  directionGrid.className = 'kus-dl-direction-grid';
  const sourceCard = document.createElement('section');
  sourceCard.className = 'kus-dl-app-card kus-dl-app-card--source';
  sourceCard.setAttribute('aria-labelledby', 'kus-dl-source-title');
  sourceCard.innerHTML = '<p class="kus-dl-app-card__role">比較元</p><h3 id="kus-dl-source-title">基準にするアプリ</h3><p class="kus-dl-app-card__help">変更前として扱う設定です</p>';
  sourceCard.appendChild(sourceRow);
  const targetCard = document.createElement('section');
  targetCard.className = 'kus-dl-app-card kus-dl-app-card--target';
  targetCard.setAttribute('aria-labelledby', 'kus-dl-target-title');
  targetCard.innerHTML = '<p class="kus-dl-app-card__role">比較先</p><h3 id="kus-dl-target-title">確認するアプリ</h3><p class="kus-dl-app-card__help">変更後として扱う設定です</p>';
  targetCard.appendChild(firstTargetRow);
  const swapBtn = makeButton('比較方向を入れ替え', 'ghost', { icon: '⇄' });
  swapBtn.classList.add('kus-dl-swap');
  swapBtn.dataset.kusDlSwap = '';
  directionGrid.append(sourceCard, swapBtn, targetCard);
  cardApp.body.appendChild(directionGrid);
  const targetList = document.createElement('div');
  targetList.className = 'kus-dl-target-list';
  const targetRows: TargetRowEntry[] = [{ app: tgtApp, guest: tgtGuest, row: firstTargetRow, name: tgtName, appName: '' }];
  const relabelTargetRows = () => targetRows.forEach((r, idx) => {
    const label = r.row?.querySelector?.('.kus-lp__label') as HTMLElement | null;
    if (label) label.textContent = `比較先 ${idx + 1}`;
    r.app.setAttribute('aria-label', `比較先${idx + 1}アプリID`);
    r.guest.setAttribute('aria-label', `比較先${idx + 1}ゲストスペースID`);
  });
  const addTargetRow = (appId = '', guestId = '', appName = '') => {
    const rowNumber = targetRows.length + 1;
    const app = makeInput({ placeholder: 'アプリID（カンマ区切り可）', width: 'medium', ariaLabel: `比較先${rowNumber}アプリID` });
    const guest = makeInput({ placeholder: 'ゲストID', width: 'guest', ariaLabel: `比較先${rowNumber}ゲストスペースID` });
    const name = makeTargetName();
    app.value = appId;
    guest.value = guestId;
    const copy = makeButton('行コピー', 'sub');
    const remove = makeButton('削除', 'ghost');
    const row = makeRow([makeTargetField(app, name), guest, copy, remove], { label: `比較先 ${targetRows.length + 1}` });
    const entry: TargetRowEntry = { app, guest, row, name, appName: '' };
    setTargetName(entry, appName);
    copy.addEventListener('click', async () => {
      const text = [`比較先 ${targetRows.indexOf(entry) + 1}`, app.value.trim(), guest.value.trim()].join('\t');
      try { await navigator.clipboard.writeText(text); panel.setStatus('比較先行をコピーしました', 'info'); } catch { panel.setStatus(text, 'info'); }
    });
    remove.addEventListener('click', () => {
      row.remove();
      const idx = targetRows.indexOf(entry);
      if (idx >= 0) targetRows.splice(idx, 1);
      relabelTargetRows();
      invalidateResultAfterAppSelectionChange();
    });
    app.addEventListener('input', () => {
      if (entry.appName) setTargetName(entry, '');
      invalidateResultAfterAppSelectionChange();
    });
    guest.addEventListener('input', invalidateResultAfterAppSelectionChange);
    targetRows.push(entry);
    targetList.appendChild(row);
    attachTargetSplit(entry);
    return entry;
  };
  // 比較先のアプリID欄に「100, 120, 130」のようにカンマ区切りで入力したら比較先行へ分割する
  const attachTargetSplit = (entry: TargetRowEntry) => {
    const distribute = () => {
      const raw = entry.app.value;
      if (!/[,、\s]/.test(raw)) return;
      const tokens = raw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length <= 1) { entry.app.value = tokens[0] || ''; setTargetName(entry, ''); return; }
      entry.app.value = tokens[0];
      setTargetName(entry, '');
      const guestVal = entry.guest.value.trim();
      for (let k = 1; k < tokens.length; k += 1) addTargetRow(tokens[k], guestVal);
      invalidateResultAfterAppSelectionChange();
      applyComparisonMode('multi');
      panel.setStatus(`比較先を ${tokens.length} 件に分割しました`, 'info');
    };
    entry.app.addEventListener('change', distribute);
    entry.app.addEventListener('paste', (ev: ClipboardEvent) => {
      const text = ev.clipboardData?.getData('text') || '';
      if (!/[,、\s]/.test(text)) return;
      ev.preventDefault();
      entry.app.value = [entry.app.value.trim(), text].filter(Boolean).join(',');
      distribute();
    });
  };
  srcApp.addEventListener('input', () => {
    if (sourceAppName) setSourceName('');
    invalidateResultAfterAppSelectionChange();
  });
  tgtApp.addEventListener('input', () => {
    if (targetRows[0]?.appName) setTargetName(targetRows[0], '');
    invalidateResultAfterAppSelectionChange();
  });
  srcGuest.addEventListener('input', invalidateResultAfterAppSelectionChange);
  tgtGuest.addEventListener('input', invalidateResultAfterAppSelectionChange);
  srcPrev.checkbox.addEventListener('change', invalidateResultAfterAppSelectionChange);
  tgtPrev.checkbox.addEventListener('change', invalidateResultAfterAppSelectionChange);
  attachTargetSplit(targetRows[0]);
  const addTargetBtn = makeButton('比較先行を追加', 'sub');
  addTargetBtn.addEventListener('click', () => { addTargetRow(); applyComparisonMode('multi'); panel.setStatus('比較先行を追加しました', 'info'); });
  const copyFirstBtn = makeButton('比較先1を複製', 'sub');
  copyFirstBtn.addEventListener('click', () => { addTargetRow(tgtApp.value.trim(), tgtGuest.value.trim(), targetRows[0]?.appName || ''); applyComparisonMode('multi'); });
  const multiControls = makeRow([addTargetBtn, copyFirstBtn], { label: '比較先を増やす' });
  multiControls.classList.add('kus-dl-multi-controls');
  targetCard.appendChild(multiControls);
  const singleAppSearch = createAppSearchControl(panel, {
    targets: [
      { label: '比較元', apply: (id, name, guestId) => {
        if (diffRunActive) return { message: '比較を実行中です。完了してからアプリを設定してください', tone: 'warn' as const };
        srcApp.value = id;
        setSourceName(name);
        if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId;
        const invalidated = invalidateResultAfterAppSelectionChange();
        return { message: invalidated
          ? '比較元を変更したため、前回の結果を無効にしました。再比較してください'
          : `App ${id} を比較元へ設定しました`, tone: invalidated ? 'warn' as const : 'ok' as const };
      } },
      { label: '比較先', apply: (id, name, guestId) => {
        if (diffRunActive) return { message: '比較を実行中です。完了してからアプリを設定してください', tone: 'warn' as const };
        const empty = targetRows.find((r) => !r.app.value.trim()) || addTargetRow();
        empty.app.value = id;
        setTargetName(empty, name);
        if (guestId && !empty.guest.value.trim()) empty.guest.value = guestId;
        const invalidated = invalidateResultAfterAppSelectionChange();
        return { message: invalidated
          ? '比較先を変更したため、前回の結果を無効にしました。再比較してください'
          : `App ${id} を比較先へ設定しました`, tone: invalidated ? 'warn' as const : 'ok' as const };
      } }
    ]
  });
  cardApp.body.appendChild(singleAppSearch);
  targetCard.appendChild(targetList);

  interface PairEndpointEntry {
    app: HTMLInputElement;
    guest: HTMLInputElement;
    preview: ReturnType<typeof makeCheck>;
    name: HTMLElement;
    appName: string;
    side: HTMLElement;
    folderFile: HTMLElement;
    folderBundle: DiffBatchFolderImportedBundle | null;
  }
  interface PairRowEntry {
    row: HTMLElement;
    number: HTMLElement;
    source: PairEndpointEntry;
    target: PairEndpointEntry;
    error: HTMLElement;
    match: HTMLElement;
    duplicate: HTMLButtonElement;
    swap: HTMLButtonElement;
    remove: HTMLButtonElement;
  }

  const MAX_PAIR_ROWS = DEFAULT_MAX_DIFF_BATCH_PAIRS;
  const pairEditor = document.createElement('section');
  pairEditor.className = 'kus-dl-pair-editor';
  pairEditor.hidden = true;
  pairEditor.setAttribute('aria-labelledby', 'kus-dl-pair-editor-title');
  const pairIntro = document.createElement('div');
  pairIntro.className = 'kus-dl-pair-editor__intro';
  pairIntro.innerHTML = '<div><strong id="kus-dl-pair-editor-title">複数の1対1ペアを登録</strong><span>各行の比較元と比較先を1組として、登録順に比較します。同じ接続先は比較元・比較先で各1回だけ登録できます。共通の比較元から複数先を比べる場合は「1対多比較」を使います。</span></div>';
  const pairCount = document.createElement('span');
  pairCount.className = 'kus-dl-pair-count';
  pairCount.setAttribute('aria-live', 'polite');
  pairIntro.appendChild(pairCount);
  const pairList = document.createElement('div');
  pairList.className = 'kus-dl-pair-list';
  pairList.dataset.kusDlPairList = '';
  const pairRows: PairRowEntry[] = [];

  const makePairEndpoint = (side: 'source' | 'target', rowNumber: number): PairEndpointEntry => {
    const app = makeInput({ placeholder: 'アプリID', width: 'medium', ariaLabel: `ペア${rowNumber}${side === 'source' ? '比較元' : '比較先'}アプリID` });
    const guest = makeInput({ placeholder: 'ゲストID', width: 'guest', ariaLabel: `ペア${rowNumber}${side === 'source' ? '比較元' : '比較先'}ゲストスペースID` });
    app.inputMode = 'numeric';
    guest.inputMode = 'numeric';
    const preview = makeCheck({ label: 'プレビューで取得' });
    preview.checkbox.setAttribute('aria-label', `ペア${rowNumber}${side === 'source' ? '比較元' : '比較先'}をプレビュー環境から取得`);
    preview.label.classList.add('kus-dl-pair-side__preview');
    const name = makeTargetName();
    const folderFile = document.createElement('span');
    folderFile.className = 'kus-dl-pair-side__file';
    folderFile.hidden = true;
    const endpointSide = document.createElement('section');
    endpointSide.className = `kus-dl-pair-side kus-dl-pair-side--${side}`;
    const role = document.createElement('span');
    role.className = 'kus-dl-pair-side__role';
    role.textContent = side === 'source' ? '比較元（変更前）' : '比較先（変更後）';
    const fields = document.createElement('div');
    fields.className = 'kus-dl-pair-side__fields';
    const appField = makeTargetField(app, name);
    const appFieldLabel = document.createElement('span');
    appFieldLabel.className = 'kus-dl-pair-field-label';
    appFieldLabel.textContent = 'App ID';
    appField.prepend(appFieldLabel);
    const guestField = document.createElement('div');
    guestField.className = 'kus-dl-pair-guest-field';
    const guestFieldLabel = document.createElement('span');
    guestFieldLabel.className = 'kus-dl-pair-field-label';
    guestFieldLabel.textContent = 'Guest ID（任意）';
    guestField.append(guestFieldLabel, guest);
    fields.append(appField, guestField, preview.label);
    endpointSide.append(role, fields, folderFile);
    return { app, guest, preview, name, appName: '', side: endpointSide, folderFile, folderBundle: null };
  };

  const setPairEndpointName = (endpoint: PairEndpointEntry, appName: string) => {
    endpoint.appName = String(appName || '').trim();
    endpoint.name.textContent = endpoint.appName;
    endpoint.name.title = endpoint.appName ? `アプリ名: ${endpoint.appName}` : '';
    endpoint.name.classList.toggle('kus-dl-target-name--empty', !endpoint.appName);
  };

  const setPairEndpointFolderBundle = (
    endpoint: PairEndpointEntry,
    imported: DiffBatchFolderImportedBundle | null,
    options: { clearValues?: boolean } = {}
  ) => {
    endpoint.folderBundle = imported;
    endpoint.side.classList.toggle('is-folder-imported', !!imported);
    endpoint.app.readOnly = !!imported;
    endpoint.guest.readOnly = !!imported;
    endpoint.preview.checkbox.disabled = !!imported;
    endpoint.folderFile.hidden = !imported;
    endpoint.folderFile.textContent = imported ? `設定JSON: ${imported.relativePath}` : '';
    endpoint.folderFile.title = imported?.relativePath || '';
    if (imported) {
      endpoint.app.value = imported.appId;
      endpoint.guest.value = imported.guestId;
      endpoint.preview.checkbox.checked = imported.preview;
      setPairEndpointName(endpoint, imported.appName);
    } else if (options.clearValues) {
      endpoint.app.value = '';
      endpoint.guest.value = '';
      endpoint.preview.checkbox.checked = false;
      setPairEndpointName(endpoint, '');
    }
  };

  const pairRowIsBlank = (entry: PairRowEntry) => !(
    entry.source.app.value.trim() || entry.source.guest.value.trim() || entry.source.preview.checkbox.checked ||
    entry.target.app.value.trim() || entry.target.guest.value.trim() || entry.target.preview.checkbox.checked
  );

  const clearPairRowValidation = (entry: PairRowEntry) => {
    entry.row.classList.remove('is-invalid');
    entry.error.hidden = true;
    entry.error.textContent = '';
    [entry.source.app, entry.source.guest, entry.target.app, entry.target.guest].forEach((input) => {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    });
  };
  const clearPairValidation = () => pairRows.forEach(clearPairRowValidation);

  const relabelPairRows = () => {
    pairRows.forEach((entry, index) => {
      const rowNumber = index + 1;
      entry.row.dataset.kusDlPairRow = String(rowNumber);
      entry.number.textContent = String(rowNumber);
      entry.number.setAttribute('aria-label', `ペア ${rowNumber}`);
      entry.source.app.setAttribute('aria-label', `ペア${rowNumber}比較元アプリID`);
      entry.source.guest.setAttribute('aria-label', `ペア${rowNumber}比較元ゲストスペースID`);
      entry.source.preview.checkbox.setAttribute('aria-label', `ペア${rowNumber}比較元をプレビュー環境から取得`);
      entry.target.app.setAttribute('aria-label', `ペア${rowNumber}比較先アプリID`);
      entry.target.guest.setAttribute('aria-label', `ペア${rowNumber}比較先ゲストスペースID`);
      entry.target.preview.checkbox.setAttribute('aria-label', `ペア${rowNumber}比較先をプレビュー環境から取得`);
      entry.error.id = `kus-dl-pair-error-${rowNumber}`;
      entry.duplicate.setAttribute('aria-label', `ペア${rowNumber}を複製`);
      entry.swap.setAttribute('aria-label', `ペア${rowNumber}の比較方向を入れ替え`);
      entry.remove.setAttribute('aria-label', `ペア${rowNumber}を削除`);
      entry.match.id = `kus-dl-pair-match-${rowNumber}`;
      entry.remove.disabled = pairRows.length === 1;
    });
    pairCount.textContent = `${pairRows.length} / ${MAX_PAIR_ROWS} 行`;
  };

  const readPairInputs = (): DiffBatchPairInput[] => pairRows.map((entry, index) => ({
    rowNumber: index + 1,
    source: {
      appId: entry.source.app.value,
      guestId: entry.source.guest.value,
      preview: entry.source.preview.checkbox.checked,
      appName: entry.source.appName
    },
    target: {
      appId: entry.target.app.value,
      guestId: entry.target.guest.value,
      preview: entry.target.preview.checkbox.checked,
      appName: entry.target.appName
    }
  }));

  const showPairValidationIssues = (issues: DiffBatchPairIssue[]) => {
    clearPairValidation();
    const inputsForIssue = (entry: PairRowEntry, issue: DiffBatchPairIssue): HTMLInputElement[] => {
      if (issue.code === 'invalid-source-guest') return [entry.source.guest];
      if (issue.code === 'invalid-target-guest') return [entry.target.guest];
      if (issue.code === 'invalid-source-app' || issue.code === 'duplicate-source') return [entry.source.app];
      if (issue.code === 'invalid-target-app' || issue.code === 'duplicate-target') return [entry.target.app];
      if (issue.code === 'incomplete') return issue.side === 'target' ? [entry.target.app] : [entry.source.app];
      return [entry.source.app, entry.target.app];
    };
    const byRow = new Map<number, DiffBatchPairIssue[]>();
    issues.forEach((issue) => {
      const list = byRow.get(issue.rowNumber) || [];
      list.push(issue);
      byRow.set(issue.rowNumber, list);
    });
    byRow.forEach((rowIssues, rowNumber) => {
      const entry = pairRows[rowNumber - 1];
      if (!entry) return;
      entry.row.classList.add('is-invalid');
      entry.error.hidden = false;
      entry.error.textContent = rowIssues.map((issue) => issue.message).join(' / ');
      rowIssues.forEach((issue) => {
        inputsForIssue(entry, issue).forEach((input) => {
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-describedby', entry.error.id);
        });
      });
    });
    const first = issues[0];
    const firstRow = first ? pairRows[first.rowNumber - 1] : null;
    const focusTarget = firstRow && first ? inputsForIssue(firstRow, first)[0] : null;
    focusTarget?.focus();
  };

  const addPairRow = (initial: Partial<{ source: Partial<DiffBatchEndpoint>; target: Partial<DiffBatchEndpoint> }> = {}, focus = false): PairRowEntry | null => {
    if (pairRows.length >= MAX_PAIR_ROWS) {
      panel.setStatus(`一度に登録できるペアは ${MAX_PAIR_ROWS} 件までです`, 'warn');
      return null;
    }
    const rowNumber = pairRows.length + 1;
    const source = makePairEndpoint('source', rowNumber);
    const target = makePairEndpoint('target', rowNumber);
    const row = document.createElement('article');
    row.className = 'kus-dl-pair-row';
    const number = document.createElement('span');
    number.className = 'kus-dl-pair-row__number';
    const arrow = document.createElement('span');
    arrow.className = 'kus-dl-pair-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    const duplicate = makeButton('複製', 'sub');
    const swap = makeButton('入替', 'ghost');
    const remove = makeButton('削除', 'ghost');
    const actions = document.createElement('div');
    actions.className = 'kus-dl-pair-actions';
    actions.append(duplicate, swap, remove);
    const error = document.createElement('p');
    error.className = 'kus-dl-pair-row__error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    const match = document.createElement('p');
    match.className = 'kus-dl-pair-row__match';
    match.hidden = true;
    row.append(number, source.side, arrow, target.side, actions, error, match);
    const entry: PairRowEntry = { row, number, source, target, error, match, duplicate, swap, remove };
    const applyEndpointInitial = (endpointEntry: PairEndpointEntry, value: Partial<DiffBatchEndpoint> | undefined) => {
      endpointEntry.app.value = String(value?.appId || '');
      endpointEntry.guest.value = String(value?.guestId || '');
      endpointEntry.preview.checkbox.checked = value?.preview === true;
      setPairEndpointName(endpointEntry, String(value?.appName || ''));
    };
    applyEndpointInitial(source, initial.source);
    applyEndpointInitial(target, initial.target);

    const onEndpointInput = (endpoint: PairEndpointEntry) => {
      if (endpoint.appName) setPairEndpointName(endpoint, '');
      clearPairRowValidation(entry);
      invalidateResultAfterPairConditionChange();
    };
    source.app.addEventListener('input', () => onEndpointInput(source));
    target.app.addEventListener('input', () => onEndpointInput(target));
    [source.guest, target.guest].forEach((input) => input.addEventListener('input', () => {
      clearPairRowValidation(entry);
      invalidateResultAfterPairConditionChange();
    }));
    [source.preview.checkbox, target.preview.checkbox].forEach((checkbox) => checkbox.addEventListener('change', () => {
      clearPairRowValidation(entry);
      invalidateResultAfterPairConditionChange();
    }));
    duplicate.addEventListener('click', () => {
      if (pairFolderModeActive()) {
        panel.setStatus('フォルダ比較中は対応確認表からペアを作り直してください', 'warn');
        return;
      }
      const copy = addPairRow({
        source: { appId: source.app.value.trim(), guestId: source.guest.value.trim(), preview: source.preview.checkbox.checked, appName: source.appName },
        target: { appId: target.app.value.trim(), guestId: target.guest.value.trim(), preview: target.preview.checkbox.checked, appName: target.appName }
      }, true);
      if (copy) {
        const invalidated = invalidateResultAfterPairConditionChange();
        if (!invalidated) panel.setStatus(`ペア ${pairRows.indexOf(entry) + 1} を末尾へ複製しました。重複箇所を変更してください`, 'info');
      }
    });
    swap.addEventListener('click', () => {
      if (pairFolderModeActive()) {
        panel.setStatus('フォルダ比較中は対応確認表で比較元と比較先を選び直してください', 'warn');
        return;
      }
      const sourceValue = { appId: source.app.value, guestId: source.guest.value, preview: source.preview.checkbox.checked, appName: source.appName };
      applyEndpointInitial(source, { appId: target.app.value, guestId: target.guest.value, preview: target.preview.checkbox.checked, appName: target.appName });
      applyEndpointInitial(target, sourceValue);
      clearPairRowValidation(entry);
      const invalidated = invalidateResultAfterPairConditionChange();
      if (!invalidated) panel.setStatus(`ペア ${pairRows.indexOf(entry) + 1} の比較方向を入れ替えました`, 'info');
      source.app.focus();
    });
    remove.addEventListener('click', () => {
      if (pairFolderModeActive()) {
        panel.setStatus('フォルダ比較中はペア表から削除できません。対応確認表で対象チェックを外して再反映してください', 'warn');
        return;
      }
      const index = pairRows.indexOf(entry);
      if (index < 0 || pairRows.length === 1) return;
      row.remove();
      pairRows.splice(index, 1);
      clearPairValidation();
      relabelPairRows();
      const invalidated = invalidateResultAfterPairConditionChange();
      if (!invalidated) panel.setStatus(`ペア ${index + 1} を削除しました`, 'info');
      pairRows[Math.min(index, pairRows.length - 1)]?.source.app.focus();
    });
    pairRows.push(entry);
    pairList.appendChild(row);
    relabelPairRows();
    if (focus) source.app.focus();
    return entry;
  };

  const seedFirstPairFromSingle = () => {
    const first = pairRows[0];
    if (!first || !pairRowIsBlank(first)) return;
    first.source.app.value = srcApp.value.trim();
    first.source.guest.value = srcGuest.value.trim();
    first.source.preview.checkbox.checked = srcPrev.checkbox.checked;
    setPairEndpointName(first.source, sourceAppName);
    first.target.app.value = tgtApp.value.trim().split(/[,、\s]+/)[0] || '';
    first.target.guest.value = tgtGuest.value.trim();
    first.target.preview.checkbox.checked = tgtPrev.checkbox.checked;
    setPairEndpointName(first.target, targetRows[0]?.appName || '');
  };

  addPairRow();
  const addPairBtn = makeButton('ペアを追加', 'sub', { icon: '＋' });
  addPairBtn.dataset.kusDlPairAdd = '';
  addPairBtn.addEventListener('click', () => {
    if (pairFolderModeActive()) {
      panel.setStatus('フォルダ比較中は対応確認表からペアを作成してください。手入力へ戻す場合は両フォルダを解除してください', 'warn');
      return;
    }
    const entry = addPairRow({}, true);
    if (!entry) return;
    const invalidated = invalidateResultAfterPairConditionChange();
    if (!invalidated) panel.setStatus(`ペア ${pairRows.length} を追加しました`, 'info');
  });
  const pairToolbar = document.createElement('div');
  pairToolbar.className = 'kus-dl-pair-toolbar';
  const pairClearImportBtn = makeButton('設定JSON読込を解除', 'ghost');
  pairClearImportBtn.dataset.kusDlPairClearImport = '';
  pairClearImportBtn.disabled = true;
  pairClearImportBtn.hidden = true;
  pairToolbar.append(addPairBtn, pairClearImportBtn);

  type PairFolderSide = 'source' | 'target';
  interface PairFolderState {
    folderName: string;
    result: DiffBatchFolderImportResult;
  }
  interface PairFolderDraftRow {
    source: DiffBatchFolderImportedBundle;
    targetKey: string;
    included: boolean;
    confirmed: boolean;
    matchKind: DiffBatchFolderMatchKind | 'manual' | 'position';
  }

  const pairFolderStates: Record<PairFolderSide, PairFolderState | null> = { source: null, target: null };
  const pairFolderLoadGeneration: Record<PairFolderSide, number> = { source: 0, target: 0 };
  let pairFolderDraftRows: PairFolderDraftRow[] = [];
  let pairFolderDraftDirty = false;
  let pairFolderApplied = false;
  let pairFolderIgnoreUnusedTargets = false;
  const pairFolderActiveLoads: Record<PairFolderSide, number> = { source: 0, target: 0 };
  const pairFolderLoadActive = () => pairFolderActiveLoads.source > 0 || pairFolderActiveLoads.target > 0;

  const pairFolder = document.createElement('section');
  pairFolder.className = 'kus-dl-pair-folder';
  pairFolder.setAttribute('aria-labelledby', 'kus-dl-pair-folder-title');
  const pairFolderHead = document.createElement('div');
  pairFolderHead.className = 'kus-dl-pair-folder__head';
  pairFolderHead.innerHTML = '<strong id="kus-dl-pair-folder-title">設定フォルダからペアを作成</strong><span>設定一括取得ZIPを展開したフォルダなどを、変更前・変更後の両側で選びます。対応を確認して反映すると、現在のペア表を確認済みの組み合わせで置き換えます。比較にはJSONだけを使い、kintone APIへ接続しません。</span>';
  const pairFolderGrid = document.createElement('div');
  pairFolderGrid.className = 'kus-dl-pair-folder__grid';

  const makePairFolderSide = (side: PairFolderSide) => {
    const box = document.createElement('section');
    box.className = `kus-dl-pair-folder__side kus-dl-pair-folder__side--${side}`;
    const title = document.createElement('strong');
    title.id = `kus-dl-pair-folder-${side}-title`;
    title.textContent = side === 'source' ? '比較元（変更前）フォルダ' : '比較先（変更後）フォルダ';
    box.setAttribute('aria-labelledby', title.id);
    const actions = document.createElement('div');
    actions.className = 'kus-dl-pair-folder__actions';
    const select = makeButton('フォルダを選択', 'sub', { icon: '↑' });
    select.dataset.kusDlPairFolderSelect = side;
    select.setAttribute('aria-label', `${side === 'source' ? '比較元（変更前）' : '比較先（変更後）'}フォルダを選択`);
    const clear = makeButton('解除', 'ghost');
    clear.dataset.kusDlPairFolderClear = side;
    clear.setAttribute('aria-label', `${side === 'source' ? '比較元（変更前）' : '比較先（変更後）'}フォルダの読込を解除`);
    clear.disabled = true;
    const summary = document.createElement('p');
    summary.className = 'kus-dl-pair-folder__summary';
    summary.dataset.kusDlPairFolderSummary = side;
    summary.setAttribute('aria-live', 'polite');
    summary.textContent = '未選択';
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.json,application/json';
    input.hidden = true;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.setAttribute('aria-label', `${side === 'source' ? '比較元' : '比較先'}設定フォルダ`);
    input.dataset.kusDlPairFolderInput = side;
    actions.append(select, clear);
    box.append(title, actions, summary, input);
    return { box, select, clear, summary, input };
  };
  const sourceFolderUi = makePairFolderSide('source');
  const targetFolderUi = makePairFolderSide('target');
  pairFolderGrid.append(sourceFolderUi.box, targetFolderUi.box);
  const pairFolderAlert = document.createElement('p');
  pairFolderAlert.className = 'kus-dl-pair-folder__error';
  pairFolderAlert.setAttribute('role', 'alert');
  pairFolderAlert.hidden = true;

  const pairFolderMapping = document.createElement('section');
  pairFolderMapping.className = 'kus-dl-pair-folder__mapping';
  pairFolderMapping.hidden = true;
  pairFolderMapping.setAttribute('aria-label', 'フォルダ内アプリの対応確認');
  const pairFolderMappingScroll = document.createElement('div');
  pairFolderMappingScroll.className = 'kus-dl-pair-folder__mapping-scroll';
  const pairFolderMappingTable = document.createElement('div');
  pairFolderMappingScroll.appendChild(pairFolderMappingTable);
  const pairFolderUnused = document.createElement('p');
  pairFolderUnused.className = 'kus-dl-pair-folder__unused';
  pairFolderUnused.hidden = true;
  const pairFolderFoot = document.createElement('div');
  pairFolderFoot.className = 'kus-dl-pair-folder__foot';
  const pairFolderReview = document.createElement('span');
  pairFolderReview.className = 'kus-dl-pair-folder__review';
  pairFolderReview.setAttribute('aria-live', 'polite');
  const pairFolderOrderBtn = makeButton('未対応をフォルダ順で候補化', 'ghost');
  pairFolderOrderBtn.dataset.kusDlPairFolderOrder = '';
  const pairFolderApplyBtn = makeButton('確認済みペアで現在の表を置き換える', 'primary');
  pairFolderApplyBtn.dataset.kusDlPairFolderApply = '';
  pairFolderApplyBtn.disabled = true;
  pairFolderFoot.append(pairFolderReview, pairFolderOrderBtn, pairFolderApplyBtn);
  pairFolderMapping.append(pairFolderMappingScroll, pairFolderUnused, pairFolderFoot);
  pairFolder.append(pairFolderHead, pairFolderGrid, pairFolderAlert, pairFolderMapping);

  const pairFolderModeActive = () => !!(
    pairFolderStates.source || pairFolderStates.target ||
    pairRows.some((entry) => entry.source.folderBundle || entry.target.folderBundle)
  );

  const folderBundleLabel = (item: DiffBatchFolderImportedBundle) => {
    const name = item.appName || `App ${item.appId}`;
    const env = `${item.guestId ? `Guest ${item.guestId}` : '通常'} / ${item.preview ? 'プレビュー' : '運用'}`;
    return `${name}（App ${item.appId} / ${env}）`;
  };

  const folderBundleOptionLabel = (item: DiffBatchFolderImportedBundle) =>
    `${folderBundleLabel(item)} — ${item.relativePath}`;

  const folderMatchLabel = (kind: PairFolderDraftRow['matchKind']) => {
    if (kind === 'app-name') return 'アプリ名一致';
    if (kind === 'app-id') return 'App ID一致・要確認';
    if (kind === 'position') return 'フォルダ順・要確認';
    if (kind === 'manual') return '手動指定';
    return '未対応';
  };

  const pairFolderMatchNeedsConfirmation = (row: PairFolderDraftRow) =>
    row.matchKind === 'app-id' || row.matchKind === 'position';

  const updatePairFolderSummaries = () => {
    const update = (side: PairFolderSide, ui: ReturnType<typeof makePairFolderSide>) => {
      const state = pairFolderStates[side];
      const loading = pairFolderActiveLoads[side] > 0;
      const resetsPairTable = pairFolderApplied || pairRows.some((entry) => entry.source.folderBundle || entry.target.folderBundle);
      ui.box.setAttribute('aria-busy', loading ? 'true' : 'false');
      ui.clear.disabled = !state || loading;
      ui.clear.textContent = resetsPairTable ? '解除して表を初期化' : '解除';
      ui.clear.setAttribute('aria-label', `${side === 'source' ? '比較元（変更前）' : '比較先（変更後）'}フォルダの読込を解除${resetsPairTable ? 'してペア表を初期化' : ''}`);
      ui.summary.textContent = loading
        ? `${state ? `${state.folderName} — ` : ''}新しいフォルダを読み込み中…`
        : state
        ? `${state.folderName} — ${state.result.bundles.length}アプリ / JSON ${state.result.jsonFileCount}ファイル${state.result.ignoredFileCount ? ` / JSON以外 ${state.result.ignoredFileCount}件を除外` : ''}`
        : '未選択';
    };
    update('source', sourceFolderUi);
    update('target', targetFolderUi);
  };

  const renderPairFolderMapping = () => {
    const sourceState = pairFolderStates.source;
    const targetState = pairFolderStates.target;
    const ready = !!sourceState && !!targetState;
    pairFolderMapping.hidden = !ready;
    if (!ready) {
      pairFolderMappingTable.innerHTML = '';
      pairFolderReview.textContent = '比較元と比較先の両フォルダを選択してください';
      pairFolderApplyBtn.disabled = true;
      return;
    }

    const targets = targetState.result.bundles;
    const activeRows = pairFolderDraftRows.filter((row) => row.included);
    const mappedTargetKeys = activeRows.map((row) => row.targetKey).filter(Boolean);
    const usedTargetKeys = new Set(mappedTargetKeys);
    const targetUseCounts = new Map<string, number>();
    mappedTargetKeys.forEach((key) => targetUseCounts.set(key, (targetUseCounts.get(key) || 0) + 1));
    const duplicateTargetKeys = new Set([...targetUseCounts].filter(([, count]) => count > 1).map(([key]) => key));
    const unmapped = activeRows.filter((row) => !row.targetKey).length;
    const needsConfirmation = activeRows.filter((row) => row.targetKey && pairFolderMatchNeedsConfirmation(row) && !row.confirmed).length;
    const selectedTargetKeys = new Set(activeRows.map((row) => row.targetKey).filter(Boolean));
    const unusedTargets = targets.filter((target) => !selectedTargetKeys.has(target.endpointKey));

    const rowsHtml = pairFolderDraftRows.map((row, index) => {
      const sourceLabel = folderBundleLabel(row.source);
      const options = [
        '<option value="">比較先を選択してください</option>',
        ...targets.map((target) => {
          const selected = target.endpointKey === row.targetKey;
          const usedElsewhere = !selected && usedTargetKeys.has(target.endpointKey);
          return `<option value="${esc(target.endpointKey)}"${selected ? ' selected' : ''}${usedElsewhere ? ' disabled' : ''}>${esc(folderBundleOptionLabel(target))}</option>`;
        })
      ].join('');
      const duplicateTarget = row.included && !!row.targetKey && duplicateTargetKeys.has(row.targetKey);
      const requiresConfirmation = row.included && !!row.targetKey && pairFolderMatchNeedsConfirmation(row);
      const selectedTarget = targets.find((target) => target.endpointKey === row.targetKey) || null;
      const confirmationLabel = selectedTarget
        ? `${sourceLabel}から${folderBundleLabel(selectedTarget)}への対応を確認`
        : `${sourceLabel}の対応を確認`;
      const state = !row.included
        ? '対象外'
        : !row.targetKey
          ? '比較先未選択'
          : duplicateTarget
            ? '比較先が重複'
            : requiresConfirmation
              ? `<label><input type="checkbox" data-kus-dl-folder-confirm="${index}" aria-label="${esc(confirmationLabel)}"${row.confirmed ? ' checked' : ''}> 対応を確認</label>`
              : '確認済み';
      const warning = row.included && (!row.targetKey || duplicateTarget || (requiresConfirmation && !row.confirmed));
      return `<tr><td data-label="比較対象"><input type="checkbox" data-kus-dl-folder-include="${index}" aria-label="${esc(`${sourceLabel}を比較対象にする`)}"${row.included ? ' checked' : ''}></td>` +
        `<td data-label="比較元（変更前）"><span class="kus-dl-pair-folder__app">${esc(row.source.appName || `App ${row.source.appId}`)}</span><span class="kus-dl-pair-folder__meta">App ${esc(row.source.appId)} / ${esc(row.source.guestId ? `Guest ${row.source.guestId}` : '通常')} / ${row.source.preview ? 'プレビュー' : '運用'}<br>${esc(row.source.relativePath)}</span></td>` +
        `<td data-label="対応根拠"><span class="kus-dl-pair-folder__badge kus-dl-pair-folder__badge--${esc(row.matchKind)}">${esc(folderMatchLabel(row.matchKind))}</span></td>` +
        `<td data-label="比較先（変更後）"><select data-kus-dl-folder-target="${index}" aria-label="${esc(`${sourceLabel}の比較先`)}"${row.included ? '' : ' disabled'}>${options}</select></td>` +
        `<td data-label="確認状態" class="${warning ? 'kus-dl-multi__warn' : ''}">${state}</td></tr>`;
    }).join('');
    pairFolderMappingTable.innerHTML = `<table><thead><tr><th>対象</th><th>比較元（変更前）</th><th>対応根拠</th><th>比較先（変更後）</th><th>状態</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;

    pairFolderUnused.hidden = !unusedTargets.length;
    pairFolderUnused.innerHTML = unusedTargets.length
      ? `<label><input type="checkbox" data-kus-dl-folder-ignore-unused${pairFolderIgnoreUnusedTargets ? ' checked' : ''}> 未使用の比較先 ${unusedTargets.length}件を今回の比較対象外にする</label><br>${esc(unusedTargets.map(folderBundleLabel).join(' / '))}`
      : '';
    const unusedNotConfirmed = unusedTargets.length > 0 && !pairFolderIgnoreUnusedTargets;
    const invalid = !activeRows.length || unmapped > 0 || duplicateTargetKeys.size > 0 || needsConfirmation > 0 || activeRows.length > MAX_PAIR_ROWS || unusedNotConfirmed || pairFolderLoadActive();
    pairFolderApplyBtn.disabled = invalid;
    pairFolderOrderBtn.disabled = pairFolderLoadActive() || !unmapped || !unusedTargets.length;
    const problems = [
      unmapped ? `未対応 ${unmapped}件` : '',
      duplicateTargetKeys.size ? `比較先重複 ${duplicateTargetKeys.size}件` : '',
      needsConfirmation ? `要確認 ${needsConfirmation}件` : '',
      unusedNotConfirmed ? `対象外未確認 ${unusedTargets.length}件` : '',
      pairFolderLoadActive() ? 'フォルダ読込中' : ''
    ].filter(Boolean);
    pairFolderReview.textContent = `比較対象 ${activeRows.length}件 / 未対応 ${unmapped}件 / 要確認 ${needsConfirmation}件 / 未使用の比較先 ${unusedTargets.length}件${invalid ? ` — ${problems.join(' / ') || '比較対象を選択してください'}` : ' — 確認済みペアで現在のペア表を置き換えます'}`;
  };

  const resetPairFolderDraft = () => {
    pairFolderIgnoreUnusedTargets = false;
    const sourceBundles = pairFolderStates.source?.result.bundles || [];
    const targetBundles = pairFolderStates.target?.result.bundles || [];
    if (!sourceBundles.length || !targetBundles.length) {
      pairFolderDraftRows = [];
      renderPairFolderMapping();
      return;
    }
    pairFolderDraftRows = autoMatchDiffBatchFolderBundles(sourceBundles, targetBundles)
      .filter((row): row is typeof row & { source: DiffBatchFolderImportedBundle } => !!row.source)
      .map((row) => ({
        source: row.source,
        targetKey: row.target?.endpointKey || '',
        included: true,
        confirmed: row.matchKind === 'app-name',
        matchKind: row.target ? row.matchKind : 'unpaired'
      }));
    pairFolderDraftDirty = true;
    renderPairFolderMapping();
  };

  const clearPairRowsForFolderReset = () => {
    pairRows.forEach((entry) => entry.row.remove());
    pairRows.length = 0;
    addPairRow();
    pairFolderApplied = false;
  };

  const refreshPairFolderControlState = () => {
    const active = pairFolderModeActive();
    const loading = pairFolderLoadActive();
    addPairBtn.disabled = active;
    pairBulkTextarea.disabled = active;
    pairBulkApply.disabled = active;
    runBtn.disabled = loading || diffRunActive || profileIoActive;
    runAllBtn.disabled = loading || diffRunActive || profileIoActive;
    runPairsBtn.disabled = loading || diffRunActive || profileIoActive;
    pairRows.forEach((entry) => {
      entry.duplicate.disabled = active;
      entry.swap.disabled = active;
      entry.remove.disabled = active || pairRows.length === 1;
      entry.duplicate.title = active ? 'フォルダ比較中は対応確認表からペアを作り直してください' : '';
      entry.swap.title = active ? 'フォルダ比較中は比較元・比較先フォルダを入れ替えてください' : '';
      entry.remove.title = active ? 'フォルダ比較中は対応確認表で対象チェックを外して再反映してください' : '';
      [entry.source, entry.target].forEach((endpoint) => {
        endpoint.app.readOnly = active || !!endpoint.folderBundle;
        endpoint.guest.readOnly = active || !!endpoint.folderBundle;
        endpoint.preview.checkbox.disabled = active || !!endpoint.folderBundle;
      });
    });
  };

  const rootFolderName = (files: File[]) => {
    const path = String(files[0]?.webkitRelativePath || files[0]?.name || '').replace(/\\/g, '/');
    return path.includes('/') ? path.split('/')[0] : (path || '選択フォルダ');
  };

  const loadPairFolder = async (side: PairFolderSide, input: HTMLInputElement, invalidatedBeforeLoad: boolean) => {
    const generation = ++pairFolderLoadGeneration[side];
    const files = Array.from(input.files || []);
    if (!files.length) throw new Error('選択したフォルダにファイルがありません');
    input.value = '';
    const jsonFiles = files.filter((file) => /\.json$/i.test(file.name));
    const totalJsonBytes = jsonFiles.reduce((sum, file) => sum + Number(file.size || 0), 0);
    if (files.length > 2000 || jsonFiles.length > 500) throw new Error('選択したフォルダのファイル数が多すぎます（全体2,000件、JSON 500件まで）');
    if (totalJsonBytes > 128 * 1024 * 1024) throw new Error('選択したフォルダのJSON合計サイズが128MBを超えています');
    let entries: Array<{ name: string; relativePath: string; text: string }>;
    try {
      entries = await Promise.all(files.map(async (file) => ({
        name: file.name,
        relativePath: file.webkitRelativePath || file.name,
        text: /\.json$/i.test(file.name) ? await file.text() : ''
      })));
    } catch (error) {
      if (generation !== pairFolderLoadGeneration[side]) return;
      throw error;
    }
    if (generation !== pairFolderLoadGeneration[side]) return;
    const parsed = parseDiffBatchFolderImport(entries);
    if (parsed.issues.length) {
      const shown = parsed.issues.slice(0, 3).map((issue) => issue.message).join(' / ');
      throw new Error(`${side === 'source' ? '比較元' : '比較先'}フォルダを取り込めません: ${shown}${parsed.issues.length > 3 ? `（ほか ${parsed.issues.length - 3}件）` : ''}`);
    }
    if (!parsed.bundles.length) throw new Error('選択したフォルダにアプリ設定JSONがありません');
    if (parsed.bundles.length > MAX_PAIR_ROWS) throw new Error(`1フォルダから取り込めるアプリは ${MAX_PAIR_ROWS}件までです`);
    pairFolderStates[side] = { folderName: rootFolderName(files), result: parsed };
    pairFolderDraftDirty = true;
    updatePairFolderSummaries();
    resetPairFolderDraft();
    refreshPairFolderControlState();
    const invalidated = invalidateResultAfterPairConditionChange() || invalidatedBeforeLoad;
    panel.setStatus(`${side === 'source' ? '比較元' : '比較先'}フォルダから ${parsed.bundles.length}アプリを読み込みました。${pairFolderStates.source && pairFolderStates.target ? '対応付けを確認してペア表へ反映してください' : '反対側のフォルダも選択してください'}${invalidated ? '。前回の結果は無効です' : ''}`, invalidated ? 'warn' : 'ok');
  };

  ([['source', sourceFolderUi], ['target', targetFolderUi]] as const).forEach(([side, ui]) => {
    ui.select.addEventListener('click', () => {
      if (multiXlsxExportActive) {
        panel.setStatus('Excelの生成が完了してからフォルダを選択してください', 'warn');
        return;
      }
      ui.input.click();
    });
    ui.input.addEventListener('change', () => {
      if (!ui.input.files?.length) {
        ui.input.value = '';
        panel.setStatus('選択したフォルダにファイルがありません', 'warn');
        return;
      }
      pairFolderAlert.hidden = true;
      pairFolderAlert.textContent = '';
      const invalidatedBeforeLoad = invalidateResultAfterPairConditionChange();
      pairFolderDraftDirty = true;
      pairFolderApplied = false;
      pairFolderActiveLoads[side] += 1;
      updatePairFolderSummaries();
      renderPairFolderMapping();
      refreshPairFolderControlState();
      void liteRun(panel, `${side === 'source' ? '比較元' : '比較先'}フォルダを読み込み中…`, async () => {
        try {
          await loadPairFolder(side, ui.input, invalidatedBeforeLoad);
        } catch (error) {
          pairFolderAlert.textContent = error instanceof Error ? error.message : String(error);
          pairFolderAlert.hidden = false;
          throw error;
        } finally {
          pairFolderActiveLoads[side] = Math.max(0, pairFolderActiveLoads[side] - 1);
          updatePairFolderSummaries();
          renderPairFolderMapping();
          refreshPairFolderControlState();
        }
      });
    });
    ui.clear.addEventListener('click', () => {
      const resetAppliedPairs = pairFolderApplied || pairRows.some((entry) => entry.source.folderBundle || entry.target.folderBundle);
      pairFolderLoadGeneration[side] += 1;
      pairFolderStates[side] = null;
      ui.input.value = '';
      pairFolderAlert.hidden = true;
      pairFolderAlert.textContent = '';
      if (resetAppliedPairs) clearPairRowsForFolderReset();
      pairFolderDraftRows = [];
      pairFolderDraftDirty = !!(pairFolderStates.source || pairFolderStates.target);
      updatePairFolderSummaries();
      resetPairFolderDraft();
      refreshPairFolderControlState();
      const invalidated = invalidateResultAfterPairConditionChange();
      panel.setStatus(`${side === 'source' ? '比較元' : '比較先'}フォルダの読込を解除しました${resetAppliedPairs ? '。フォルダ由来のペア表を初期化しました' : ''}${invalidated ? '。前回の結果は無効です' : ''}`, invalidated || resetAppliedPairs ? 'warn' : 'info');
    });
  });

  const focusPairFolderMappingControl = (selector: string) => {
    pairFolderMapping.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  };

  pairFolderMapping.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!target) return;
    const includeIndex = Number(target.dataset.kusDlFolderInclude);
    if (Number.isInteger(includeIndex) && pairFolderDraftRows[includeIndex] && target instanceof HTMLInputElement) {
      pairFolderDraftRows[includeIndex].included = target.checked;
      pairFolderIgnoreUnusedTargets = false;
      pairFolderDraftDirty = true;
      renderPairFolderMapping();
      focusPairFolderMappingControl(`[data-kus-dl-folder-include="${includeIndex}"]`);
      invalidateResultAfterPairConditionChange();
      return;
    }
    if (target.dataset.kusDlFolderIgnoreUnused != null && target instanceof HTMLInputElement) {
      pairFolderIgnoreUnusedTargets = target.checked;
      pairFolderDraftDirty = true;
      renderPairFolderMapping();
      focusPairFolderMappingControl('[data-kus-dl-folder-ignore-unused]');
      invalidateResultAfterPairConditionChange();
      return;
    }
    const confirmIndex = Number(target.dataset.kusDlFolderConfirm);
    if (Number.isInteger(confirmIndex) && pairFolderDraftRows[confirmIndex] && target instanceof HTMLInputElement) {
      pairFolderDraftRows[confirmIndex].confirmed = target.checked;
      pairFolderDraftDirty = true;
      renderPairFolderMapping();
      focusPairFolderMappingControl(`[data-kus-dl-folder-confirm="${confirmIndex}"]`);
      invalidateResultAfterPairConditionChange();
      return;
    }
    const targetIndex = Number(target.dataset.kusDlFolderTarget);
    if (Number.isInteger(targetIndex) && pairFolderDraftRows[targetIndex] && target instanceof HTMLSelectElement) {
      pairFolderDraftRows[targetIndex].targetKey = target.value;
      pairFolderDraftRows[targetIndex].matchKind = target.value ? 'manual' : 'unpaired';
      pairFolderDraftRows[targetIndex].confirmed = !!target.value;
      pairFolderIgnoreUnusedTargets = false;
      pairFolderDraftDirty = true;
      renderPairFolderMapping();
      focusPairFolderMappingControl(`[data-kus-dl-folder-target="${targetIndex}"]`);
      invalidateResultAfterPairConditionChange();
    }
  });

  pairFolderOrderBtn.addEventListener('click', () => {
    if (pairFolderLoadActive()) {
      panel.setStatus('フォルダの読込が完了してから候補を作成してください', 'warn');
      return;
    }
    const targets = pairFolderStates.target?.result.bundles || [];
    const used = new Set(pairFolderDraftRows.filter((row) => row.included).map((row) => row.targetKey).filter(Boolean));
    const remainingTargets = targets.filter((target) => !used.has(target.endpointKey));
    let targetIndex = 0;
    pairFolderDraftRows.forEach((row) => {
      if (!row.included || row.targetKey || targetIndex >= remainingTargets.length) return;
      row.targetKey = remainingTargets[targetIndex].endpointKey;
      row.matchKind = 'position';
      row.confirmed = false;
      targetIndex += 1;
    });
    pairFolderIgnoreUnusedTargets = false;
    pairFolderDraftDirty = true;
    renderPairFolderMapping();
    invalidateResultAfterPairConditionChange();
    panel.setStatus('未対応の組み合わせをフォルダ内の順番で候補化しました。誤対応を防ぐため、左右のアプリ名を確認してから反映してください', 'warn');
  });

  pairFolderApplyBtn.addEventListener('click', () => {
    if (pairFolderLoadActive()) {
      panel.setStatus('フォルダの読込が完了してからペア表を置き換えてください', 'warn');
      return;
    }
    const targets = pairFolderStates.target?.result.bundles || [];
    const targetByKey = new Map(targets.map((target) => [target.endpointKey, target]));
    const selections = pairFolderDraftRows.filter((row) => row.included).map((row) => ({
      ...row,
      target: targetByKey.get(row.targetKey) || null
    }));
    if (!selections.length || selections.some((row) => !row.target)) {
      panel.setStatus('比較対象のすべての行で比較先を選択してください', 'warn');
      return;
    }
    if (selections.some((row) => pairFolderMatchNeedsConfirmation(row) && !row.confirmed)) {
      panel.setStatus('「要確認」の対応を各行で確認してからペア表を置き換えてください', 'warn');
      return;
    }
    if (new Set(selections.map((row) => row.targetKey)).size !== selections.length) {
      panel.setStatus('同じ比較先を複数の比較元へ対応付けることはできません', 'warn');
      return;
    }
    if (selections.length > MAX_PAIR_ROWS) {
      panel.setStatus(`一度に比較できるペアは ${MAX_PAIR_ROWS}件までです`, 'warn');
      return;
    }

    pairRows.forEach((entry) => entry.row.remove());
    pairRows.length = 0;
    selections.forEach((selection) => {
      const entry = addPairRow();
      if (!entry || !selection.target) return;
      setPairEndpointFolderBundle(entry.source, selection.source);
      setPairEndpointFolderBundle(entry.target, selection.target);
      entry.match.hidden = false;
      entry.match.textContent = `フォルダ取込 / ${folderMatchLabel(selection.matchKind)}。比較元・比較先の設定JSONを固定して比較します。`;
    });
    pairFolderApplied = true;
    pairFolderDraftDirty = false;
    clearPairValidation();
    relabelPairRows();
    updatePairFolderSummaries();
    refreshPairFolderControlState();
    const invalidated = invalidateResultAfterPairConditionChange();
    panel.setStatus(`${selections.length}組をペア表へ反映しました。アプリ名・方向を確認して一括比較してください${invalidated ? '。前回の結果は無効です' : ''}`, invalidated ? 'warn' : 'ok');
  });

  updatePairFolderSummaries();

  const pairBulk = document.createElement('details');
  pairBulk.className = 'kus-dl-pair-bulk';
  pairBulk.innerHTML = '<summary>表から複数ペアをまとめて入力</summary>';
  const pairBulkBody = document.createElement('div');
  pairBulkBody.className = 'kus-dl-pair-bulk__body';
  const pairBulkTextarea = makeTextarea({ rows: 5, code: true, placeholder: '比較元App ID\t比較先App ID\nまたは\n比較元App ID\t比較元Guest ID\t比較先App ID\t比較先Guest ID' });
  pairBulkTextarea.setAttribute('aria-label', '一括登録する比較ペア');
  const pairBulkApply = makeButton('入力したペアを追加', 'sub');
  pairBulkBody.append(
    makeNote('Excelなどの2列（比較元App ID・比較先App ID）、または4列（比較元App ID・比較元Guest ID・比較先App ID・比較先Guest ID）を貼り付けます。'),
    pairBulkTextarea,
    pairBulkApply
  );
  pairBulk.appendChild(pairBulkBody);
  pairBulkApply.addEventListener('click', () => {
    if (pairFolderModeActive()) {
      panel.setStatus('フォルダ比較中は表の一括貼り付けを使用できません。両フォルダを解除すると手入力へ戻ります', 'warn');
      return;
    }
    const parsed: Array<{ source: Partial<DiffBatchEndpoint>; target: Partial<DiffBatchEndpoint> }> = [];
    const invalidLines: number[] = [];
    pairBulkTextarea.value.split(/\r?\n/).forEach((rawLine, index) => {
      if (!rawLine.trim()) return;
      const line = rawLine.replace(/\r$/, '');
      const columns = (line.includes('\t') ? line.split('\t') : line.split(/[,、]/)).map((value) => value.trim());
      if (columns.length === 2) parsed.push({ source: { appId: columns[0] }, target: { appId: columns[1] } });
      else if (columns.length === 4) parsed.push({ source: { appId: columns[0], guestId: columns[1] }, target: { appId: columns[2], guestId: columns[3] } });
      else invalidLines.push(index + 1);
    });
    if (invalidLines.length) {
      panel.setStatus(`一括入力の ${invalidLines.join(', ')} 行目は2列または4列ではありません`, 'warn');
      return;
    }
    if (!parsed.length) {
      panel.setStatus('追加する比較ペアを入力してください', 'warn');
      return;
    }
    if (pairRows.filter((entry) => !pairRowIsBlank(entry)).length + parsed.length > MAX_PAIR_ROWS) {
      panel.setStatus(`一度に登録できるペアは ${MAX_PAIR_ROWS} 件までです`, 'warn');
      return;
    }
    let added = 0;
    parsed.forEach((value) => {
      const blank = pairRows.find(pairRowIsBlank);
      if (blank) {
        blank.source.app.value = String(value.source.appId || '');
        blank.source.guest.value = String(value.source.guestId || '');
        blank.target.app.value = String(value.target.appId || '');
        blank.target.guest.value = String(value.target.guestId || '');
        added += 1;
        return;
      }
      if (addPairRow(value)) added += 1;
    });
    pairBulkTextarea.value = '';
    pairBulk.open = false;
    clearPairValidation();
    const invalidated = invalidateResultAfterPairConditionChange();
    if (!invalidated) panel.setStatus(`${added} 件の比較ペアを追加しました`, 'ok');
  });

  const pairAppSearch = createAppSearchControl(panel, {
    title: 'ペアへアプリ名で設定',
    targets: [
      { label: '空いている比較元', apply: (id, name, guestId) => {
        if (diffRunActive) return { message: '比較を実行中です。完了してからアプリを設定してください', tone: 'warn' as const };
        if (pairFolderModeActive()) return { message: 'フォルダ比較中は対応確認表からアプリを選択してください', tone: 'warn' as const };
        const entry = pairRows.find((row) => !row.source.app.value.trim()) || addPairRow();
        if (!entry) return { message: `登録上限 ${MAX_PAIR_ROWS} 件に達しています`, tone: 'warn' as const };
        entry.source.app.value = id;
        if (guestId && !entry.source.guest.value.trim()) entry.source.guest.value = guestId;
        setPairEndpointName(entry.source, name);
        clearPairRowValidation(entry);
        const invalidated = invalidateResultAfterPairConditionChange();
        return { message: invalidated
          ? '比較ペアを変更したため、前回の一括結果を無効にしました。再比較してください'
          : `App ${id} をペア ${pairRows.indexOf(entry) + 1} の比較元へ設定しました`, tone: invalidated ? 'warn' as const : 'ok' as const };
      } },
      { label: '空いている比較先', apply: (id, name, guestId) => {
        if (diffRunActive) return { message: '比較を実行中です。完了してからアプリを設定してください', tone: 'warn' as const };
        if (pairFolderModeActive()) return { message: 'フォルダ比較中は対応確認表からアプリを選択してください', tone: 'warn' as const };
        const entry = pairRows.find((row) => !row.target.app.value.trim()) || addPairRow();
        if (!entry) return { message: `登録上限 ${MAX_PAIR_ROWS} 件に達しています`, tone: 'warn' as const };
        entry.target.app.value = id;
        if (guestId && !entry.target.guest.value.trim()) entry.target.guest.value = guestId;
        setPairEndpointName(entry.target, name);
        clearPairRowValidation(entry);
        const invalidated = invalidateResultAfterPairConditionChange();
        return { message: invalidated
          ? '比較ペアを変更したため、前回の一括結果を無効にしました。再比較してください'
          : `App ${id} をペア ${pairRows.indexOf(entry) + 1} の比較先へ設定しました`, tone: invalidated ? 'warn' as const : 'ok' as const };
      } }
    ]
  });
  pairEditor.append(pairIntro, pairFolder, pairList, pairToolbar, pairBulk, pairAppSearch, makeNote('手入力のペアはkintone APIから取得します。フォルダ取込では両側の設定JSONだけを使い、不足分をAPIで補いません。単一比較用の設定JSONを読み込んだまま切り替えた場合は「設定JSON読込を解除」を押してください。'));
  cardApp.body.appendChild(pairEditor);
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- セクション ----
  const cardScope = makeCard({ title: '比較セクション', number: 2 });
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  const chips = SCOPE_OPTS.map(([key, label, def]) => makeChip({ label, value: key, checked: def }));
  chips.forEach((c) => chipBox.appendChild(c.label));
  cardScope.body.appendChild(chipBox);
  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => {
    chips.forEach((c) => { c.checkbox.checked = true; });
    invalidateResultAfterGeneralConditionChange();
  });
  noneBtn.addEventListener('click', () => {
    chips.forEach((c) => { c.checkbox.checked = false; });
    invalidateResultAfterGeneralConditionChange();
  });
  panel.body.insertBefore(cardScope.card, panel.status);

  // 環境ごとに変わる内部IDは、詳細設定を開かなくても選べるようにする。
  // 比較結果そのものを変える条件なので既定はオフとし、再比較が必要なことも常時表示する。
  const nAppRefs = makeCheck({
    label: '環境固有ID（アプリ・一覧・グラフ・アクション）を比較から除外',
    checked: false,
    help: '比較対象・参照先のアプリIDと、一覧・グラフ・アクション自身の内部IDだけを除外します'
  });
  nAppRefs.checkbox.dataset.kusDlExcludeAppReferences = '';
  const appReferenceExclusion = document.createElement('section');
  appReferenceExclusion.className = 'kus-dl-common-exclusion';
  appReferenceExclusion.setAttribute('aria-labelledby', 'kus-dl-common-exclusion-heading');
  const appReferenceExclusionHeading = document.createElement('h3');
  appReferenceExclusionHeading.id = 'kus-dl-common-exclusion-heading';
  appReferenceExclusionHeading.className = 'kus-dl-common-exclusion__heading';
  appReferenceExclusionHeading.textContent = 'よく使う除外';
  const appReferenceExclusionDescription = document.createElement('p');
  appReferenceExclusionDescription.id = 'kus-dl-common-exclusion-description';
  appReferenceExclusionDescription.className = 'kus-dl-common-exclusion__description';
  appReferenceExclusionDescription.textContent = '比較対象・参照先のアプリIDと、一覧・グラフ・アクション自身の内部IDだけを除外します。フィールドコード、一覧条件、アクションの対応付け、プラグインIDは比較します。';
  const appReferenceExclusionNote = document.createElement('p');
  appReferenceExclusionNote.id = 'kus-dl-common-exclusion-note';
  appReferenceExclusionNote.className = 'kus-dl-common-exclusion__note';
  appReferenceExclusionNote.textContent = '初期状態はオフです。オン／オフを変更した後は再比較してください。差分件数・画面結果・Excelに反映されます。';
  nAppRefs.checkbox.setAttribute('aria-describedby', `${appReferenceExclusionDescription.id} ${appReferenceExclusionNote.id}`);
  appReferenceExclusion.append(
    appReferenceExclusionHeading,
    appReferenceExclusionDescription,
    nAppRefs.label,
    appReferenceExclusionNote
  );

  // ---- 設定JSON読込 ----
  const cardImport = makeCard({ title: '設定JSON読込（任意）', soft: true });
  cardImport.body.appendChild(makeNote('設定出力で保存した単体JSON、設定一括取得JSON（apps 配列）、差分バンドルJSONを指定できます。指定した側はAPI取得せずJSONを使用します。比較先JSONは単一比較専用です。'));
  const srcFile = document.createElement('input');
  srcFile.type = 'file';
  srcFile.accept = '.json,application/json';
  srcFile.className = 'kus-lp__file';
  srcFile.setAttribute('aria-label', '比較元設定JSON');
  const tgtFile = document.createElement('input');
  tgtFile.type = 'file';
  tgtFile.accept = '.json,application/json';
  tgtFile.className = 'kus-lp__file';
  tgtFile.setAttribute('aria-label', '比較先設定JSON');
  const clearImportBtn = makeButton('読込解除', 'ghost');
  cardImport.body.appendChild(makeRow(srcFile, { label: '比較元JSON' }));
  cardImport.body.appendChild(makeRow(tgtFile, { label: '比較先JSON' }));
  cardImport.body.appendChild(makeRow(clearImportBtn));
  panel.body.insertBefore(cardImport.card, panel.status);

  // ---- 詳細オプション ----
  const advDetails = makeDetails('高度な比較設定');
  const ignTa = makeTextarea({ rows: 2, code: true, placeholder: 'キー / 完全パス / * ワイルドカード（改行・カンマ区切り）' });
  ignTa.setAttribute('aria-label', '比較から除外する無視キーまたは設定パス');
  advDetails.body.appendChild(makeRow(ignTa, { label: '無視キー', block: true }));
  advDetails.body.appendChild(makeNote('キー名だけの指定、fieldSettings.properties.code.label のようなパス、* を使ったパターンに対応します。結果行の「次回から除外」は、記号や大小文字を含めてもその1パスだけに一致する path: 形式で追加します。'));
  advDetails.body.appendChild(makeNote('⚠ 完全パスとワイルドカードは別アプリにもそのまま適用され、該当差分は結果から除外されます。プロファイル読込後と再比較前に内容を確認してください。'));

  const includeSame = makeCheck({ label: '同一行も差分行に含める' });
  const showResultList = makeCheck({ label: '画面に差分明細を表示（200件ずつ）', checked: true, help: '大量差分でも固まりにくいよう、明細は200件ずつ段階表示します' });
  const nView = makeCheck({ label: 'ビュー/グラフ/アクション順序を無視', checked: false });
  const nPerm = makeCheck({ label: '権限/通知/カテゴリ順序を無視', checked: false });
  const nAll = makeCheck({ label: 'すべての配列順序を無視', checked: false });
  const nField = makeCheck({ label: 'フィールド/レイアウト順序を無視', checked: false });
  const nProcess = makeCheck({ label: 'プロセスの並び順を無視', checked: false });
  const nAudit = makeCheck({ label: '監査/リビジョン情報を無視', checked: false });
  const nText = makeCheck({ label: 'ラベル/説明文/ヘルプを無視', checked: false });
  const nAppearance = makeCheck({ label: '見た目/幅/座標を無視', checked: false });
  const nFileKeys = makeCheck({ label: '添付/JS/CSS fileKeyを無視', checked: false });
  const nEnabled = makeCheck({ label: '有効/無効フラグを無視', checked: false });
  const normalizationControls: Record<string, HTMLInputElement> = {
    viewOrder: nView.checkbox,
    permissionOrder: nPerm.checkbox,
    generalArrayOrder: nAll.checkbox,
    fieldOrder: nField.checkbox,
    processOrder: nProcess.checkbox,
    appReferences: nAppRefs.checkbox,
    auditMeta: nAudit.checkbox,
    labelsAndText: nText.checkbox,
    appearance: nAppearance.checkbox,
    fileKeys: nFileKeys.checkbox,
    enabledFlags: nEnabled.checkbox
  };
  const normGrid = document.createElement('div');
  normGrid.className = 'kus-lp__check-grid';
  [
    includeSame.label,
    showResultList.label,
    nView.label,
    nPerm.label,
    nAll.label,
    nField.label,
    nProcess.label,
    nAudit.label,
    nText.label,
    nAppearance.label,
    nFileKeys.label,
    nEnabled.label
  ].forEach((el) => normGrid.appendChild(el));
  advDetails.body.appendChild(normGrid);

  const profileName = makeInput({ placeholder: '例: 権限を除く標準比較', width: 'medium', noSubmit: true, ariaLabel: '比較条件プロファイル名' });
  const profileSaveBtn = makeButton('比較条件を保存', 'sub', { icon: '↓' });
  const profileLoadBtn = makeButton('比較条件を読込', 'sub', { icon: '↑' });
  profileSaveBtn.dataset.kusDlProfile = 'save';
  profileLoadBtn.dataset.kusDlProfile = 'load';
  const profileFile = document.createElement('input');
  profileFile.type = 'file';
  profileFile.accept = '.json,application/json';
  profileFile.hidden = true;
  profileFile.dataset.kusDlProfileFile = 'load';
  advDetails.body.appendChild(makeRow(profileName, { label: '比較条件名' }));
  advDetails.body.appendChild(makeRow([profileSaveBtn, profileLoadBtn]));
  advDetails.body.appendChild(makeNote('比較セクション・無視ルール・正規化・表示設定だけをJSONで保存します。アプリID、設定値、認証情報は含みません。'));
  advDetails.body.appendChild(profileFile);
  panel.body.insertBefore(advDetails.details, panel.status);

  // ---- 実行 ----
  const runBtn = makeButton('差分比較を実行', 'run', { icon: '→' });
  const runAllBtn = makeButton('複数の比較を実行', 'run', { icon: '→' });
  const runPairsBtn = makeButton('登録したペアを一括比較', 'run', { icon: '→' });
  runPairsBtn.dataset.kusDlRunPairs = '';
  const runRow = makeRow([runBtn, runAllBtn, runPairsBtn]);
  runRow.classList.add('kus-dl-run-row');
  panel.body.insertBefore(runRow, panel.status);
  const completionReviewBtn = makeButton('結果を確認', 'sub', { icon: '↓' });
  const completionXlsxBtn = makeButton('Excelを保存（全件）', 'primary', { icon: '↓' });
  completionReviewBtn.dataset.kusDlCompletion = 'review';
  completionXlsxBtn.dataset.kusDlCompletion = 'xlsx';
  completionReviewBtn.setAttribute('aria-controls', 'kus-dl-overview');
  const completionRow = makeRow([completionReviewBtn, completionXlsxBtn]);
  completionRow.classList.add('kus-dl-completion-row');
  completionRow.hidden = true;
  const setCompletionActionsVisible = (visible: boolean) => {
    completionReady = visible;
    completionRow.hidden = !completionReady || comparisonMode !== 'single';
  };
  // 入力欄で Enter を押すと差分比較を実行（読み取り専用なので安全）
  panel.setPrimaryAction(runBtn);
  applyComparisonMode = (mode) => {
    const changed = comparisonMode !== mode;
    comparisonMode = mode;
    panel.root.dataset.kusDlMode = mode;
    singleModeBtn.setAttribute('aria-pressed', mode === 'single' ? 'true' : 'false');
    multiModeBtn.setAttribute('aria-pressed', mode === 'multi' ? 'true' : 'false');
    pairModeBtn.setAttribute('aria-pressed', mode === 'pairs' ? 'true' : 'false');
    singleModeBtn.classList.toggle('is-active', mode === 'single');
    multiModeBtn.classList.toggle('is-active', mode === 'multi');
    pairModeBtn.classList.toggle('is-active', mode === 'pairs');
    multiControls.hidden = mode !== 'multi';
    targetList.hidden = mode !== 'multi';
    directionGrid.hidden = mode === 'pairs';
    singleAppSearch.hidden = mode === 'pairs';
    pairEditor.hidden = mode !== 'pairs';
    cardImport.card.hidden = mode === 'pairs';
    runBtn.hidden = mode !== 'single';
    runAllBtn.hidden = mode !== 'multi';
    runPairsBtn.hidden = mode !== 'pairs';
    completionRow.hidden = !completionReady || mode !== 'single';
    swapBtn.disabled = mode !== 'single';
    swapBtn.title = mode !== 'single' ? '1対1比較に切り替えると方向を入れ替えられます' : '';
    if (mode === 'pairs') seedFirstPairFromSingle();
    panel.setPrimaryAction(mode === 'multi' ? runAllBtn : (mode === 'pairs' ? runPairsBtn : runBtn));
    if (changed) invalidateResultAfterComparisonModeChange();
  };
  singleModeBtn.addEventListener('click', () => applyComparisonMode('single'));
  multiModeBtn.addEventListener('click', () => applyComparisonMode('multi'));
  pairModeBtn.addEventListener('click', () => applyComparisonMode('pairs'));
  applyComparisonMode('single');

  // ---- 結果フィルタ ----
  const cardFilter = makeCard({ title: '結果の絞り込み', soft: true });
  cardFilter.card.style.display = 'none';
  const filterSection = makeSelect([['', '全セクション']]);
  filterSection.setAttribute('aria-label', '結果のセクション絞り込み');
  const filterType = makeSelect([
    ['', '全種別'],
    ['added', '追加｜比較先のみ'],
    ['removed', '削除｜比較元のみ'],
    ['changed', '変更｜内容が異なる'],
    ['moved', '移動｜並び順が異なる'],
    ['same', '同一｜内容が一致']
  ]);
  filterType.setAttribute('aria-label', '結果の種別絞り込み');
  const filterSearch = makeInput({ placeholder: '項目名・値で検索', width: 'wide', noSubmit: true, ariaLabel: '差分結果を検索' });
  const filterClear = makeButton('クリア', 'ghost');
  cardFilter.body.appendChild(makeRow([filterSection, filterType, filterClear], { label: 'フィルタ' }));
  cardFilter.body.appendChild(makeRow(filterSearch, { label: '検索' }));
  const charDiffCb = makeCheck({ label: '文字単位ハイライト', checked: true, help: '変更行で「どこが変わったか」を文字単位で強調表示します' });
  const densitySelect = makeSelect([
    ['compact', 'コンパクト'],
    ['standard', '標準'],
    ['comfortable', 'ゆったり']
  ], 'standard');
  densitySelect.setAttribute('aria-label', '差分一覧の表示密度');
  const layoutSelect = makeSelect([
    ['split', '左右に比較'],
    ['stacked', '上下に比較（長文向け）']
  ], 'split');
  layoutSelect.setAttribute('aria-label', '差分一覧の比較レイアウト');
  cardFilter.body.appendChild(makeRow([charDiffCb.label, densitySelect, layoutSelect], { label: '表示' }));
  let filterRenderTimer: number | undefined;
  const resetResultPage = () => { resultLimit = RESULT_PAGE_SIZE; };
  const rerenderFromFilter = () => {
    if (!cache) return;
    resetResultPage();
    currentRowKey = '';
    rerender();
  };
  filterClear.addEventListener('click', () => {
    filterSection.value = '';
    filterType.value = '';
    filterSearch.value = '';
    rerenderFromFilter();
  });
  [filterSection, filterType].forEach((el) => el.addEventListener('change', rerenderFromFilter));
  filterSearch.addEventListener('input', () => {
    if (filterRenderTimer !== undefined) window.clearTimeout(filterRenderTimer);
    filterRenderTimer = window.setTimeout(rerenderFromFilter, 160);
  });
  // 複数比較の結果表は cache を使わず描画するため、単一比較の結果がある時だけ再描画する。
  charDiffCb.checkbox.addEventListener('change', () => { if (cache) rerender(); });
  densitySelect.addEventListener('change', () => { if (cache) rerender(); });
  layoutSelect.addEventListener('change', () => { if (cache) rerender(); });
  showResultList.checkbox.addEventListener('change', () => { if (cache) rerender(); });
  panel.body.insertBefore(cardFilter.card, panel.status);

  // ---- 結果表示エリア（HTMLテーブル） ----
  const cardResult = makeCard({ title: '結果', soft: true });
  cardResult.card.style.display = 'none';
  const resultBox = document.createElement('div');
  resultBox.className = 'kus-dl-result';
  resultBox.dataset.kusDlResult = '';
  cardResult.body.appendChild(resultBox);
  panel.body.insertBefore(cardResult.card, panel.status);

  // ---- 出力（再出力用。初回は比較実行時に自動保存される） ----
  const cardOut = makeCard({ title: '出力', number: 3, soft: true });
  cardOut.body.appendChild(makeNote('レビュー用 HTML は比較実行時に自動保存されます。共有する場合は、全件または画面で絞り込んだ範囲を Excel で保存してください。Excel には差分値と取得不完全時のエラー等の原文を収録し、長い原文は可視シートへ分割して全文を保持します。'));
  cardOut.body.appendChild(makeNote('変更箇所のみの HTML にも比較元・比較先の値が含まれます。比較設定を含む社内用 HTML はフィールド詳細や反映 JSON も収録するため、取り扱いに注意してください。'));
  const htmlContentMode = makeSelect([
    ['diffOnly', 'レビュー用（変更箇所のみ）'],
    ['withCompared', '社内用（比較設定を含む・取扱注意）']
  ], 'diffOnly');
  htmlContentMode.setAttribute('aria-label', 'HTMLに含める内容');
  cardOut.body.appendChild(makeRow(htmlContentMode, { label: 'HTML内容' }));
  const expRange = makeSelect([
    ['all', '全件'],
    ['filtered', '表示中（フィルタ適用後）']
  ], 'all');
  expRange.setAttribute('aria-label', 'ファイルへ出力する差分の範囲');
  cardOut.body.appendChild(makeRow(expRange, { label: '範囲' }));

  const grid = document.createElement('div');
  grid.className = 'kus-lp__btn-grid';
  const bXlsx = makeButton('Excel を保存 (.xlsx)', 'primary', { icon: '↓' });
  const bHtml = makeButton('レビュー用 HTML を再出力', 'sub', { icon: '↓' });
  bXlsx.dataset.kusDlExport = 'xlsx';
  bHtml.dataset.kusDlExport = 'html';
  grid.appendChild(bXlsx);
  grid.appendChild(bHtml);
  cardOut.body.appendChild(grid);
  let forceFullXlsxExport = false;
  completionReviewBtn.addEventListener('click', () => {
    const overview = resultBox.querySelector<HTMLElement>('[data-kus-dl-overview]');
    if (!overview) return;
    overview.focus({ preventScroll: true });
    overview.scrollIntoView({ block: 'start', behavior: 'auto' });
  });
  completionXlsxBtn.addEventListener('click', () => {
    if (bXlsx.disabled) return;
    forceFullXlsxExport = true;
    bXlsx.click();
  });
  // 出力カードは結果カードの前に挿入し、差分件数が多くても結果リストの下までスクロールせず
  // 出力ボタンへすぐ届くようにする
  panel.body.insertBefore(cardOut.card, cardResult.card);

  // ---- 白紙から組み直したワークフロー ----
  const workflow = document.createElement('div');
  workflow.className = 'kus-dl-workflow';
  workflow.setAttribute('role', 'region');
  workflow.setAttribute('aria-label', '差分比較の手順');
  const makeWorkflowStep = (key: 'target' | 'review' | 'export', number: string, title: string, description: string) => {
    const section = document.createElement('section');
    section.className = 'kus-dl-step';
    section.dataset.kusDlStep = key;
    const headingId = `kus-dl-step-${key}`;
    section.setAttribute('aria-labelledby', headingId);
    section.innerHTML = `<header class="kus-dl-step__header"><span class="kus-dl-step__number" aria-hidden="true">${number}</span><div><h2 id="${headingId}">${title}</h2><p>${description}</p></div></header>`;
    return section;
  };
  const targetStep = makeWorkflowStep('target', '1', '比較対象を決める', '比較元から比較先へ、どの設定が変わったかを確認します。');
  const reviewStep = makeWorkflowStep('review', '2', '結果を確認する', '取得の完全性を確認してから、差分を順にレビューします。');
  const exportStep = makeWorkflowStep('export', '3', '結果を出力する', 'Excel または社内確認用の HTML を保存できます。');

  const configDetails = document.createElement('details');
  configDetails.className = 'kus-dl-disclosure';
  configDetails.innerHTML = '<summary><span>比較範囲と詳細設定</span><small>セクション、JSON読込、無視ルール、比較条件</small></summary>';
  const configBody = document.createElement('div');
  configBody.className = 'kus-dl-disclosure__body';
  configBody.append(cardScope.card, cardImport.card, advDetails.details);
  configDetails.appendChild(configBody);

  const filterDetails = document.createElement('details');
  filterDetails.className = 'kus-dl-disclosure kus-dl-filter-disclosure';
  filterDetails.open = true;
  filterDetails.style.display = 'none';
  filterDetails.innerHTML = '<summary><span>絞り込みと表示</span><small>セクション、種別、検索、表示方法</small></summary>';
  const filterBody = document.createElement('div');
  filterBody.className = 'kus-dl-disclosure__body';
  filterBody.appendChild(cardFilter.card);
  filterDetails.appendChild(filterBody);

  const outputDetails = document.createElement('details');
  outputDetails.className = 'kus-dl-disclosure kus-dl-output-disclosure';
  outputDetails.innerHTML = '<summary><span>出力設定と保存ボタン</span><small>比較後に利用できます</small></summary>';
  const outputBody = document.createElement('div');
  outputBody.className = 'kus-dl-disclosure__body';
  outputBody.appendChild(cardOut.card);
  outputDetails.appendChild(outputBody);

  const reviewEmpty = document.createElement('p');
  reviewEmpty.className = 'kus-dl-step__empty';
  reviewEmpty.dataset.kusDlResultEmpty = '';
  reviewEmpty.textContent = '比較を実行すると、ここに完全性と差分の一覧が表示されます。';

  targetStep.append(cardApp.card, appReferenceExclusion, configDetails, runRow, completionRow, panel.status);
  reviewStep.append(reviewEmpty, filterDetails, cardResult.card);
  exportStep.appendChild(outputDetails);
  workflow.append(targetStep, reviewStep, exportStep);
  [targetStep, reviewStep, exportStep].forEach(step => { step.style.scrollMarginTop = '80px'; });
  installWorkflowNavigation(panel, [
    { label: '比較対象', element: targetStep },
    { label: '差分を確認', element: reviewStep },
    { label: '結果を保存', element: exportStep, open: () => { outputDetails.open = true; } }
  ]);
  panel.body.insertBefore(workflow, panel.result);

  const setExportControlsEnabled = (enabled: boolean) => {
    expRange.disabled = !enabled;
    bXlsx.disabled = !enabled;
    bHtml.disabled = !enabled;
    completionReviewBtn.disabled = !enabled;
    completionXlsxBtn.disabled = !enabled;
  };
  setExportControlsEnabled(false);

  // ---- 状態 ----
  let cache: DiffCache | null = null;
  let multiXlsxExports: MultiXlsxExportItem[] = [];
  let multiXlsxExportActive = false;
  let diffRunActive = false;
  let profileIoActive = false;
  let summaryText = '';
  let resultLimit = RESULT_PAGE_SIZE;
  let currentRowKey = '';
  let announceResultOverview = false;
  const collapsedSections = new Set<string>();
  const expandedValueKeys = new Set<string>();
  const expandedRowKeys = new Set<string>();
  let importedSourceBundle: any = null;
  let importedTargetBundle: any = null;

  function invalidateComparisonResult(statusMessage: string): boolean {
    const hadResult = !!cache || multiXlsxExports.length > 0 || resultBox.childElementCount > 0;
    if (!hadResult) return false;
    cache = null;
    multiXlsxExports = [];
    currentRowKey = '';
    collapsedSections.clear();
    expandedValueKeys.clear();
    expandedRowKeys.clear();
    summaryText = '';
    resetResultPage();
    setCompletionActionsVisible(false);
    setExportControlsEnabled(false);
    resultBox.innerHTML = '';
    cardResult.card.style.display = 'none';
    cardFilter.card.style.display = 'none';
    filterDetails.style.display = 'none';
    reviewEmpty.textContent = '比較条件が変更されました。再比較すると新しい条件の結果を表示します。';
    reviewEmpty.style.display = '';
    panel.setStatus(statusMessage, 'warn');
    return true;
  }

  function invalidateResultAfterAppReferenceConditionChange() {
    invalidateComparisonResult('環境固有IDの除外条件を変更したため、前回の結果と保存機能を無効にしました。新しい条件で再比較してください');
  }

  function invalidateResultAfterPairConditionChange(): boolean {
    return invalidateComparisonResult('比較ペアを変更したため、前回の一括結果と保存機能を無効にしました。新しいペアで再比較してください');
  }

  function invalidateResultAfterComparisonModeChange(): boolean {
    return invalidateComparisonResult('比較方法を変更したため、前回の結果と保存機能を無効にしました。選択した方法で再比較してください');
  }

  function invalidateResultAfterGeneralConditionChange(): boolean {
    return invalidateComparisonResult('比較範囲または比較条件を変更したため、前回の結果と保存機能を無効にしました。新しい条件で再比較してください');
  }

  function invalidateResultAfterAppSelectionChange(): boolean {
    return invalidateComparisonResult('比較するアプリまたは環境を変更したため、前回の結果と保存機能を無効にしました。新しい対象で再比較してください');
  }

  nAppRefs.checkbox.addEventListener('change', invalidateResultAfterAppReferenceConditionChange);
  chipBox.addEventListener('change', invalidateResultAfterGeneralConditionChange);
  ignTa.addEventListener('input', invalidateResultAfterGeneralConditionChange);
  includeSame.checkbox.addEventListener('change', invalidateResultAfterGeneralConditionChange);
  Object.entries(normalizationControls).forEach(([key, checkbox]) => {
    if (key !== 'appReferences') checkbox.addEventListener('change', invalidateResultAfterGeneralConditionChange);
  });

  swapBtn.addEventListener('click', () => {
    if (comparisonMode !== 'single') {
      panel.setStatus('このボタンでの比較方向の入れ替えは、1対1比較で利用できます', 'warn');
      return;
    }
    if (importedSourceBundle || importedTargetBundle) {
      panel.setStatus('設定JSONを読み込んでいる間は方向を入れ替えられません。読込を解除してから実行してください', 'warn');
      return;
    }
    const source = {
      appId: srcApp.value,
      guestId: srcGuest.value,
      preview: srcPrev.checkbox.checked,
      appName: sourceAppName
    };
    srcApp.value = tgtApp.value;
    srcGuest.value = tgtGuest.value;
    srcPrev.checkbox.checked = tgtPrev.checkbox.checked;
    setSourceName(targetRows[0]?.appName || '');
    tgtApp.value = source.appId;
    tgtGuest.value = source.guestId;
    tgtPrev.checkbox.checked = source.preview;
    setTargetName(targetRows[0], source.appName);
    const invalidated = invalidateResultAfterAppSelectionChange();
    if (!invalidated) panel.setStatus('比較元と比較先を入れ替えました。矢印の向きを確認して比較してください', 'info');
  });

  srcFile.addEventListener('change', () => liteRun(panel, '比較元JSONを読み込み中…', async () => {
    const file = srcFile.files?.[0];
    if (!file) return;
    setCompletionActionsVisible(false);
    importedSourceBundle = await readSettingsBundleFile(file, { side: 'source', appId: srcApp.value.trim() });
    if (!srcApp.value.trim() && importedSourceBundle?.appId) srcApp.value = String(importedSourceBundle.appId);
    setSourceName(extractAppNameFromBundle(importedSourceBundle));
    pairClearImportBtn.disabled = false;
    pairClearImportBtn.hidden = false;
    const invalidated = invalidateResultAfterAppSelectionChange();
    panel.setStatus(`比較元JSONを読み込みました: App ${importedSourceBundle?.appId || '-'}${invalidated ? '。結果を更新するため再比較してください' : ''}`, invalidated ? 'warn' : 'ok');
  }));
  tgtFile.addEventListener('change', () => liteRun(panel, '比較先JSONを読み込み中…', async () => {
    const file = tgtFile.files?.[0];
    if (!file) return;
    setCompletionActionsVisible(false);
    importedTargetBundle = await readSettingsBundleFile(file, { side: 'target', appId: tgtApp.value.trim() });
    if (!tgtApp.value.trim() && importedTargetBundle?.appId) tgtApp.value = String(importedTargetBundle.appId);
    setTargetName(targetRows[0], extractAppNameFromBundle(importedTargetBundle));
    pairClearImportBtn.disabled = false;
    pairClearImportBtn.hidden = false;
    const invalidated = invalidateResultAfterAppSelectionChange();
    panel.setStatus(`比較先JSONを読み込みました: App ${importedTargetBundle?.appId || '-'}${invalidated ? '。結果を更新するため再比較してください' : ''}`, invalidated ? 'warn' : 'ok');
  }));
  const clearImportedBundles = () => {
    importedSourceBundle = null;
    importedTargetBundle = null;
    srcFile.value = '';
    tgtFile.value = '';
    pairClearImportBtn.disabled = true;
    pairClearImportBtn.hidden = true;
    setCompletionActionsVisible(false);
    const invalidated = invalidateResultAfterAppSelectionChange();
    panel.setStatus(invalidated ? '設定JSONの読込を解除し、前回の結果を無効にしました。再比較してください' : '設定JSONの読込を解除しました', invalidated ? 'warn' : 'info');
  };
  clearImportBtn.addEventListener('click', clearImportedBundles);
  pairClearImportBtn.addEventListener('click', clearImportedBundles);

  function readTargets() {
    const seen = new Set<string>();
    return targetRows
      .map((r) => ({ appId: r.app.value.trim(), guestId: r.guest.value.trim(), preview: tgtPrev.checkbox.checked, appName: r.appName }))
      .filter((t) => t.appId)
      .filter((t) => {
        const key = `${t.appId}::${t.guestId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function readForm() {
    return {
      source: { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked, appName: sourceAppName },
      target: { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: tgtPrev.checkbox.checked, appName: targetRows[0]?.appName || '' },
      scopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
      ignoreKeys: ignTa.value,
      includeSame: includeSame.checkbox.checked,
      normalizationPresetState: {
        viewOrder: nView.checkbox.checked,
        permissionOrder: nPerm.checkbox.checked,
        generalArrayOrder: nAll.checkbox.checked,
        fieldOrder: nField.checkbox.checked,
        processOrder: nProcess.checkbox.checked,
        appReferences: nAppRefs.checkbox.checked,
        auditMeta: nAudit.checkbox.checked,
        labelsAndText: nText.checkbox.checked,
        appearance: nAppearance.checkbox.checked,
        fileKeys: nFileKeys.checkbox.checked,
        enabledFlags: nEnabled.checkbox.checked
      }
    };
  }

  profileSaveBtn.addEventListener('click', () => {
    if (diffRunActive || profileIoActive) {
      panel.setStatus('比較または比較条件の読込が完了してから保存してください', 'warn');
      return;
    }
    try {
      const form = readForm();
      const profile = buildDiffComparisonProfile({
        name: profileName.value.trim() || '比較条件',
        savedAt: new Date().toISOString(),
        scopes: form.scopes,
        ignoreKeys: form.ignoreKeys,
        includeSame: form.includeSame,
        normalizationPresetState: form.normalizationPresetState,
        display: {
          charDiff: charDiffCb.checkbox.checked,
          showResultList: showResultList.checkbox.checked,
          density: densitySelect.value,
          layout: layoutSelect.value
        }
      });
      downloadText(`差分比較条件_${nowStamp()}.json`, serializeDiffComparisonProfile(profile), 'application/json;charset=utf-8');
      panel.setStatus(`比較条件「${profile.name}」を保存しました（アプリID・設定値は含みません）`, 'ok');
    } catch (error: any) {
      panel.setStatus(`比較条件の保存に失敗しました: ${error?.message || String(error)}`, 'err');
    }
  });
  profileLoadBtn.addEventListener('click', () => {
    if (diffRunActive || profileIoActive) {
      panel.setStatus('比較が完了してから比較条件を読み込んでください', 'warn');
      return;
    }
    profileFile.click();
  });
  profileFile.addEventListener('change', async () => {
    const file = profileFile.files?.[0];
    if (!file) return;
    if (diffRunActive || profileIoActive) {
      profileFile.value = '';
      panel.setStatus('比較が完了してから比較条件を読み込んでください', 'warn');
      return;
    }
    profileIoActive = true;
    profileSaveBtn.disabled = true;
    profileLoadBtn.disabled = true;
    runBtn.disabled = true;
    runAllBtn.disabled = true;
    runPairsBtn.disabled = true;
    try {
      await liteRun(panel, '比較条件を読み込み中…', async () => {
        const profile = parseDiffComparisonProfile(await readTextFile(file));
        const selectedScopes = new Set(profile.scopes);
        chips.forEach((chip) => { chip.checkbox.checked = selectedScopes.has(chip.checkbox.value); });
        ignTa.value = profile.ignoreKeys;
        includeSame.checkbox.checked = profile.includeSame;
        for (const [key, checkbox] of Object.entries(normalizationControls)) {
          checkbox.checked = profile.normalizationPresetState[key] === true;
        }
        profileName.value = profile.name;
        charDiffCb.checkbox.checked = profile.display.charDiff;
        showResultList.checkbox.checked = profile.display.showResultList;
        densitySelect.value = profile.display.density;
        layoutSelect.value = profile.display.layout;
        cache = null;
        multiXlsxExports = [];
        currentRowKey = '';
        collapsedSections.clear();
        expandedValueKeys.clear();
        expandedRowKeys.clear();
        setCompletionActionsVisible(false);
        summaryText = '';
        resetResultPage();
        setExportControlsEnabled(false);
        resultBox.innerHTML = '';
        cardResult.card.style.display = 'none';
        cardFilter.card.style.display = 'none';
        filterDetails.style.display = 'none';
        reviewEmpty.style.display = '';
        const ruleSummary = summarizeLiteIgnoreRules(profile.ignoreKeys);
        const pathWarning = ruleSummary.positionalRules
          ? ` 配列番号を含む位置依存ルール ${ruleSummary.positionalRules}件は、並び替え後に別の対象を隠す可能性があります。削除または見直してから再比較してください。`
          : (ruleSummary.contextualRules
            ? ` 完全パス/パターン ${ruleSummary.contextualRules}件を含むため、再比較前に無視ルールを確認してください。`
            : '');
        const appReferenceMigrationNote = profile.normalizationPresetState.appReferences
          ? ' 「環境固有ID（アプリ・一覧・グラフ・アクション）」は意味が確定する内部IDだけを除外します。以前保存した条件でも一般的な app / id キーやプラグインIDは除外しません。'
          : '';
        panel.setStatus(`比較条件「${profile.name}」を読み込みました（対象 ${profile.scopes.length}セクション / 無視 ${ruleSummary.total}件）。アプリと環境は変更していません。結果を更新するため再比較してください。${appReferenceMigrationNote}${pathWarning}`, 'warn');
      });
    } finally {
      profileFile.value = '';
      profileIoActive = false;
      profileSaveBtn.disabled = false;
      profileLoadBtn.disabled = false;
      runBtn.disabled = diffRunActive || pairFolderLoadActive();
      runAllBtn.disabled = diffRunActive || pairFolderLoadActive();
      runPairsBtn.disabled = diffRunActive || pairFolderLoadActive();
    }
  });

  function currentFilters() {
    return {
      section: filterSection.value,
      type: filterType.value,
      keyword: filterSearch.value.trim().toLowerCase()
    };
  }

  function filteredRows(): DiffRow[] {
    if (!cache) return [];
    const f = currentFilters();
    return cache.rows.filter((r) => rowMatchesFilters(r, f));
  }

  function attachKnownAppName(bundle: any, appName: string) {
    const name = String(appName || '').trim();
    if (!bundle || !name || extractAppNameFromBundle(bundle)) return;
    if (!bundle.meta || typeof bundle.meta !== 'object') bundle.meta = {};
    bundle.meta.appName = name;
  }

  function refreshFilterSectionOptions() {
    if (!cache) return;
    const set = new Set(cache.rows.map((r) => r.sectionKey).filter(Boolean));
    const prev = filterSection.value;
    filterSection.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = ''; optAll.textContent = '全セクション';
    filterSection.appendChild(optAll);
    for (const def of SECTION_DEFS) {
      if (set.has(def.key)) {
        const o = document.createElement('option');
        o.value = def.key; o.textContent = def.label;
        filterSection.appendChild(o);
      }
    }
    if ([...filterSection.options].some((o) => o.value === prev)) filterSection.value = prev;
  }

  function navigableRows(rows: DiffRow[] = filteredRows()): DiffRow[] {
    return rows.filter((row) => row.type !== 'same' && !row._displayOnly);
  }

  function activeFilters(): Array<{ key: 'section' | 'type' | 'keyword'; label: string }> {
    const filters: Array<{ key: 'section' | 'type' | 'keyword'; label: string }> = [];
    if (filterSection.value) filters.push({ key: 'section', label: filterSection.selectedOptions[0]?.textContent || filterSection.value });
    if (filterType.value) filters.push({ key: 'type', label: filterType.selectedOptions[0]?.textContent || filterType.value });
    const keyword = filterSearch.value.trim();
    if (keyword) filters.push({ key: 'keyword', label: `検索: ${keyword.length > 28 ? `${keyword.slice(0, 28)}…` : keyword}` });
    return filters;
  }

  function exportFilterDescription(isAll: boolean): string {
    if (isAll) return 'フィルターなし（比較結果の全件）';
    return buildLiteDiffFilterDescription({
      section: filterSection.value,
      sectionLabel: filterSection.selectedOptions[0]?.textContent || '',
      type: filterType.value,
      typeLabel: filterType.selectedOptions[0]?.textContent || '',
      keyword: filterSearch.value.trim()
    });
  }

  function renderActiveFilterChipsHtml(): string {
    const filters = activeFilters();
    if (!filters.length) return '<span class="kus-dl-filter-empty">フィルタなし · 全差分</span>';
    const chipsHtml = filters.map((filter) =>
      `<button type="button" class="kus-dl-filterchip" data-kus-dl-clear-filter="${filter.key}" aria-label="フィルタ「${esc(filter.label)}」を解除"><span>${esc(filter.label)}</span></button>`
    ).join('');
    const clearAll = filters.length > 1
      ? '<button type="button" class="kus-dl-filterchip kus-dl-filterchip--all" data-kus-dl-clear-filter="all" aria-label="すべてのフィルタを解除"><span>すべて解除</span></button>'
      : '';
    return chipsHtml + clearAll;
  }

  function renderReviewBarHtml(
    rows: DiffRow[],
    source: { name: string; environment: string },
    target: { name: string; environment: string }
  ): string {
    const queue = navigableRows(rows);
    const currentIndex = currentRowKey ? queue.findIndex((row) => buildLiteDiffRowKey(row) === currentRowKey) : -1;
    const position = currentIndex >= 0 ? currentIndex + 1 : 0;
    const prevDisabled = !queue.length || currentIndex === 0;
    const nextDisabled = !queue.length || currentIndex === queue.length - 1;
    const incomplete = isIncompleteLiteDiff(cache);
    const progressLabel = position ? `${position} / 全${queue.length}件目` : `未選択 / 全${queue.length}件`;
    return `<div class="kus-dl-contextbar" role="group" aria-label="比較方向と確認位置">` +
      `<div class="kus-dl-contextlane kus-dl-contextlane--before" title="${esc(`${source.name} · ${source.environment}`)}"><span class="kus-dl-contextlane__role">BEFORE · 比較元</span><strong class="kus-dl-contextlane__name">${esc(source.name)}</strong></div>` +
      `<div class="kus-dl-progress kus-dl-reviewbar__count" role="status" aria-live="polite" aria-atomic="true" aria-label="${esc(progressLabel + (incomplete ? '・比較不完全' : ''))}"><span class="kus-dl-progress__numbers"><strong class="kus-dl-progress__current">${position || '—'}</strong><span class="kus-dl-progress__total">/ ${queue.length}</span></span><span class="kus-dl-progress__label">${incomplete ? '比較不完全' : (position ? '確認位置' : '未選択')}</span></div>` +
      `<div class="kus-dl-contextlane kus-dl-contextlane--after" title="${esc(`${target.name} · ${target.environment}`)}"><span class="kus-dl-contextlane__role">AFTER · 比較先</span><strong class="kus-dl-contextlane__name">${esc(target.name)}</strong></div></div>` +
      `<nav class="kus-dl-reviewbar" aria-label="差分レビュー操作">` +
      `<span class="kus-dl-reviewbar__nav"><button type="button" class="kus-dl-navbtn" data-kus-dl-nav="prev" aria-keyshortcuts="K"${prevDisabled ? ' disabled' : ''}>↑ 前 (K)</button>` +
      `<button type="button" class="kus-dl-navbtn" data-kus-dl-nav="next" aria-keyshortcuts="J"${nextDisabled ? ' disabled' : ''}>次 (J) ↓</button></span>` +
      `<span class="kus-dl-reviewbar__tools"><button type="button" class="kus-dl-navbtn" data-kus-dl-sections="collapse">すべて折りたたむ</button>` +
      `<button type="button" class="kus-dl-navbtn" data-kus-dl-sections="expand">すべて展開</button></span>` +
      `<span class="kus-dl-reviewbar__filters" aria-label="有効なフィルタ">${renderActiveFilterChipsHtml()}</span></nav>`;
  }

  function focusAppliedFilter(key: 'type' | 'section') {
    window.requestAnimationFrame(() => {
      const chip = resultBox.querySelector<HTMLButtonElement>(`[data-kus-dl-clear-filter="${key}"]`);
      const input = key === 'type' ? filterType : filterSection;
      const summary = filterDetails.querySelector<HTMLElement>('summary');
      const candidates: Array<HTMLElement | null> = [chip, input, summary];
      const target = candidates.find((element) => {
        if (!element || element.hidden || element.getClientRects().length === 0) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      target?.focus({ preventScroll: true });
    });
  }

  function focusRenderedRow(rowKey: string) {
    window.requestAnimationFrame(() => {
      const row = resultBox.querySelector<HTMLElement>(`[data-kus-dl-row-key="${rowKey}"]`);
      if (!row) return;
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
  }

  function moveResultFocus(delta: number) {
    if (!cache) return;
    const rows = filteredRows();
    const queue = navigableRows(rows);
    if (!queue.length) {
      panel.setStatus('現在のフィルタに移動できる差分がありません', 'info');
      return;
    }
    const currentIndex = currentRowKey ? queue.findIndex((row) => buildLiteDiffRowKey(row) === currentRowKey) : -1;
    const nextIndex = currentIndex < 0 ? (delta < 0 ? queue.length - 1 : 0) : currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= queue.length) {
      panel.setStatus(nextIndex < 0 ? '最初の差分です' : '最後の差分です', 'info');
      return;
    }
    const nextRow = queue[nextIndex];
    currentRowKey = buildLiteDiffRowKey(nextRow);
    collapsedSections.delete(nextRow.sectionKey || '(その他)');
    const filteredIndex = rows.indexOf(nextRow);
    if (filteredIndex >= resultLimit) {
      resultLimit = Math.ceil((filteredIndex + 1) / RESULT_PAGE_SIZE) * RESULT_PAGE_SIZE;
    }
    rerender();
    focusRenderedRow(currentRowKey);
  }

  function rerender() {
    if (!cache) {
      resultBox.innerHTML = '';
      cardResult.card.style.display = 'none';
      cardFilter.card.style.display = 'none';
      filterDetails.style.display = 'none';
      reviewEmpty.style.display = '';
      return;
    }
    const overview = renderLiteDiffOverviewHtml(cache, { announce: announceResultOverview });
    announceResultOverview = false;
    cardResult.card.style.display = 'block';
    reviewEmpty.style.display = 'none';
    if (!showResultList.checkbox.checked) {
      resultBox.innerHTML = overview;
      cardFilter.card.style.display = 'none';
      filterDetails.style.display = 'none';
      return;
    }
    const rows = filteredRows();
    if (currentRowKey && !navigableRows(rows).some((row) => buildLiteDiffRowKey(row) === currentRowKey)) currentRowKey = '';
    const visibleRows = rows.slice(0, resultLimit);
    const summary = `<strong>${visibleRows.length}</strong> / ${rows.length}件を表示${rows.length !== cache.rows.length ? `（比較結果全体 ${cache.rows.length}件）` : ''}`;
    const source = displayBundleSide(cache.sourceBundle, '比較元');
    const target = displayBundleSide(cache.targetBundle, '比較先');
    const more = rows.length > visibleRows.length
      ? `<div class="kus-dl-more"><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-more>さらに ${Math.min(RESULT_PAGE_SIZE, rows.length - visibleRows.length)} 件表示（残り ${rows.length - visibleRows.length} 件）</button></div>`
      : '';
    resultBox.className = `kus-dl-result kus-dl-result--${densitySelect.value} kus-dl-result--${layoutSelect.value}`;
    resultBox.innerHTML = overview + `<div class="kus-dl-sticky">${renderReviewBarHtml(rows, source, target)}</div>` + renderRowsHtml(visibleRows, charDiffCb.checkbox.checked, summary, rows, { collapsedSections, currentRowKey, expandedValueKeys, expandedRowKeys }) + more;
    cardFilter.card.style.display = 'block';
    filterDetails.style.display = '';
  }

  resultBox.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement | null;
    const clearFilterButton = target?.closest<HTMLButtonElement>('[data-kus-dl-clear-filter]');
    if (clearFilterButton) {
      const key = clearFilterButton.dataset.kusDlClearFilter || '';
      if (key === 'all' || key === 'section') filterSection.value = '';
      if (key === 'all' || key === 'type') filterType.value = '';
      if (key === 'all' || key === 'keyword') filterSearch.value = '';
      if (filterRenderTimer !== undefined) {
        window.clearTimeout(filterRenderTimer);
        filterRenderTimer = undefined;
      }
      rerenderFromFilter();
      window.requestAnimationFrame(() => {
        (resultBox.querySelector<HTMLButtonElement>('[data-kus-dl-clear-filter]') ||
          resultBox.querySelector<HTMLButtonElement>('[data-kus-dl-nav="next"]'))?.focus();
      });
      return;
    }
    const mobileRowToggle = target?.closest<HTMLButtonElement>('[data-kus-dl-mobile-row-toggle]');
    if (mobileRowToggle) {
      const rowKey = mobileRowToggle.dataset.kusDlMobileRowToggle || '';
      if (!rowKey) return;
      if (expandedRowKeys.has(rowKey)) expandedRowKeys.delete(rowKey);
      else expandedRowKeys.add(rowKey);
      rerender();
      window.requestAnimationFrame(() => {
        resultBox.querySelector<HTMLButtonElement>(`[data-kus-dl-mobile-row-toggle="${rowKey}"]`)?.focus({ preventScroll: true });
      });
      return;
    }
    const valueToggle = target?.closest<HTMLButtonElement>('[data-kus-dl-value-toggle]');
    if (valueToggle) {
      const valueKey = valueToggle.dataset.kusDlValueToggle || '';
      const wrapper = valueToggle.closest<HTMLElement>('.kus-dl-value');
      if (!valueKey || !wrapper) return;
      const expanded = valueToggle.getAttribute('aria-expanded') !== 'true';
      wrapper.classList.toggle('is-expanded', expanded);
      wrapper.classList.toggle('is-collapsed', !expanded);
      valueToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      valueToggle.textContent = expanded ? 'プレビューに戻す' : '全文を展開';
      if (expanded) expandedValueKeys.add(valueKey);
      else expandedValueKeys.delete(valueKey);
      return;
    }
    const navButton = target?.closest<HTMLButtonElement>('[data-kus-dl-nav]');
    if (navButton) {
      moveResultFocus(navButton.dataset.kusDlNav === 'prev' ? -1 : 1);
      return;
    }
    const sectionControl = target?.closest<HTMLButtonElement>('[data-kus-dl-sections]');
    if (sectionControl) {
      const action = sectionControl.dataset.kusDlSections || '';
      if (sectionControl.dataset.kusDlSections === 'collapse') {
        for (const row of filteredRows()) collapsedSections.add(row.sectionKey || '(その他)');
      } else {
        collapsedSections.clear();
      }
      rerender();
      window.requestAnimationFrame(() => {
        resultBox.querySelector<HTMLButtonElement>(`[data-kus-dl-sections="${action}"]`)?.focus();
      });
      return;
    }
    const ignorePathButton = target?.closest<HTMLButtonElement>('[data-kus-dl-ignore-path]');
    if (ignorePathButton) {
      const path = String(ignorePathButton.dataset.kusDlIgnorePath || '').trim();
      if (!path) return;
      if (/\[\d+\]/.test(path)) {
        panel.setStatus('配列番号を含むパスは並び替えで別の対象を指すため、自動では無視できません', 'warn');
        return;
      }
      const exactRule = encodeExactIgnorePathRule(path);
      if (!exactRule) return;
      const existing = ignTa.value.split(/[\n\r,、，;；]+/).map((token) => token.trim()).filter(Boolean);
      if (!existing.some((token) => decodeExactIgnorePathRule(token) === path || token === path)) {
        ignTa.value = `${ignTa.value.trim()}${ignTa.value.trim() ? '\n' : ''}${exactRule}`;
      }
      configDetails.open = true;
      advDetails.details.open = true;
      panel.setStatus('この項目だけを無視ルールへ追加しました。現在の結果は変えず、次回比較から適用します', 'warn');
      return;
    }
    const multiXlsxAllButton = target?.closest<HTMLButtonElement>('[data-kus-dl-multi-xlsx-all]');
    if (multiXlsxAllButton) {
      if (pairFolderLoadActive()) {
        panel.setStatus('フォルダの読込が完了してから前回結果を保存してください', 'warn');
        return;
      }
      if (multiXlsxAllButton.disabled || multiXlsxExportActive || multiXlsxExports.length === 0) return;
      const exportStartedAt = Date.now();
      const sourceItems = multiXlsxExports;
      const snapshot = sourceItems.slice();
      const buttons = [...resultBox.querySelectorAll<HTMLButtonElement>('[data-kus-dl-multi-html], [data-kus-dl-multi-xlsx], [data-kus-dl-multi-xlsx-all]')];
      multiXlsxExportActive = true;
      buttons.forEach((button) => { button.disabled = true; });
      try {
        panel.setStatus(`一括Excelを生成中… 0/${snapshot.length}件`, 'busy');
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const result = await buildDiffXlsxBatchExport(
          snapshot.map((item) => ({
            label: item.label,
            context: buildLiteDiffXlsxContext(
              item.cache,
              item.cache.rows,
              'all',
              '全件',
              'フィルターなし（比較結果の全件）'
            )
          })),
          {
            onProgress: (progress) => {
              if (progress.stage === 'building') {
                panel.setStatus(`一括Excelを生成中… ${progress.current}/${progress.total}件${progress.label ? ` — ${progress.label}` : ''}`, 'busy');
              } else {
                panel.setStatus(`Excel ${progress.total}件をZIPにまとめています…`, 'busy');
              }
            }
          }
        );
        if (multiXlsxExports !== sourceItems) {
          panel.setStatus('比較結果が更新されたため、生成した一括Excelは保存しませんでした。最新の結果からもう一度保存してください', 'warn');
          return;
        }
        downloadBlob(result.filename, result.blob);
        const incomplete = snapshot.filter((item) => isIncompleteLiteDiff(item.cache)).length;
        const notes = [
          result.failures.length ? `Excel生成失敗 ${result.failures.length}件` : '',
          incomplete ? `要確認 ${incomplete}件` : ''
        ].filter(Boolean).join(' / ');
        panel.setStatus(
          `一括Excelのダウンロードを開始しました: ${result.filename}（${result.entries.length}件）${notes ? ` — ${notes}` : ''}`,
          result.failures.length || incomplete ? 'warn' : 'ok'
        );
      } catch (e: any) {
        panel.setStatus(`一括Excel出力エラー: ${e?.message || String(e)}`, 'err');
      } finally {
        const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
        if (cooldown > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, cooldown));
        multiXlsxExportActive = false;
        buttons.forEach((button) => {
          if (button.isConnected) button.disabled = false;
        });
      }
      return;
    }
    const multiHtmlButton = target?.closest<HTMLButtonElement>('[data-kus-dl-multi-html]');
    if (multiHtmlButton) {
      if (pairFolderLoadActive()) {
        panel.setStatus('フォルダの読込が完了してから前回結果を保存してください', 'warn');
        return;
      }
      const index = Number(multiHtmlButton.dataset.kusDlMultiHtml);
      const item = Number.isInteger(index) ? multiXlsxExports[index] : null;
      if (!item || multiHtmlButton.disabled || multiXlsxExportActive) return;
      multiXlsxExportActive = true;
      multiHtmlButton.disabled = true;
      try {
        const result = runExportDiffHtmlStandalone(buildLiteDiffHtmlContext(
          item.cache,
          item.cache.rows,
          'all',
          '全差分',
          htmlContentMode.value
        ));
        const incomplete = isIncompleteLiteDiff(item.cache);
        panel.setStatus(`${item.label} の差分 HTML のダウンロードを開始しました: ${result.filename}${incomplete ? ' — 比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
      } catch (e: any) {
        panel.setStatus(`HTML出力エラー: ${e?.message || String(e)}`, 'err');
      } finally {
        multiXlsxExportActive = false;
        multiHtmlButton.disabled = false;
      }
      return;
    }
    const multiXlsxButton = target?.closest<HTMLButtonElement>('[data-kus-dl-multi-xlsx]');
    if (multiXlsxButton) {
      if (pairFolderLoadActive()) {
        panel.setStatus('フォルダの読込が完了してから前回結果を保存してください', 'warn');
        return;
      }
      const index = Number(multiXlsxButton.dataset.kusDlMultiXlsx);
      const item = Number.isInteger(index) ? multiXlsxExports[index] : null;
      if (!item || multiXlsxButton.disabled || multiXlsxExportActive) return;
      const exportStartedAt = Date.now();
      multiXlsxExportActive = true;
      multiXlsxButton.disabled = true;
      try {
        panel.setStatus(`${item.label} の差分一覧 Excel を生成中…`, 'busy');
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const result = runExportDiffXlsx(buildLiteDiffXlsxContext(
          item.cache,
          item.cache.rows,
          'all',
          '全件',
          'フィルターなし（比較結果の全件）'
        ));
        const incomplete = isIncompleteLiteDiff(item.cache);
        panel.setStatus(`${item.label} の差分一覧 Excel のダウンロードを開始しました: ${result.filename}${incomplete ? ' — 比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
      } catch (e: any) {
        panel.setStatus(`Excel出力エラー: ${e?.message || String(e)}`, 'err');
      } finally {
        const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
        if (cooldown > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, cooldown));
        multiXlsxExportActive = false;
        multiXlsxButton.disabled = false;
      }
      return;
    }
    const typeButton = target?.closest<HTMLElement>('[data-kus-dl-type-filter]');
    if (typeButton) {
      showResultList.checkbox.checked = true;
      filterType.value = typeButton.dataset.kusDlTypeFilter || '';
      rerenderFromFilter();
      focusAppliedFilter('type');
      return;
    }
    const sectionButton = target?.closest<HTMLElement>('[data-kus-dl-section-filter]');
    if (sectionButton) {
      showResultList.checkbox.checked = true;
      filterSection.value = sectionButton.dataset.kusDlSectionFilter || '';
      rerenderFromFilter();
      focusAppliedFilter('section');
      return;
    }
    if (target?.closest('[data-kus-dl-more]')) {
      resultLimit += RESULT_PAGE_SIZE;
      rerender();
    }
  });

  resultBox.addEventListener('toggle', (event) => {
    const details = event.target as HTMLDetailsElement | null;
    if (!details?.matches?.('[data-kus-dl-section-key]')) return;
    const key = details.dataset.kusDlSectionKey || '';
    if (!key) return;
    if (details.open) collapsedSections.delete(key);
    else collapsedSections.add(key);
  }, true);

  panel.body.addEventListener('keydown', (event) => {
    if (!cache || !showResultList.checkbox.checked || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
    const key = event.key.toLowerCase();
    if (key !== 'j' && key !== 'k') return;
    event.preventDefault();
    moveResultFocus(key === 'j' ? 1 : -1);
  });

  function exportCtx(forceAll = false) {
    if (!cache) throw new Error('先に差分比較を実行してください');
    const isAll = forceAll || expRange.value === 'all';
    const rows = isAll ? cache.rows : filteredRows();
    const htmlContext = buildLiteDiffHtmlContext(
      cache,
      rows,
      isAll ? 'all' : 'filtered',
      isAll ? '全差分' : '表示中（フィルタ適用後）',
      htmlContentMode.value
    );
    return {
      ...htmlContext,
      filterDescription: exportFilterDescription(isAll)
    };
  }

  let runControlSnapshot: Array<[HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, boolean]> = [];
  function lockComparisonControls() {
    runControlSnapshot = [...panel.body.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('button, input, textarea, select')]
      .map((control) => [control, control.disabled]);
    runControlSnapshot.forEach(([control]) => { control.disabled = true; });
  }
  function unlockComparisonControls() {
    runControlSnapshot.forEach(([control, wasDisabled]) => {
      if (control.isConnected) control.disabled = wasDisabled;
    });
    runControlSnapshot = [];
  }

  async function runDiffTask(busyMessage: string, task: () => Promise<void>) {
    if (pairFolderLoadActive()) {
      panel.setStatus('フォルダの読込が完了してから比較してください', 'warn');
      return;
    }
    if (profileIoActive) {
      panel.setStatus('比較条件の読込が完了してから比較してください', 'warn');
      return;
    }
    if (diffRunActive) {
      panel.setStatus('比較を実行中です。完了までお待ちください', 'warn');
      return;
    }
    diffRunActive = true;
    lockComparisonControls();
    runBtn.disabled = true;
    runAllBtn.disabled = true;
    runPairsBtn.disabled = true;
    htmlContentMode.disabled = true;
    profileSaveBtn.disabled = true;
    profileLoadBtn.disabled = true;
    setExportControlsEnabled(false);
    try {
      await liteRun(panel, busyMessage, task);
    } finally {
      diffRunActive = false;
      unlockComparisonControls();
      runBtn.disabled = pairFolderLoadActive();
      runAllBtn.disabled = pairFolderLoadActive();
      runPairsBtn.disabled = pairFolderLoadActive();
      htmlContentMode.disabled = false;
      profileSaveBtn.disabled = profileIoActive;
      profileLoadBtn.disabled = profileIoActive;
      setExportControlsEnabled(!!cache);
    }
  }

  runPairsBtn.addEventListener('click', () => {
    if (pairFolderLoadActive()) {
      panel.setStatus('比較元・比較先フォルダの読込が完了してから一括比較してください', 'warn');
      return;
    }
    clearPairValidation();
    const folderMode = pairFolderModeActive();
    if (folderMode) {
      if (!pairFolderStates.source || !pairFolderStates.target) {
        panel.setStatus('フォルダ比較では比較元と比較先の両フォルダを選択してください。片側だけをAPIで補うことはありません', 'warn');
        (pairFolderStates.source ? targetFolderUi.select : sourceFolderUi.select).focus();
        return;
      }
      if (pairFolderDraftDirty || !pairFolderApplied) {
        panel.setStatus('フォルダ内アプリの対応付けを確認し、「確認済みペアで現在の表を置き換える」を押してください', 'warn');
        pairFolderMapping.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        const activeDraftRows = pairFolderDraftRows.filter((row) => row.included);
        const targetCounts = new Map<string, number>();
        activeDraftRows.forEach((row) => {
          if (row.targetKey) targetCounts.set(row.targetKey, (targetCounts.get(row.targetKey) || 0) + 1);
        });
        const problemIndex = pairFolderDraftRows.findIndex((row) => row.included && (
          !row.targetKey ||
          (targetCounts.get(row.targetKey) || 0) > 1 ||
          (pairFolderMatchNeedsConfirmation(row) && !row.confirmed)
        ));
        if (problemIndex >= 0) {
          const problem = pairFolderDraftRows[problemIndex];
          focusPairFolderMappingControl(!problem.targetKey || (targetCounts.get(problem.targetKey) || 0) > 1
            ? `[data-kus-dl-folder-target="${problemIndex}"]`
            : `[data-kus-dl-folder-confirm="${problemIndex}"]`);
        } else {
          const usedTargets = new Set(activeDraftRows.map((row) => row.targetKey).filter(Boolean));
          const hasUnusedTarget = (pairFolderStates.target?.result.bundles || []).some((target) => !usedTargets.has(target.endpointKey));
          if (!activeDraftRows.length) {
            focusPairFolderMappingControl('[data-kus-dl-folder-include]');
          } else if (hasUnusedTarget && !pairFolderIgnoreUnusedTargets) {
            focusPairFolderMappingControl('[data-kus-dl-folder-ignore-unused]');
          } else {
            pairFolderApplyBtn.focus();
          }
        }
        return;
      }
      const incompleteFolderRow = pairRows.find((entry) => !entry.source.folderBundle || !entry.target.folderBundle);
      if (incompleteFolderRow) {
        panel.setStatus('フォルダ比較の全ペアで、比較元と比較先の設定JSONが必要です。APIへの自動切替は行いません', 'warn');
        incompleteFolderRow.source.app.focus({ preventScroll: true });
        return;
      }
    }
    const prepared = prepareDiffBatchPairs(readPairInputs(), {
      maxPairs: MAX_PAIR_ROWS,
      requireOneToOne: true,
      allowSameEndpoint: folderMode
    });
    if (prepared.issues.length) {
      showPairValidationIssues(prepared.issues);
      panel.setStatus(`${prepared.issues[0].message}${prepared.issues.length > 1 ? `（ほか ${prepared.issues.length - 1}件）` : ''}`, 'warn');
      return;
    }
    if (!prepared.pairs.length) {
      panel.setStatus('比較元と比較先を入力したペアを 1 件以上登録してください', 'warn');
      pairRows[0]?.source.app.focus();
      return;
    }
    if (importedSourceBundle || importedTargetBundle) {
      panel.setStatus('設定JSON読込は1対1比較専用です。読込を解除してからペア一括比較を実行してください', 'warn');
      return;
    }
    const base = readForm();
    if (!base.scopes.length) {
      panel.setStatus('比較セクションを 1 つ以上選択してください', 'warn');
      return;
    }
    const positionalRuleCount = summarizeLiteIgnoreRules(base.ignoreKeys).positionalRules;
    if (positionalRuleCount) {
      panel.setStatus(`配列番号を含む位置依存の無視ルールが ${positionalRuleCount}件あります。並び替えで別の対象を隠すため、削除または安定したパスへ変更してください`, 'warn');
      return;
    }

    cache = null;
    multiXlsxExports = [];
    currentRowKey = '';
    collapsedSections.clear();
    expandedValueKeys.clear();
    expandedRowKeys.clear();
    setCompletionActionsVisible(false);
    setExportControlsEnabled(false);
    summaryText = '';
    resetResultPage();
    resultBox.innerHTML = '';
    cardResult.card.style.display = 'none';
    cardFilter.card.style.display = 'none';
    filterDetails.style.display = 'none';
    reviewEmpty.style.display = '';

    runDiffTask('比較ペアを一括比較中…', async () => {
      let activeIndex = 0;
      const results = await runSequentialDiffBatch(
        prepared.pairs,
        async (pair, context) => {
          const position = activeIndex + 1;
          const sourceText = pair.source.appName || `App ${pair.source.appId}`;
          const targetText = pair.target.appName || `App ${pair.target.appId}`;
          const pairEntry = pairRows[pair.rowNumber - 1];
          const folderSourceBundle = folderMode ? pairEntry?.source.folderBundle?.bundle : null;
          const folderTargetBundle = folderMode ? pairEntry?.target.folderBundle?.bundle : null;
          if (folderMode && (!folderSourceBundle || !folderTargetBundle)) {
            throw new Error(`入力ペア ${pair.rowNumber}: フォルダ設定JSONが不足しています`);
          }
          const out = await runDiffStandalone({
            source: pair.source,
            target: pair.target,
            scopes: base.scopes,
            ignoreKeys: base.ignoreKeys,
            includeSame: base.includeSame,
            normalizationPresetState: base.normalizationPresetState,
            importedSourceBundle: folderMode ? folderSourceBundle : context.importedSourceBundle,
            importedTargetBundle: folderMode ? folderTargetBundle : context.importedTargetBundle,
            onSourceBundle: (bundle: any) => {
              attachKnownAppName(bundle, pair.source.appName);
              if (!folderMode) context.onSourceBundle(bundle);
            },
            onStatus: (message: string) => panel.setStatus(`比較 ${position}/${prepared.pairs.length}・入力ペア ${pair.rowNumber}（${sourceText} → ${targetText}）: ${message}`, 'busy')
          });
          attachKnownAppName(out.sourceBundle, pair.source.appName);
          attachKnownAppName(out.targetBundle, pair.target.appName);
          return out;
        },
        (pair, index, total) => {
          activeIndex = index;
          panel.setStatus(`比較 ${index + 1}/${total}・入力ペア ${pair.rowNumber}: App ${pair.source.appId} → App ${pair.target.appId}`, 'busy');
        }
      );

      const resultRows: string[] = [];
      let succeeded = 0;
      let failed = 0;
      let incomplete = 0;
      results.forEach((result) => {
        const sourceEnv = `${result.pair.source.guestId ? `ゲスト ${result.pair.source.guestId}` : '通常スペース'} / ${result.pair.source.preview ? 'プレビュー' : '運用'}`;
        const targetEnv = `${result.pair.target.guestId ? `ゲスト ${result.pair.target.guestId}` : '通常スペース'} / ${result.pair.target.preview ? 'プレビュー' : '運用'}`;
        if (result.status === 'rejected') {
          failed += 1;
          const errorMessage = (result.error as any)?.message || String(result.error);
          const sourceLabel = result.pair.source.appName ? `${result.pair.source.appName}（App ${result.pair.source.appId}）` : `App ${result.pair.source.appId}`;
          const targetLabel = result.pair.target.appName ? `${result.pair.target.appName}（App ${result.pair.target.appId}）` : `App ${result.pair.target.appId}`;
          resultRows.push(`<tr><td>${result.pair.rowNumber}</td><td>${esc(sourceLabel)}<br><small>${esc(sourceEnv)}</small></td><td>${esc(targetLabel)}<br><small>${esc(targetEnv)}</small></td><td class="kus-dl-multi__warn">失敗<br><small>${esc(errorMessage)}</small></td><td>—</td><td>—</td><td>—</td></tr>`);
          return;
        }

        succeeded += 1;
        const out = result.value;
        const sourceName = extractAppNameFromBundle(out.sourceBundle) || result.pair.source.appName;
        const targetName = extractAppNameFromBundle(out.targetBundle) || result.pair.target.appName;
        const sourceLabel = sourceName ? `${sourceName}（App ${result.pair.source.appId}）` : `App ${result.pair.source.appId}`;
        const targetLabel = targetName ? `${targetName}（App ${result.pair.target.appId}）` : `App ${result.pair.target.appId}`;
        const counts = summarizeLiteDiffRows(out.rows || []);
        const changed = contentChangedCount(counts);
        const issueCount = (out.fetchIssues || []).length;
        const partialIssueCount = (out.partialIssues || []).length;
        const needsReview = isIncompleteLiteDiff(out);
        const incompleteReasons = [
          issueCount ? `取得失敗 ${issueCount}件` : '',
          partialIssueCount ? `本文未検証 ${partialIssueCount}件` : '',
          hasIncompleteActualDiffTruncation(out.truncation || null)
            ? `差分上限 ${Number(out.truncation?.diffLimit || 0).toLocaleString()}件に到達`
            : ''
        ].filter(Boolean);
        if (needsReview) incomplete += 1;
        const comparedAt = new Date().toISOString();
        const multiExportIndex = multiXlsxExports.push({
          label: `ペア ${result.pair.rowNumber}: ${sourceLabel} → ${targetLabel}`,
          cache: {
            rows: out.rows || [],
            fetchIssues: out.fetchIssues || [],
            partialIssues: out.partialIssues || [],
            sourceBundle: out.sourceBundle,
            targetBundle: out.targetBundle,
            scopes: base.scopes,
            ignoreKeys: base.ignoreKeys,
            normalizationPresetState: base.normalizationPresetState,
            comparedAt,
            truncation: out.truncation || null
          }
        }) - 1;
        const stateLabel = needsReview ? '要確認' : (counts.actual ? '完了' : '一致');
        const pairActionLabel = `ペア ${result.pair.rowNumber}・${sourceLabel}から${targetLabel}`;
        resultRows.push(`<tr><td>${result.pair.rowNumber}</td><td>${esc(sourceLabel)}<br><small>${esc(sourceEnv)}</small></td><td>${esc(targetLabel)}<br><small>${esc(targetEnv)}</small></td>` +
          `<td class="${needsReview ? 'kus-dl-multi__warn' : 'kus-dl-multi__ok'}">${stateLabel}</td>` +
          `<td><span class="kus-dl-pair-breakdown"><strong>差分 ${counts.actual}</strong><small>追加 ${counts.added} / 削除 ${counts.removed} / 内容変更 ${changed} / 移動 ${counts.moved}</small></span></td>` +
          `<td>${incompleteReasons.length ? incompleteReasons.map((reason) => esc(reason)).join('<br>') : 'なし'}</td>` +
          `<td><span class="kus-dl-pair-save"><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-multi-html="${multiExportIndex}" aria-label="${esc(`${pairActionLabel}のHTMLを保存`)}">HTML</button><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-multi-xlsx="${multiExportIndex}" aria-label="${esc(`${pairActionLabel}のExcelを保存`)}">Excel</button></span></td></tr>`);
      });

      cardResult.card.style.display = '';
      reviewEmpty.style.display = 'none';
      resultBox.innerHTML = `<div class="kus-dl-result"><div class="kus-dl-table-scroll" role="region" aria-label="ペア一括比較結果。横にスクロールできます" tabindex="0"><table class="kus-dl-multi kus-dl-multi--pairs"><caption>ペア一括比較の結果（登録順）</caption><thead><tr><th>No.</th><th>比較元<br><small>変更前</small></th><th>比較先<br><small>変更後</small></th><th>状態</th><th>差分内訳</th><th>確認事項<br><small>不完全な理由</small></th><th>保存</th></tr></thead><tbody>${resultRows.join('')}</tbody></table></div>${multiXlsxBatchSaveMarkup(multiXlsxExports.length)}</div>`;
      const note = [failed ? `失敗 ${failed}件` : '', incomplete ? `要確認 ${incomplete}件` : ''].filter(Boolean).join(' / ');
      panel.setStatus(`ペア一括比較が完了: 成功 ${succeeded}/${prepared.pairs.length}件${note ? ` / ${note}` : ''}。Excelは各行または一括ボタンから保存できます`, failed || incomplete ? 'warn' : 'ok');
    });
  });

  runAllBtn.addEventListener('click', () => {
    const targets = readTargets();
    if (!targets.length) {
      panel.setStatus('比較先アプリIDを 1 件以上入力してください', 'warn');
      return;
    }
    if (importedTargetBundle) {
      panel.setStatus('比較先JSONは単一比較専用です。「差分比較を実行」を使うか、比較先JSONの読込を解除してください', 'warn');
      return;
    }
    const base = readForm();
    if (!base.scopes.length) {
      panel.setStatus('比較セクションを 1 つ以上選択してください', 'warn');
      return;
    }
    const positionalRuleCount = summarizeLiteIgnoreRules(base.ignoreKeys).positionalRules;
    if (positionalRuleCount) {
      panel.setStatus(`配列番号を含む位置依存の無視ルールが ${positionalRuleCount}件あります。並び替えで別の対象を隠すため、削除または安定したパスへ変更してください`, 'warn');
      return;
    }
    cache = null;
    multiXlsxExports = [];
    currentRowKey = '';
    collapsedSections.clear();
    expandedValueKeys.clear();
    expandedRowKeys.clear();
    setCompletionActionsVisible(false);
    setExportControlsEnabled(false);
    summaryText = '';
    resetResultPage();
    resultBox.innerHTML = '';
    cardResult.card.style.display = 'none';
    cardFilter.card.style.display = 'none';
    filterDetails.style.display = 'none';
    reviewEmpty.style.display = '';
    runDiffTask('全比較先を比較中…', async () => {
      const resultRows: string[] = [];
      let sharedSourceBundle = importedSourceBundle;
      let exported = 0;
      let failed = 0;
      let exportFailed = 0;
      let incomplete = 0;
      for (let i = 0; i < targets.length; i += 1) {
        const t = targets[i];
        panel.setStatus(`比較中 (${i + 1}/${targets.length}) App:${t.appId}${t.guestId ? ` / Guest:${t.guestId}` : ''}`, 'busy');
        try {
          const out = await runDiffStandalone({
            source: base.source,
            target: t,
            scopes: base.scopes,
            ignoreKeys: base.ignoreKeys,
            includeSame: base.includeSame,
            normalizationPresetState: base.normalizationPresetState,
            importedSourceBundle: sharedSourceBundle,
            onSourceBundle: (bundle: any) => {
              attachKnownAppName(bundle, base.source.appName);
              sharedSourceBundle = bundle;
            },
            onStatus: (m: string) => panel.setStatus(m, 'busy')
          });
          if (!sharedSourceBundle) sharedSourceBundle = out.sourceBundle;
          attachKnownAppName(out.sourceBundle, base.source.appName);
          attachKnownAppName(out.targetBundle, t.appName);
          const counts = summarizeLiteDiffRows(out.rows || []);
          const contentChanged = contentChangedCount(counts);
          const issueCount = (out.fetchIssues || []).length;
          const partialIssueCount = (out.partialIssues || []).length;
          const needsReview = isIncompleteLiteDiff(out);
          const comparedAt = new Date().toISOString();
          if (needsReview) incomplete += 1;

          let exportNote = '';
          try {
            runExportDiffHtmlStandalone({
              rows: out.rows,
              fetchIssues: out.fetchIssues || [],
              partialIssues: out.partialIssues || [],
              sourceBundle: out.sourceBundle,
              targetBundle: out.targetBundle,
              scopes: base.scopes,
              ignoreKeys: base.ignoreKeys,
              normalizationPresetState: base.normalizationPresetState,
              truncation: out.truncation || null,
              exportContentMode: normalizeLiteHtmlExportContentMode(htmlContentMode.value),
              exportContentLabel: getLiteHtmlExportContentLabel(htmlContentMode.value)
            });
            exported += 1;
          } catch (e: any) {
            exportNote = ` / HTML出力失敗: ${e?.message || String(e)}`;
            exportFailed += 1;
          }
          const targetLabel = t.appName ? `${t.appName}（App ${t.appId}）` : `App ${t.appId}`;
          const multiExportIndex = multiXlsxExports.push({
            label: targetLabel,
            cache: {
              rows: out.rows || [],
              fetchIssues: out.fetchIssues || [],
              partialIssues: out.partialIssues || [],
              sourceBundle: out.sourceBundle,
              targetBundle: out.targetBundle,
              scopes: base.scopes,
              ignoreKeys: base.ignoreKeys,
              normalizationPresetState: base.normalizationPresetState,
              comparedAt,
              truncation: out.truncation || null
            }
          }) - 1;
          resultRows.push(`<tr><td>${esc(targetLabel)}<br><small>${esc(t.guestId ? `ゲスト ${t.guestId}` : '通常スペース')} / ${t.preview ? 'プレビュー' : '運用'}</small></td>` +
            `<td class="${needsReview || exportNote ? 'kus-dl-multi__warn' : 'kus-dl-multi__ok'}">${exportNote ? '出力失敗' : (needsReview ? '要確認' : '完了')}${esc(exportNote)}</td>` +
            `<td>${counts.actual}</td><td>${counts.added}</td><td>${counts.removed}</td><td>${contentChanged}</td><td>${counts.moved}</td><td>${issueCount}${partialIssueCount ? ` / 未検証 ${partialIssueCount}` : ''}</td>` +
            `<td><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-multi-xlsx="${multiExportIndex}">Excel保存</button></td></tr>`);
        } catch (e: any) {
          failed += 1;
          const targetLabel = t.appName ? `${t.appName}（App ${t.appId}）` : `App ${t.appId}`;
          resultRows.push(`<tr><td>${esc(targetLabel)}</td><td class="kus-dl-multi__warn">失敗: ${esc(e?.message || String(e))}</td><td colspan="6">—</td><td>—</td></tr>`);
        }
      }
      cardResult.card.style.display = '';
      reviewEmpty.style.display = 'none';
      resultBox.innerHTML = `<div class="kus-dl-result"><div class="kus-dl-table-scroll" role="region" aria-label="1対多比較結果。横にスクロールできます" tabindex="0"><table class="kus-dl-multi"><caption>複数比較の結果（比較元は最初の取得結果を再利用）</caption><thead><tr><th>比較先</th><th>取得状態<br><small>件数より先に確認</small></th><th>差分</th><th>追加<br><small>比較先のみ</small></th><th>削除<br><small>比較元のみ</small></th><th>内容変更</th><th>移動</th><th>取得失敗<br><small>一部未検証</small></th><th>Excel</th></tr></thead><tbody>${resultRows.join('')}</tbody></table></div>${multiXlsxBatchSaveMarkup(multiXlsxExports.length)}</div>`;
      const tone = failed || exportFailed || incomplete || exported !== targets.length ? 'warn' : 'ok';
      const note = [failed ? `比較失敗 ${failed}件` : '', exportFailed ? `HTML出力失敗 ${exportFailed}件` : '', incomplete ? `要確認 ${incomplete}件` : ''].filter(Boolean).join(' / ');
      panel.setStatus(`全比較先の比較が完了: HTMLダウンロード ${exported}/${targets.length}件開始（${getLiteHtmlExportContentLabel(htmlContentMode.value)}）${note ? ` / ${note}` : ''}。Excelは各行または一括ボタンから保存できます`, tone);
    });
  });

  runBtn.addEventListener('click', () => {
    cache = null;
    multiXlsxExports = [];
    currentRowKey = '';
    collapsedSections.clear();
    expandedValueKeys.clear();
    expandedRowKeys.clear();
    setCompletionActionsVisible(false);
    setExportControlsEnabled(false);
    summaryText = '';
    resetResultPage();
    resultBox.innerHTML = '';
    cardResult.card.style.display = 'none';
    cardFilter.card.style.display = 'none';
    filterDetails.style.display = 'none';
    reviewEmpty.style.display = '';
    const f = readForm();
    if (!f.scopes.length) {
      panel.setStatus('比較セクションを 1 つ以上選択してください', 'warn');
      return;
    }
    const positionalRuleCount = summarizeLiteIgnoreRules(f.ignoreKeys).positionalRules;
    if (positionalRuleCount) {
      panel.setStatus(`配列番号を含む位置依存の無視ルールが ${positionalRuleCount}件あります。並び替えで別の対象を隠すため、削除または安定したパスへ変更してください`, 'warn');
      return;
    }
    runDiffTask('差分比較を実行中…', async () => {
      const out = await runDiffStandalone({
        source: f.source,
        target: f.target,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        includeSame: f.includeSame,
        normalizationPresetState: f.normalizationPresetState,
        importedSourceBundle,
        importedTargetBundle,
        onStatus: (m: string) => panel.setStatus(m, 'busy')
      });
      attachKnownAppName(out.sourceBundle, f.source.appName);
      attachKnownAppName(out.targetBundle, f.target.appName);
      cache = {
        rows: out.rows,
        fetchIssues: out.fetchIssues || [],
        partialIssues: out.partialIssues || [],
        sourceBundle: out.sourceBundle,
        targetBundle: out.targetBundle,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        normalizationPresetState: f.normalizationPresetState,
        comparedAt: new Date().toISOString(),
        truncation: out.truncation || null
      };
      announceResultOverview = true;
      summaryText = out.summary?.text || '完了';
      refreshFilterSectionOptions();
      rerender();
      setCompletionActionsVisible(true);
      // 比較が終わったらそのまま HTML レポートを保存する（出力ボタンを押す手間を省く）
      try {
        runExportDiffHtmlStandalone(exportCtx(true));
        const incomplete = isIncompleteLiteDiff(out);
        panel.setStatus(`${summaryText} — 差分 HTML レポートのダウンロードを開始しました（${getLiteHtmlExportContentLabel(htmlContentMode.value)}）`, incomplete ? 'warn' : 'ok');
      } catch (e: any) {
        panel.setStatus(`${summaryText} — HTML出力に失敗: ${e?.message || String(e)}`, 'warn');
      }
    });
  });

  bHtml.addEventListener('click', () => {
    try {
      const ctx = exportCtx();
      if (!ctx.rows.length && cache?.rows.length) {
        panel.setStatus('現在のフィルタに該当する行がありません。範囲を「全件」に戻すか、フィルタを見直してください', 'warn');
        return;
      }
      runExportDiffHtmlStandalone(ctx);
      const incomplete = isIncompleteLiteDiff(cache);
      panel.setStatus(`差分 HTML のダウンロードを開始しました（${expRange.value === 'all' ? '全件' : '表示中'} / ${getLiteHtmlExportContentLabel(htmlContentMode.value)}）${incomplete ? ' — 元の比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, 'err');
    }
  });

  let xlsxExportActive = false;
  bXlsx.addEventListener('click', async () => {
    if (xlsxExportActive) return;
    const exportStartedAt = Date.now();
    xlsxExportActive = true;
    setExportControlsEnabled(false);
    try {
      const snapshot = cache;
      if (!snapshot) throw new Error('先に差分比較を実行してください');
      const ctx = exportCtx(forceFullXlsxExport);
      if (!ctx.rows.length && snapshot.rows.length) {
        panel.setStatus('現在のフィルタに該当する行がありません。範囲を「全件」に戻すか、フィルタを見直してください', 'warn');
        return;
      }
      panel.setStatus('差分一覧 Excel を生成中…', 'busy');
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const result = runExportDiffXlsx(buildLiteDiffXlsxContext(
        snapshot,
        ctx.rows,
        ctx.exportMode,
        ctx.exportLabel,
        ctx.filterDescription
      ));
      const incomplete = isIncompleteLiteDiff(snapshot);
      panel.setStatus(`差分一覧 Excel のダウンロードを開始しました（${ctx.exportLabel} / ${ctx.rows.length}件）: ${result.filename}${incomplete ? ' — 元の比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
    } catch (e: any) {
      panel.setStatus(`Excel出力エラー: ${e?.message || String(e)}`, 'err');
    } finally {
      const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
      if (cooldown > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, cooldown));
      xlsxExportActive = false;
      forceFullXlsxExport = false;
      setExportControlsEnabled(!!cache);
    }
  });
}
