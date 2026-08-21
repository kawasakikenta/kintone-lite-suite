'use strict';

import { SECTION_DEFS } from '../constants.js';
import {
  buildDiffComparisonProfile,
  parseDiffComparisonProfile,
  serializeDiffComparisonProfile
} from '../diff/comparison-profile.js';
import { buildCharDiffHtml, stringifyRowValueForDiff } from '../diff/export.js';
import { decodeExactIgnorePathRule, encodeExactIgnorePathRule } from '../diff/engine.js';
import { runExportDiffXlsx, type DiffXlsxContext } from '../diff/xlsx-export.js';
import { decodeRow, type DecodedRow } from '../diff/path-decoder.js';
import { downloadText, esc, extractAppNameFromBundle, nowStamp, readTextFile, stableStringify } from '../utils.js';
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
.kus-dl-result{font:12px/1.5 ui-monospace,Menlo,monospace;color:#0f172a}
.kus-dl-overview{font-family:-apple-system,Segoe UI,sans-serif;border:1px solid #cbd5e1;border-radius:10px;background:#fff;margin-bottom:10px;overflow:hidden}
.kus-dl-overview__direction{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.kus-dl-side{min-width:0}
.kus-dl-side--target{text-align:right}
.kus-dl-side__role{display:block;color:#64748b;font-size:10px;font-weight:700;letter-spacing:.04em}
.kus-dl-side__name{display:block;color:#0f172a;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-side__env{display:block;color:#64748b;font-size:10px}
.kus-dl-overview__arrow{color:#2563eb;font-size:18px;font-weight:800}
.kus-dl-verdict{padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#eff6ff;color:#1e3a8a}
.kus-dl-verdict--same{background:#f0fdf4;color:#166534}
.kus-dl-verdict--warn{background:#fff7ed;color:#9a3412}
.kus-dl-verdict strong{display:block;font-size:13px;margin-bottom:2px}
.kus-dl-verdict span{font-size:11px;line-height:1.55}
.kus-dl-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:10px 12px}
.kus-dl-metric{appearance:none;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;color:#334155;padding:7px 5px;text-align:center;font:inherit}
button.kus-dl-metric{cursor:pointer}
button.kus-dl-metric:hover{border-color:#93c5fd;background:#eff6ff}
.kus-dl-metric__num{display:block;color:#0f172a;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}
.kus-dl-metric__label{display:block;font-size:10px;font-weight:700}
.kus-dl-metric__hint{display:block;color:#64748b;font-size:9px;font-weight:400}
.kus-dl-section-nav{display:flex;flex-wrap:wrap;gap:5px;padding:0 12px 10px}
.kus-dl-section-nav__label{width:100%;color:#64748b;font-size:10px;font-weight:700}
.kus-dl-section-jump{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;padding:3px 8px;font:600 10.5px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-section-jump:hover{border-color:#60a5fa;background:#eff6ff;color:#1d4ed8}
.kus-dl-alert{margin:0 12px 10px;padding:8px 10px;border:1px solid #fdba74;border-radius:7px;background:#fff7ed;color:#9a3412;font:600 11px/1.55 -apple-system,Segoe UI,sans-serif}
.kus-dl-legend{padding:0 12px 10px;color:#64748b;font:10.5px/1.5 -apple-system,Segoe UI,sans-serif}
.kus-dl-result__summary{margin:0 2px 7px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11px;color:#64748b;display:flex;flex-wrap:wrap;gap:6px 12px}
.kus-dl-sticky{position:sticky;top:0;z-index:4;margin:0 0 10px;padding:0 0 4px;background:linear-gradient(180deg,rgba(248,250,252,.995) 86%,rgba(248,250,252,0));backdrop-filter:blur(7px)}
.kus-dl-contextbar{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:7px;padding:6px;border:1px solid #cbd5e1;border-radius:10px;background:#e2e8f0;box-shadow:0 2px 10px rgba(15,23,42,.08);font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-contextlane{min-width:0;padding:6px 9px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;box-shadow:inset 3px 0 0 #64748b}
.kus-dl-contextlane--after{box-shadow:inset 3px 0 0 #2563eb}
.kus-dl-contextlane__role{display:block;margin-bottom:1px;color:#64748b;font-size:8.5px;font-weight:900;letter-spacing:.12em}
.kus-dl-contextlane--after .kus-dl-contextlane__role{color:#1d4ed8}
.kus-dl-contextlane__name{display:block;overflow:hidden;color:#0f172a;font-size:11px;font-weight:800;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
.kus-dl-progress{align-self:center;min-width:72px;padding:4px 7px;text-align:center;color:#1e3a8a;font-variant-numeric:tabular-nums}
.kus-dl-progress__numbers{display:flex;align-items:baseline;justify-content:center;gap:3px;line-height:1}
.kus-dl-progress__current{color:#1d4ed8;font-size:18px;font-weight:900}
.kus-dl-progress__total{color:#475569;font-size:11px;font-weight:800}
.kus-dl-progress__label{display:block;margin-top:3px;color:#64748b;font-size:8.5px;font-weight:800;letter-spacing:.04em}
.kus-dl-result__summary strong{color:#0f172a}
.kus-dl-section{border:1px solid #dbe3ee;border-radius:10px;margin-bottom:10px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.04)}
.kus-dl-section>summary{padding:8px 10px;background:#f8fafc;font:600 12px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;list-style:none;display:flex;align-items:center;gap:7px}
.kus-dl-section>summary::-webkit-details-marker{display:none}
.kus-dl-section>summary::before{content:"▸";display:inline-block;margin-right:6px;color:#64748b;transition:transform .15s}
.kus-dl-section[open]>summary::before{transform:rotate(90deg)}
.kus-dl-section__heading{display:flex;align-items:baseline;gap:7px;min-width:100px}
.kus-dl-section__label{color:#0f172a;font-weight:800}
.kus-dl-section__count{color:#64748b;font-size:10.5px;font-weight:500}
.kus-dl-section__breakdown{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;margin-left:auto}
.kus-dl-section__stat{padding:1px 6px;border:1px solid #dbe3ee;border-radius:999px;background:#fff;color:#475569;font-size:9px;font-weight:700;white-space:nowrap}
.kus-dl-section__stat--added{border-color:#bbf7d0;color:#166534}
.kus-dl-section__stat--removed{border-color:#fecaca;color:#991b1b}
.kus-dl-section__stat--changed{border-color:#bfdbfe;color:#1d4ed8}
.kus-dl-section__stat--moved{border-color:#fde68a;color:#92400e}
.kus-dl-section__body{display:grid;gap:7px;padding:8px;background:#f8fafc}
.kus-dl-row{border:1px solid #dbe3ee;border-left:4px solid transparent;border-radius:8px;padding:9px 10px;background:#fff;font-family:-apple-system,Segoe UI,sans-serif;font-size:11.5px;transition:background-color .12s,border-color .12s,box-shadow .12s}
.kus-dl-row--added{border-left-color:#22c55e}
.kus-dl-row--removed{border-left-color:#ef4444}
.kus-dl-row--changed{border-left-color:#3b82f6}
.kus-dl-row--moved{border-left-color:#f59e0b}
.kus-dl-row--same{border-left-color:#cbd5e1}
.kus-dl-row:focus,.kus-dl-row.is-current{outline:2px solid #2563eb;outline-offset:1px;background:#f8fbff;box-shadow:0 4px 14px rgba(37,99,235,.13)}
.kus-dl-row__head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;margin-bottom:7px}
.kus-dl-row__identity{min-width:0}
.kus-dl-row__headline{display:flex;flex-wrap:wrap;align-items:center;gap:5px 6px}
.kus-dl-row__title{min-width:150px;flex:1;color:#0f172a;font-size:12.5px;font-weight:800;line-height:1.4}
.kus-dl-row__subtitle{margin:3px 0 0;color:#64748b;font-size:10.5px;line-height:1.45}
.kus-dl-row__context{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:0 0 6px;color:#64748b}
.kus-dl-row__chip{display:inline-flex;align-items:center;border-radius:999px;background:#e2e8f0;color:#334155;padding:1px 6px;font-size:10px}
.kus-dl-row__technical{margin:0 0 7px;color:#64748b;font:9.5px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-row__technical>summary{display:inline-flex;align-items:center;gap:4px;padding:1px 4px;border-radius:4px;cursor:pointer;list-style:none;color:#64748b;font-weight:700}
.kus-dl-row__technical>summary::-webkit-details-marker{display:none}
.kus-dl-row__technical>summary::before{content:'›';font-size:12px;transition:transform .12s}
.kus-dl-row__technical[open]>summary::before{transform:rotate(90deg)}
.kus-dl-row__raw{display:block;margin-top:3px;padding:5px 7px;border:1px dashed #cbd5e1;border-radius:5px;background:#f8fafc;color:#475569;font:9.5px/1.45 ui-monospace,Menlo,monospace;word-break:break-all}
.kus-dl-row__cols{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:ui-monospace,Menlo,monospace;font-size:11px}
.kus-dl-value{position:relative;min-width:0}
.kus-dl-pre{box-sizing:border-box;width:100%;margin:0;padding:7px 8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-word;overflow:auto}
.kus-dl-value.is-collapsed .kus-dl-pre{max-height:126px;overflow:hidden}
.kus-dl-value__footer{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px;padding:3px 2px 0;color:#64748b;font:9px/1.3 -apple-system,Segoe UI,sans-serif}
.kus-dl-value__toggle{margin-left:auto;padding:2px 6px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#1d4ed8;font:700 9.5px/1.35 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-value__toggle:hover{border-color:#60a5fa;background:#eff6ff}
.kus-dl-pre.del{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
.kus-dl-pre.add{background:#f0fdf4;border-color:#bbf7d0;color:#14532d}
.kus-dl-pre.empty{color:#64748b;font-style:italic}
.kus-dl-badge{display:inline-block;padding:1px 6px;border-radius:4px;font:600 10.5px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.02em}
.kus-dl-badge--added{background:#dcfce7;color:#166534}
.kus-dl-badge--removed{background:#fee2e2;color:#991b1b}
.kus-dl-badge--changed{background:#dbeafe;color:#1d4ed8}
.kus-dl-badge--moved{background:#fef3c7;color:#92400e}
.kus-dl-badge--same{background:#e2e8f0;color:#475569}
.kus-dl-empty{padding:14px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:8px}
.kus-dl-flag{display:inline-block;padding:1px 6px;border-radius:999px;background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;font:500 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-row__action{border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#475569;padding:3px 7px;font:600 9.5px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;white-space:nowrap}
.kus-dl-row__action:hover{border-color:#f59e0b;background:#fffbeb;color:#92400e}
.kus-dl-reviewbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:5px 0 0;padding:5px 6px;border:1px solid #bfdbfe;border-radius:8px;background:rgba(239,246,255,.98);font:600 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-reviewbar__nav,.kus-dl-reviewbar__tools,.kus-dl-reviewbar__filters{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.kus-dl-reviewbar__filters{min-width:120px;flex:1}
.kus-dl-filter-empty{padding:2px 5px;color:#64748b;font-weight:600}
.kus-dl-filterchip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border:1px solid #93c5fd;border-radius:999px;background:#fff;color:#1e3a8a;font:700 9.5px/1.35 -apple-system,Segoe UI,sans-serif;cursor:pointer;max-width:180px}
.kus-dl-filterchip>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kus-dl-filterchip::after{content:'×';color:#64748b;font-size:11px}
.kus-dl-filterchip:hover{border-color:#2563eb;background:#dbeafe}
.kus-dl-filterchip--all{border-style:dashed;color:#475569}
.kus-dl-navbtn{border:1px solid #93c5fd;border-radius:6px;background:#fff;color:#1d4ed8;padding:3px 7px;font:700 9.5px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;white-space:nowrap}
.kus-dl-navbtn:disabled{opacity:.45;cursor:not-allowed}
.kus-dl-result--compact .kus-dl-row{padding:6px 7px;font-size:10.5px}
.kus-dl-result--compact .kus-dl-row__context{display:none}
.kus-dl-result--compact .kus-dl-pre{padding:4px 6px;font-size:10px}
.kus-dl-result--compact .kus-dl-value.is-collapsed .kus-dl-pre{max-height:92px}
.kus-dl-result--compact .kus-dl-section__body{padding:3px}
.kus-dl-result--comfortable .kus-dl-row{padding:9px 10px}
.kus-dl-result--comfortable .kus-dl-value.is-collapsed .kus-dl-pre{max-height:164px}
.kus-dl-result--stacked .kus-dl-row__cols{grid-template-columns:1fr}
.kus-dl-result--stacked .kus-dl-pre::before{content:attr(data-side-label);display:block;margin:0 0 5px;color:#64748b;font:700 9px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.04em}
.kus-dl-result mark.diff-char-del{background:#fecaca;color:#7f1d1d;border-radius:2px;padding:0 1px;text-decoration:line-through}
.kus-dl-result mark.diff-char-add{background:#bbf7d0;color:#14532d;border-radius:2px;padding:0 1px}
.kus-dl-target-field{display:flex;flex:1 1 180px;min-width:180px;flex-direction:column}
.kus-dl-target-field .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-target-name{min-height:1.35em;margin-top:3px;color:#64748b;font-size:10.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-target-name:not(.kus-dl-target-name--empty)::before{content:'アプリ名: ';color:#334155;font-weight:600}
.kus-dl-more{display:flex;justify-content:center;padding:8px 0 2px}
.kus-dl-multi{width:100%;border-collapse:collapse;font:11px/1.45 -apple-system,Segoe UI,sans-serif}
.kus-dl-multi caption{text-align:left;color:#475569;font-weight:700;padding:0 0 6px}
.kus-dl-multi th,.kus-dl-multi td{padding:6px 7px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top}
.kus-dl-multi th:first-child,.kus-dl-multi td:first-child{text-align:left}
.kus-dl-multi thead th{position:sticky;top:0;background:#f8fafc;color:#475569;font-size:10px}
.kus-dl-multi__warn{color:#9a3412;font-weight:700}
.kus-dl-multi__ok{color:#166534;font-weight:700}

/* Diff Lite only: human-first review workspace. Shared litePanelTheme is intentionally untouched. */
#kus-diff-lite.kus-lp{width:min(960px,calc(100vw - 24px));max-height:min(96vh,1040px);top:max(8px,2vh);right:max(8px,1vw);border-radius:14px;background:#f8fafc}
#kus-diff-lite .kus-lp__hero{padding:15px 20px;background:#10253f}
#kus-diff-lite .kus-lp__badge-row{display:none}
#kus-diff-lite .kus-lp__body{padding:18px 20px 22px}
#kus-diff-lite [hidden]{display:none!important}
#kus-diff-lite .kus-lp__hint{margin-bottom:16px;padding:0 2px;border:0;background:transparent;color:#475569}
#kus-diff-lite button,#kus-diff-lite input:not([type="checkbox"]):not([type="file"]),#kus-diff-lite select{min-height:44px}
#kus-diff-lite input[type="file"]{min-height:44px;padding:8px 0;box-sizing:border-box}
#kus-diff-lite .kus-lp__check{min-height:44px}
#kus-diff-lite button:focus-visible,#kus-diff-lite input:focus-visible,#kus-diff-lite select:focus-visible,#kus-diff-lite textarea:focus-visible,#kus-diff-lite summary:focus-visible{outline:3px solid #2563eb;outline-offset:2px}
.kus-dl-workflow{display:grid;gap:16px}
.kus-dl-step{padding:18px;border:1px solid #d8e0ea;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.kus-dl-step__header{display:flex;align-items:flex-start;gap:11px;margin:0 0 15px;padding:0 0 13px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-step__number{display:inline-flex;flex:0 0 28px;width:28px;height:28px;align-items:center;justify-content:center;border-radius:50%;background:#16395f;color:#fff;font-size:12px;font-weight:800}
.kus-dl-step__header h2{margin:0;color:#10253f;font-size:16px;line-height:1.35}
.kus-dl-step__header p{margin:3px 0 0;color:#64748b;font-size:11.5px;line-height:1.5}
.kus-dl-step__empty{margin:0;padding:18px;border:1px dashed #cbd5e1;border-radius:9px;background:#f8fafc;color:#64748b;text-align:center;font-size:12px}
.kus-dl-step>.kus-lp__card,.kus-dl-disclosure__body>.kus-lp__card{margin:0;border:0;box-shadow:none;background:transparent;padding:0}
.kus-dl-target-card>.kus-lp__card-head,.kus-dl-filter-disclosure .kus-lp__card-head,.kus-dl-output-disclosure .kus-lp__card-head,.kus-dl-step[data-kus-dl-step="review"]>.kus-lp__card>.kus-lp__card-head{display:none}
.kus-dl-mode{display:inline-flex;gap:4px;margin:0 0 12px;padding:3px;border:1px solid #cbd5e1;border-radius:10px;background:#f1f5f9}
.kus-dl-mode .kus-lp__btn{min-width:118px;border-color:transparent;background:transparent;box-shadow:none;color:#475569}
.kus-dl-mode .kus-lp__btn.is-active{background:#fff;border-color:#cbd5e1;color:#10253f;box-shadow:0 1px 2px rgba(15,23,42,.08)}
.kus-dl-direction-grid{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:10px}
.kus-dl-app-card{min-width:0;padding:15px;border:1px solid #cbd5e1;border-radius:10px;background:#fff}
.kus-dl-app-card--target{border-color:#9fb2c8}
.kus-dl-app-card__role{margin:0 0 2px;color:#64748b;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.kus-dl-app-card h3{margin:0;color:#10253f;font-size:14px}
.kus-dl-app-card__help{margin:3px 0 13px;color:#64748b;font-size:10.5px}
.kus-dl-app-card .kus-lp__row{align-items:flex-start;margin-bottom:7px}
.kus-dl-app-card .kus-lp__label{width:100%;min-width:0;color:#475569;font-size:10.5px}
.kus-dl-app-card .kus-lp__input{flex:1;min-width:100px;width:auto;box-sizing:border-box}
.kus-dl-app-card .kus-dl-target-field{min-width:140px}
.kus-dl-swap{align-self:center;justify-self:center;width:88px;padding:8px!important;white-space:normal;line-height:1.3}
.kus-dl-target-list{display:grid;gap:7px;max-height:220px;margin-top:8px;padding-right:2px;overflow-y:auto}
.kus-dl-multi-controls{margin-top:12px!important;padding-top:10px;border-top:1px solid #e2e8f0}
.kus-dl-run-row{margin:13px 0 0!important}
.kus-dl-run-row .kus-lp__btn{width:100%}
.kus-dl-step>.kus-lp__status{margin:10px 0 0;min-height:44px;box-sizing:border-box}
.kus-dl-disclosure{margin-top:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;overflow:hidden}
.kus-dl-disclosure>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;box-sizing:border-box;padding:9px 13px;cursor:pointer;list-style:none;color:#10253f;font-weight:750}
.kus-dl-disclosure>summary::-webkit-details-marker{display:none}
.kus-dl-disclosure>summary::after{content:'＋';margin-left:auto;color:#64748b;font-size:16px}
.kus-dl-disclosure[open]>summary::after{content:'−'}
.kus-dl-disclosure>summary small{color:#64748b;font-size:10px;font-weight:500;text-align:right}
.kus-dl-disclosure__body{display:grid;gap:12px;padding:13px;border-top:1px solid #e2e8f0;background:#f8fafc}
.kus-dl-disclosure__body .kus-lp__details{margin-bottom:0;background:#fff}
.kus-dl-overview{border-color:#cbd5e1;border-radius:10px;box-shadow:none}
.kus-dl-overview__direction{background:#fff}
.kus-dl-overview__arrow{color:#16395f}
.kus-dl-verdict{position:relative;padding:12px 14px 12px 18px;border-left:5px solid #2563eb;background:#f8fafc;color:#10253f}
.kus-dl-verdict--same{border-left-color:#64748b;background:#f8fafc;color:#334155}
.kus-dl-verdict--warn{border-left-color:#b45309;background:#fffbeb;color:#78350f}
.kus-dl-verdict__eyebrow{display:block;margin-bottom:2px;color:inherit;font-size:9.5px!important;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
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
.kus-dl-row{border-left-color:#334155;background:#fff;transition:none}
.kus-dl-row--added,.kus-dl-row--removed,.kus-dl-row--changed,.kus-dl-row--moved{border-left-color:#334155}
.kus-dl-row--same{border-left-color:#94a3b8}
.kus-dl-badge,.kus-dl-badge--added,.kus-dl-badge--removed,.kus-dl-badge--changed,.kus-dl-badge--moved,.kus-dl-badge--same{display:inline-flex;align-items:center;gap:4px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:750}
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
.kus-dl-value__label{display:block;margin:0 0 4px;color:#475569;font:800 9.5px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.06em}
.kus-dl-presence{grid-column:1/-1;display:grid;grid-template-columns:minmax(150px,.38fr) minmax(0,1fr);gap:10px;align-items:start;padding:10px;border:1px dashed #9fb2c8;border-radius:8px;background:#f8fafc}
.kus-dl-presence>p{margin:1px 0;color:#334155;font-family:-apple-system,Segoe UI,sans-serif}
.kus-dl-presence>p strong,.kus-dl-presence>p span{display:block}
.kus-dl-presence>p strong{color:#10253f;font-size:12px}
.kus-dl-presence>p span{margin-top:3px;color:#64748b;font-size:10.5px}
.kus-dl-row__technical>summary{min-height:44px;box-sizing:border-box}
.kus-dl-row__raw>span{display:block;margin-bottom:2px;color:#64748b;font-family:-apple-system,Segoe UI,sans-serif;font-size:9px;font-weight:700}
.kus-dl-reviewbar{border-color:#cbd5e1;background:#f8fafc}
.kus-dl-contextbar{border-color:#cbd5e1;background:#e2e8f0}
.kus-dl-contextlane,.kus-dl-contextlane--after{box-shadow:none;border-left:4px solid #64748b}
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
  .kus-dl-swap{width:100%;max-width:none}
  .kus-dl-row__cols{grid-template-columns:1fr}
  .kus-dl-presence{grid-template-columns:1fr}
  .kus-dl-sticky{position:static;background:transparent;backdrop-filter:none}
  .kus-dl-disclosure>summary{align-items:flex-start;flex-wrap:wrap}
  .kus-dl-disclosure>summary small{width:100%;padding-right:28px;text-align:left}
}
@media(max-width:640px){
  .kus-dl-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kus-dl-row__cols{grid-template-columns:1fr}
  .kus-dl-contextbar{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .kus-dl-contextlane--before{grid-column:1;grid-row:1}
  .kus-dl-contextlane--after{grid-column:2;grid-row:1}
  .kus-dl-progress{grid-column:1 / -1;grid-row:2;display:flex;align-items:center;justify-content:center;gap:7px;padding:2px}
  .kus-dl-progress__label{margin-top:0}
  .kus-dl-reviewbar__filters{order:3;width:100%;flex-basis:100%}
  .kus-dl-section>summary{align-items:flex-start;flex-wrap:wrap}
  .kus-dl-section__breakdown{width:100%;justify-content:flex-start;margin-left:20px}
  .kus-dl-row__head{grid-template-columns:1fr}
  .kus-dl-row__action{justify-self:start}
  .kus-dl-pre::before{content:attr(data-side-label);display:block;margin:0 0 4px;color:#64748b;font:700 9px/1.3 -apple-system,Segoe UI,sans-serif;letter-spacing:.03em}
  .kus-dl-value__label+.kus-dl-pre::before{content:none;display:none}
  .kus-dl-multi{display:block;overflow-x:auto;white-space:nowrap}
}
@media(max-width:420px){
  .kus-dl-mode{display:grid;grid-template-columns:1fr 1fr;width:100%;box-sizing:border-box}
  .kus-dl-mode .kus-lp__btn{min-width:0;padding-inline:6px}
  .kus-dl-overview__direction{grid-template-columns:1fr;gap:5px}
  .kus-dl-side--target{text-align:left}
  .kus-dl-overview__arrow{transform:rotate(90deg);justify-self:start;margin-left:12px}
  .kus-dl-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kus-dl-step__header{gap:8px}
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
  /** 差分エンジンの上限打ち切り情報（打ち切りなしなら null） */
  truncation: any;
}

export type LiteHtmlExportContentMode = 'diffOnly' | 'withCompared';

export function normalizeLiteHtmlExportContentMode(mode: unknown): LiteHtmlExportContentMode {
  return mode === 'withCompared' ? 'withCompared' : 'diffOnly';
}

export function getLiteHtmlExportContentLabel(mode: unknown): string {
  return normalizeLiteHtmlExportContentMode(mode) === 'withCompared'
    ? '比較設定込み（フィールド詳細・反映JSON）'
    : '差分行のみ（安全共有向け）';
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
  return !!result?.truncation?.truncated || (result?.fetchIssues || []).length > 0 || (result?.partialIssues || []).length > 0;
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
  const seed = [
    row.sectionKey || '',
    row.type || '',
    row.moved ? 'moved' : '',
    row.path || '',
    row.arrayKey || '',
    stableStringify(row.arrayKeyValue)
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
  const truncated = !!cache.truncation?.truncated;
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
    `<button type="button" class="kus-dl-metric" data-kus-dl-type-filter="${esc(type)}" aria-label="${esc(label)} ${value}件を表示"${value ? '' : ' disabled'}>` +
      `<span class="kus-dl-metric__num">${value}</span><span class="kus-dl-metric__label">${esc(label)}</span><span class="kus-dl-metric__hint">${esc(hint)}</span></button>`;

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
    return `<button type="button" class="kus-dl-section-jump" data-kus-dl-section-filter="${esc(key)}">${esc(label)} ${esc(countLabel)}</button>`;
  }).join('');

  const alerts: string[] = [];
  if (truncated) {
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
  return `<section class="kus-dl-overview" aria-label="比較結果サマリー">` +
    `<div class="kus-dl-overview__direction"><div class="kus-dl-side"><span class="kus-dl-side__role">比較元</span><span class="kus-dl-side__name" title="${esc(source.name)}">${esc(source.name)}</span><span class="kus-dl-side__env">${esc(source.environment)}</span></div>` +
    `<span class="kus-dl-overview__arrow" aria-label="から">→</span>` +
    `<div class="kus-dl-side kus-dl-side--target"><span class="kus-dl-side__role">比較先</span><span class="kus-dl-side__name" title="${esc(target.name)}">${esc(target.name)}</span><span class="kus-dl-side__env">${esc(target.environment)}</span></div></div>` +
    `<div class="kus-dl-verdict ${verdictClass}" data-kus-dl-completeness="${completeness}"${announceAttrs}><span class="kus-dl-verdict__eyebrow">${incomplete ? '確認が必要' : '比較完了'}</span><strong>${esc(verdictTitle)}</strong><span>${esc(verdictText)}</span></div>` +
    alertsHtml +
    `<div class="kus-dl-metrics"><div class="kus-dl-metric"><span class="kus-dl-metric__num">${counts.actual}</span><span class="kus-dl-metric__label">差分</span><span class="kus-dl-metric__hint">同一を除く</span></div>` +
      metric('added', '比較先のみ', '追加として検出', counts.added) + metric('removed', '比較元のみ', '削除として検出', counts.removed) +
      metric('changed', '内容が異なる', '変更として検出', contentChanged) + metric('moved', '並び順', '移動として検出', counts.moved) + '</div>' +
    (sectionButtons ? `<div class="kus-dl-section-nav"><span class="kus-dl-section-nav__label">セクションを開く</span>${sectionButtons}</div>` : '') +
    (ignoreRuleSummary.total ? `<div class="kus-dl-alert" role="note">無視ルール ${ignoreRuleSummary.total}件を適用した後の結果です。ルールに一致した設定差分は一覧に含まれません${ignoreRuleSummary.contextualRules ? `（完全パス/パターン ${ignoreRuleSummary.contextualRules}件）` : ''}。</div>` : '') +
    '<div class="kus-dl-legend">「比較先のみ」は追加、「比較元のみ」は削除として検出しています。比較方向は上の矢印で確認できます。</div></section>';
}

export interface LiteRowsRenderOptions {
  collapsedSections?: ReadonlySet<string>;
  currentRowKey?: string;
  expandedValueKeys?: ReadonlySet<string>;
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
          : `<button type="button" class="kus-dl-row__action" data-kus-dl-ignore-path="${esc(r.path)}" title="この項目だけを次回比較から除外">次回から除外</button>`)
        : '';
      parts.push(`<article class="kus-dl-row kus-dl-row--${esc(typeKey)}${current ? ' is-current' : ''}" data-kus-dl-row-key="${esc(rowKey)}" tabindex="-1"${current ? ' aria-current="true"' : ''} aria-label="${esc(`${typeLabel}・${factLabel}: ${identity.title}`)}"><div class="kus-dl-row__head"><div class="kus-dl-row__identity"><div class="kus-dl-row__headline">${typeBadge}<span class="kus-dl-row__title">${esc(identity.title)}</span>${flagHtml}</div>${identity.subtitle ? `<div class="kus-dl-row__subtitle">${esc(identity.subtitle)}</div>` : ''}</div>${ignoreAction}</div>${contextHtml}${technicalHtml}<div class="kus-dl-row__cols">${cols.left}${cols.right}</div></article>`);
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
    subtitle: '2 アプリの設定差分を比較し、HTML レポートと Excel 一覧で確認',
    accent: 'diff',
    badges: [{ label: 'Lite' }, { label: '出力対応' }],
    hint: '比較完了と同時に HTML レポートを保存します。結果は Excel (.xlsx) の一覧としても保存できます。<strong>統合ツール.js は不要</strong>。',
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
  let comparisonMode: 'single' | 'multi' = 'single';
  let applyComparisonMode: (mode: 'single' | 'multi') => void = (mode) => { comparisonMode = mode; };

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
  const singleModeBtn = makeButton('通常比較', 'sub');
  singleModeBtn.dataset.kusDlMode = 'single';
  const multiModeBtn = makeButton('複数比較', 'sub');
  multiModeBtn.dataset.kusDlMode = 'multi';
  modeSwitch.append(singleModeBtn, multiModeBtn);
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
    });
    app.addEventListener('input', () => { if (entry.appName) setTargetName(entry, ''); });
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
  srcApp.addEventListener('input', () => { if (sourceAppName) setSourceName(''); });
  tgtApp.addEventListener('input', () => { if (targetRows[0]?.appName) setTargetName(targetRows[0], ''); });
  attachTargetSplit(targetRows[0]);
  const addTargetBtn = makeButton('比較先行を追加', 'sub');
  addTargetBtn.addEventListener('click', () => { addTargetRow(); applyComparisonMode('multi'); panel.setStatus('比較先行を追加しました', 'info'); });
  const copyFirstBtn = makeButton('比較先1を複製', 'sub');
  copyFirstBtn.addEventListener('click', () => { addTargetRow(tgtApp.value.trim(), tgtGuest.value.trim(), targetRows[0]?.appName || ''); applyComparisonMode('multi'); });
  const multiControls = makeRow([addTargetBtn, copyFirstBtn], { label: '比較先を増やす' });
  multiControls.classList.add('kus-dl-multi-controls');
  targetCard.appendChild(multiControls);
  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '比較元', apply: (id, name, guestId) => { srcApp.value = id; setSourceName(name); if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId; } },
      { label: '比較先', apply: (id, name, guestId) => {
        const empty = targetRows.find((r) => !r.app.value.trim()) || addTargetRow();
        empty.app.value = id;
        setTargetName(empty, name);
        if (guestId && !empty.guest.value.trim()) empty.guest.value = guestId;
      } }
    ]
  }));
  targetCard.appendChild(targetList);
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
  allBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = true; }));
  noneBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = false; }));
  panel.body.insertBefore(cardScope.card, panel.status);

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
  const nAppRefs = makeCheck({ label: 'アプリID/参照先アプリIDを無視', checked: false });
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
    nAppRefs.label,
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
  const runRow = makeRow([runBtn, runAllBtn]);
  runRow.classList.add('kus-dl-run-row');
  panel.body.insertBefore(runRow, panel.status);
  // 入力欄で Enter を押すと差分比較を実行（読み取り専用なので安全）
  panel.setPrimaryAction(runBtn);
  applyComparisonMode = (mode) => {
    comparisonMode = mode;
    panel.root.dataset.kusDlMode = mode;
    singleModeBtn.setAttribute('aria-pressed', mode === 'single' ? 'true' : 'false');
    multiModeBtn.setAttribute('aria-pressed', mode === 'multi' ? 'true' : 'false');
    singleModeBtn.classList.toggle('is-active', mode === 'single');
    multiModeBtn.classList.toggle('is-active', mode === 'multi');
    multiControls.hidden = mode !== 'multi';
    targetList.hidden = mode !== 'multi';
    runBtn.hidden = mode !== 'single';
    runAllBtn.hidden = mode !== 'multi';
    swapBtn.disabled = mode === 'multi';
    swapBtn.title = mode === 'multi' ? '通常比較に切り替えると方向を入れ替えられます' : '';
    panel.setPrimaryAction(mode === 'multi' ? runAllBtn : runBtn);
  };
  singleModeBtn.addEventListener('click', () => applyComparisonMode('single'));
  multiModeBtn.addEventListener('click', () => applyComparisonMode('multi'));
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
  const cardOut = makeCard({ title: 'ファイル出力', number: 3, soft: true });
  cardOut.body.appendChild(makeNote('HTML レポートは比較実行時に、下の「HTML内容」で選んだ形式により自動保存されます。Excel は比較後に、全件または画面で絞り込んだ範囲を一覧として保存できます。'));
  cardOut.body.appendChild(makeNote('既定の「差分行のみ」は比較元・比較先の設定本文を埋め込まないため共有向けです。「比較設定込み」にはフィールド詳細や反映JSON作成に必要な設定値が入るため、共有先と保管場所に注意してください。'));
  const htmlContentMode = makeSelect([
    ['diffOnly', '差分行のみ（安全共有向け）'],
    ['withCompared', '比較設定込み（フィールド詳細・反映JSON）']
  ], 'diffOnly');
  cardOut.body.appendChild(makeRow(htmlContentMode, { label: 'HTML内容' }));
  const expRange = makeSelect([
    ['all', '全件'],
    ['filtered', '表示中（フィルタ適用後）']
  ], 'all');
  cardOut.body.appendChild(makeRow(expRange, { label: '範囲' }));

  const grid = document.createElement('div');
  grid.className = 'kus-lp__btn-grid';
  const bXlsx = makeButton('差分一覧を Excel 保存 (.xlsx)', 'primary', { icon: '↓' });
  const bHtml = makeButton('差分 HTML を再出力', 'sub', { icon: '↓' });
  bXlsx.dataset.kusDlExport = 'xlsx';
  bHtml.dataset.kusDlExport = 'html';
  grid.appendChild(bXlsx);
  grid.appendChild(bHtml);
  cardOut.body.appendChild(grid);
  // 出力カードは結果カードの前に挿入し、差分件数が多くても結果リストの下までスクロールせず
  // 出力ボタンへすぐ届くようにする
  panel.body.insertBefore(cardOut.card, cardResult.card);

  // ---- 白紙から組み直したワークフロー ----
  const workflow = document.createElement('main');
  workflow.className = 'kus-dl-workflow';
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
  const exportStep = makeWorkflowStep('export', '3', '結果を出力する', '確認用の Excel または共有用の HTML を保存できます。');

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

  targetStep.append(cardApp.card, configDetails, runRow, panel.status);
  reviewStep.append(reviewEmpty, filterDetails, cardResult.card);
  exportStep.appendChild(outputDetails);
  workflow.append(targetStep, reviewStep, exportStep);
  panel.body.insertBefore(workflow, panel.result);

  const setExportControlsEnabled = (enabled: boolean) => {
    expRange.disabled = !enabled;
    bXlsx.disabled = !enabled;
    bHtml.disabled = !enabled;
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
  let importedSourceBundle: any = null;
  let importedTargetBundle: any = null;

  swapBtn.addEventListener('click', () => {
    if (comparisonMode === 'multi') {
      panel.setStatus('比較方向の入れ替えは、比較先が1件の通常比較で利用できます', 'warn');
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
    panel.setStatus('比較元と比較先を入れ替えました。矢印の向きを確認して比較してください', 'info');
  });

  srcFile.addEventListener('change', () => liteRun(panel, '比較元JSONを読み込み中…', async () => {
    const file = srcFile.files?.[0];
    if (!file) return;
    importedSourceBundle = await readSettingsBundleFile(file, { side: 'source', appId: srcApp.value.trim() });
    if (!srcApp.value.trim() && importedSourceBundle?.appId) srcApp.value = String(importedSourceBundle.appId);
    setSourceName(extractAppNameFromBundle(importedSourceBundle));
    panel.setStatus(`比較元JSONを読み込みました: App ${importedSourceBundle?.appId || '-'}`, 'ok');
  }));
  tgtFile.addEventListener('change', () => liteRun(panel, '比較先JSONを読み込み中…', async () => {
    const file = tgtFile.files?.[0];
    if (!file) return;
    importedTargetBundle = await readSettingsBundleFile(file, { side: 'target', appId: tgtApp.value.trim() });
    if (!tgtApp.value.trim() && importedTargetBundle?.appId) tgtApp.value = String(importedTargetBundle.appId);
    setTargetName(targetRows[0], extractAppNameFromBundle(importedTargetBundle));
    panel.setStatus(`比較先JSONを読み込みました: App ${importedTargetBundle?.appId || '-'}`, 'ok');
  }));
  clearImportBtn.addEventListener('click', () => {
    importedSourceBundle = null;
    importedTargetBundle = null;
    srcFile.value = '';
    tgtFile.value = '';
    panel.setStatus('設定JSONの読込を解除しました', 'info');
  });

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
        panel.setStatus(`比較条件「${profile.name}」を読み込みました（対象 ${profile.scopes.length}セクション / 無視 ${ruleSummary.total}件）。アプリと環境は変更していません。結果を更新するため再比較してください。${pathWarning}`, 'warn');
      });
    } finally {
      profileFile.value = '';
      profileIoActive = false;
      profileSaveBtn.disabled = false;
      profileLoadBtn.disabled = false;
      runBtn.disabled = diffRunActive;
      runAllBtn.disabled = diffRunActive;
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
      `<span class="kus-dl-reviewbar__nav"><button type="button" class="kus-dl-navbtn" data-kus-dl-nav="prev" aria-keyshortcuts="K"${prevDisabled ? ' disabled' : ''}>↑ 前の差分 (K)</button>` +
      `<button type="button" class="kus-dl-navbtn" data-kus-dl-nav="next" aria-keyshortcuts="J"${nextDisabled ? ' disabled' : ''}>次の差分 (J) ↓</button></span>` +
      `<span class="kus-dl-reviewbar__tools"><button type="button" class="kus-dl-navbtn" data-kus-dl-sections="collapse">すべて折りたたむ</button>` +
      `<button type="button" class="kus-dl-navbtn" data-kus-dl-sections="expand">すべて展開</button></span>` +
      `<span class="kus-dl-reviewbar__filters" aria-label="有効なフィルタ">${renderActiveFilterChipsHtml()}</span></nav>`;
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
    resultBox.innerHTML = overview + `<div class="kus-dl-sticky">${renderReviewBarHtml(rows, source, target)}</div>` + renderRowsHtml(visibleRows, charDiffCb.checkbox.checked, summary, rows, { collapsedSections, currentRowKey, expandedValueKeys }) + more;
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
    const multiXlsxButton = target?.closest<HTMLButtonElement>('[data-kus-dl-multi-xlsx]');
    if (multiXlsxButton) {
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
      return;
    }
    const sectionButton = target?.closest<HTMLElement>('[data-kus-dl-section-filter]');
    if (sectionButton) {
      showResultList.checkbox.checked = true;
      filterSection.value = sectionButton.dataset.kusDlSectionFilter || '';
      rerenderFromFilter();
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
    htmlContentMode.disabled = true;
    profileSaveBtn.disabled = true;
    profileLoadBtn.disabled = true;
    setExportControlsEnabled(false);
    try {
      await liteRun(panel, busyMessage, task);
    } finally {
      diffRunActive = false;
      unlockComparisonControls();
      runBtn.disabled = false;
      runAllBtn.disabled = false;
      htmlContentMode.disabled = false;
      profileSaveBtn.disabled = profileIoActive;
      profileLoadBtn.disabled = profileIoActive;
      setExportControlsEnabled(!!cache);
    }
  }

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
      resultBox.innerHTML = `<div class="kus-dl-result"><table class="kus-dl-multi"><caption>複数比較の結果（比較元は最初の取得結果を再利用）</caption><thead><tr><th>比較先</th><th>取得状態<br><small>件数より先に確認</small></th><th>差分</th><th>追加<br><small>比較先のみ</small></th><th>削除<br><small>比較元のみ</small></th><th>内容変更</th><th>移動</th><th>取得失敗<br><small>一部未検証</small></th><th>Excel</th></tr></thead><tbody>${resultRows.join('')}</tbody></table></div>`;
      const tone = failed || exportFailed || incomplete || exported !== targets.length ? 'warn' : 'ok';
      const note = [failed ? `比較失敗 ${failed}件` : '', exportFailed ? `HTML出力失敗 ${exportFailed}件` : '', incomplete ? `要確認 ${incomplete}件` : ''].filter(Boolean).join(' / ');
      panel.setStatus(`全比較先の比較が完了: HTMLダウンロード ${exported}/${targets.length}件開始（${getLiteHtmlExportContentLabel(htmlContentMode.value)}）${note ? ` / ${note}` : ''}`, tone);
    });
  });

  runBtn.addEventListener('click', () => {
    cache = null;
    multiXlsxExports = [];
    currentRowKey = '';
    collapsedSections.clear();
    expandedValueKeys.clear();
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
      const ctx = exportCtx();
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
      panel.setStatus(`差分一覧 Excel のダウンロードを開始しました: ${result.filename}${incomplete ? ' — 元の比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
    } catch (e: any) {
      panel.setStatus(`Excel出力エラー: ${e?.message || String(e)}`, 'err');
    } finally {
      const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
      if (cooldown > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, cooldown));
      xlsxExportActive = false;
      setExportControlsEnabled(!!cache);
    }
  });
}
