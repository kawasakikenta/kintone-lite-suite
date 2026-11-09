'use strict';

/**
 * 「反映元アプリから本番へ」の画面のスタイル。本番反映パネル（#kus-deploy-lite）の中だけに効く。
 * 共通の部品（kus-dp-*: 段階の表示・固定フッター・ピル・結果の行など）は deploy-lite-ui.ts の CSS を使い、ここには新しい部品（kus-ds-*）だけを置く。
 */

const P = '#kus-deploy-lite';
const STYLE_ID = 'kus-deploy-source-styles';

const CSS = `
${P} .kus-ds-skip{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
${P} .kus-ds-skip:focus{outline:3px solid #2563eb;outline-offset:2px;position:static;width:auto;height:auto;margin:0 0 8px;padding:6px 12px;overflow:visible;clip:auto;border:2px solid #2563eb;border-radius:8px;background:#fff;color:#1e3a8a;font-size:13px;font-weight:700;cursor:pointer}
${P} .kus-ds-flowbar{flex-shrink:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 24px;background:#fff;border-bottom:1px solid #e2e8f0}
${P} .kus-ds-flowbar__label{font-size:12.5px;font-weight:700;color:#64748b}
${P} .kus-ds-flowbar__group{display:flex;flex-wrap:wrap;gap:6px}
${P} .kus-ds-flow{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;font-size:13px;font-weight:700;cursor:pointer}
${P} .kus-ds-flow:has(input:checked){border-color:#be123c;background:#fff1f2;color:#881337}
${P} .kus-ds-flow:has(input:disabled){opacity:.55;cursor:not-allowed}
${P} .kus-ds-flow:has(input:focus-visible){outline:3px solid #2563eb;outline-offset:2px}
${P} .kus-ds-flow input{margin:0;accent-color:#be123c}
${P} .kus-dp-nav--five{grid-template-columns:repeat(5,minmax(0,1fr))}
${P} .kus-ds-route{display:grid;grid-template-columns:minmax(0,1fr) 40px minmax(0,1fr);align-items:stretch;gap:10px}
${P} .kus-ds-endpoint{padding:13px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;min-width:0}
${P} .kus-ds-endpoint--target{background:#fff7ed;border-color:#fed7aa}
${P} .kus-ds-endpoint__eyebrow{margin-bottom:8px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#64748b}
${P} .kus-ds-endpoint--target .kus-ds-endpoint__eyebrow{color:#c2410c}
${P} .kus-ds-endpoint__note{font-size:12.5px;color:#9a3412;margin-bottom:8px}
${P} .kus-ds-endpoint .kus-lp__select{width:100%;margin-bottom:8px;min-width:0}
${P} .kus-ds-endpoint .kus-lp__input{width:100%;min-width:0;box-sizing:border-box;min-height:40px;font-size:14px}
${P} .kus-ds-endpoint .kus-lp__file{width:100%;min-width:0;box-sizing:border-box;margin:8px 0}
${P} .kus-ds-field{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;margin:8px 0}
${P} .kus-ds-arrow-col{display:flex;align-items:center;justify-content:center;color:#be123c;font-size:22px;font-weight:800}
${P} .kus-ds-app-note{margin:-2px 0 8px;min-height:18px;font-size:13px;line-height:1.5;color:#64748b;overflow-wrap:anywhere}
${P} .kus-ds-app-note--ok{color:#065f46;font-weight:600}
${P} .kus-ds-app-note--warn{color:#b91c1c;font-weight:700}
${P} .kus-ds-scope-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
${P} .kus-ds-scope-group{min-width:0;margin:0;padding:10px;border:1px solid #e2e8f0;border-radius:10px}
${P} .kus-ds-scope-group legend{font-size:12.5px;font-weight:700;color:#475569;padding:0 4px}
${P} .kus-ds-scope-group .kus-lp__chips{display:flex;flex-direction:column;align-items:stretch;margin-bottom:0}
${P} .kus-ds-scope-group .kus-lp__chip{display:flex;align-items:center;gap:6px;border-radius:6px;white-space:normal;min-height:32px}
${P} .kus-ds-chip__badge{margin-left:auto;flex:none;padding:0 6px;border:1px solid #fb923c;border-radius:4px;background:#fff7ed;color:#9a3412;font-size:11.5px;font-weight:800;line-height:16px}
${P} .kus-ds-note{padding:9px 12px;border-radius:10px;font-size:13px;line-height:1.6;border:1px solid #e2e8f0;background:#fff;overflow-wrap:anywhere}
${P} .kus-ds-note strong{display:block;margin-bottom:2px}
${P} .kus-ds-note--info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}
${P} .kus-ds-note--ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
${P} .kus-ds-note--warn{background:#fffbeb;border-color:#fde68a;color:#92400e}
${P} .kus-ds-note--err{background:#fef2f2;border-color:#fecaca;color:#991b1b}
${P} .kus-ds-note--quiet{background:#f8fafc;border-color:#e2e8f0;color:#475569}
${P} .kus-ds-note[hidden]{display:none}
${P} .kus-ds-summary,${P} .kus-ds-cards,${P} .kus-ds-select,${P} .kus-ds-edit-root{display:flex;flex-direction:column;gap:10px;min-width:0}
${P} .kus-ds-filter{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
${P} .kus-ds-filter .kus-lp__input{flex:1 1 220px;min-width:0}
${P} .kus-ds-filter__count{font-size:12.5px;color:#64748b}
${P} .kus-ds-card{padding:12px 14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;min-width:0;display:flex;flex-direction:column;gap:8px}
${P} .kus-ds-card--same{background:#f8fafc}
${P} .kus-ds-card--error{border-color:#fca5a5;background:#fff5f5}
${P} .kus-ds-card__head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
${P} .kus-ds-card__title{font-size:14px;color:#0f172a}
${P} .kus-ds-card__count{font-size:12.5px;font-weight:700;color:#475569}
${P} .kus-ds-card__tools{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto}
${P} .kus-ds-card__note{font-size:13px;color:#64748b;overflow-wrap:anywhere}
${P} .kus-ds-card__problem{font-size:13px;color:#991b1b;white-space:pre-wrap;overflow-wrap:anywhere}
${P} .kus-ds-card__problems{margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#92400e;overflow-wrap:anywhere}
${P} .kus-ds-card__problems--error{color:#991b1b}
${P} .kus-ds-card__problems[hidden]{display:none}
${P} .kus-ds-card__body{display:flex;flex-direction:column;gap:6px;min-width:0}
${P} .kus-ds-card__body[hidden]{display:none}
${P} .kus-ds-group{border:1px solid #f1f5f9;border-radius:10px;overflow:hidden}
${P} .kus-ds-group__head{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8fafc;cursor:pointer;font-size:13px}
${P} .kus-ds-group__head input{margin:0;flex:none}
${P} .kus-ds-group__count{margin-left:auto;color:#64748b;font-variant-numeric:tabular-nums}
${P} .kus-ds-row{display:grid;grid-template-columns:28px minmax(0,1fr);gap:6px;padding:7px 10px;border-top:1px solid #f1f5f9;align-items:start}
${P} .kus-ds-row__check{display:flex;align-items:center;justify-content:center;padding-top:2px}
${P} .kus-ds-row__main{min-width:0;display:flex;flex-direction:column;gap:3px}
${P} .kus-ds-row__path{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
${P} .kus-ds-row__name{min-width:0}
${P} .kus-ds-row__diff{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font-size:13px;color:#334155;min-width:0}
${P} .kus-ds-row__whole{font-size:12.5px;color:#64748b}
${P} .kus-ds-row__req{font-size:12.5px;color:#1e40af}
${P} .kus-ds-value{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;max-width:100%;overflow-wrap:anywhere;white-space:pre-wrap;padding:1px 6px;border-radius:5px;background:#f1f5f9}
${P} .kus-ds-value--before{background:#fef2f2;color:#991b1b}
${P} .kus-ds-value--after{background:#f0fdf4;color:#166534}
${P} .kus-ds-arrow{color:#64748b}
${P} .kus-ds-empty{padding:12px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:13px;color:#64748b}
${P} .kus-ds-edit-group{border:1px solid #f1f5f9;border-radius:10px;overflow:hidden}
${P} .kus-ds-edit-group__title{padding:6px 10px;background:#f8fafc;font-size:13px;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
${P} .kus-ds-edit{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(0,1.2fr) auto;gap:6px 10px;align-items:center;padding:7px 10px;border-top:1px solid #f1f5f9;border-left:4px solid transparent}
${P} .kus-ds-edit--changed{border-left-color:#d97706;background:#fffbeb}
${P} .kus-ds-edit__label{font-size:13px;font-weight:600;color:#334155;overflow-wrap:anywhere}
${P} .kus-ds-edit__control{display:flex;align-items:center;gap:8px;min-width:0}
${P} .kus-ds-edit__control .kus-lp__input,${P} .kus-ds-edit__control .kus-lp__select{width:100%;min-width:0;box-sizing:border-box}
${P} .kus-ds-edit__meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12.5px;color:#64748b;min-width:0}
${P} .kus-ds-edit__default{overflow-wrap:anywhere}
${P} .kus-ds-json{display:flex;flex-direction:column;gap:8px}
${P} .kus-ds-json[hidden]{display:none}
${P} .kus-ds-json__help{margin:0;font-size:12.5px;color:#64748b}
${P} .kus-ds-json__error{margin:0;font-size:13px;font-weight:700;color:#b91c1c}
${P} .kus-ds-json__actions{display:flex;flex-wrap:wrap;gap:6px}
${P} .kus-ds-json textarea{min-height:200px}
${P} .kus-ds-plan{min-width:0}
${P} .kus-ds-plan__title{font-size:12.5px;font-weight:700;color:#64748b;margin-bottom:2px}
${P} .kus-ds-blockers{margin-top:2px}
${P} .kus-ds-blockers[hidden]{display:none}
${P} .kus-ds-confirm-sections{display:flex;flex-direction:column;gap:8px}
${P} .kus-ds-confirm-section{padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;min-width:0}
${P} .kus-ds-confirm-section__head{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;font-size:13px}
${P} .kus-ds-confirm-section__head strong{color:#0f172a}
${P} .kus-ds-confirm-section details{margin-top:4px}
${P} .kus-ds-confirm-section summary{cursor:pointer;font-size:12.5px;font-weight:700;color:#64748b}
${P} .kus-ds-route-line{font-size:14px;font-weight:700;color:#0f172a;overflow-wrap:anywhere}
${P} .kus-ds-result-grid{display:flex;flex-direction:column;gap:12px}
${P} .kus-ds-result-head{font-size:14px;font-weight:700;margin:0 0 8px;overflow-wrap:anywhere}
${P} .kus-ds-filetools{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
${P} .kus-ds-filetools__hint{flex:1 1 220px;min-width:0;font-size:12.5px;color:#64748b;overflow-wrap:anywhere}
${P} .kus-ds-verify{display:flex;flex-direction:column;gap:8px;min-width:0}
${P} .kus-ds-verify__list{margin:0;padding-left:18px;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
${P} .kus-ds-verify__value{display:inline;padding:1px 6px;border-radius:5px;background:#f1f5f9;white-space:pre-wrap;overflow-wrap:anywhere}
${P} .kus-ds-impact{margin-top:6px;font-size:13px;line-height:1.6;font-weight:600;color:#991b1b;overflow-wrap:anywhere}
@media(max-width:900px){
  ${P} .kus-ds-scope-groups{grid-template-columns:1fr}
}
@media(max-width:760px){
  ${P} .kus-ds-route{grid-template-columns:1fr}
  ${P} .kus-ds-arrow-col{height:24px;transform:rotate(90deg)}
  ${P} .kus-ds-edit{grid-template-columns:1fr}
  ${P} .kus-ds-card__tools{margin-left:0}
}
@media(max-width:720px){
  ${P} .kus-ds-flowbar{padding:8px 16px}
  ${P} .kus-ds-flowbar__label{display:none}
  ${P} .kus-ds-flow{flex:1 1 auto;justify-content:center}
  ${P} .kus-dp-nav--five{padding:8px;gap:4px}
  ${P} .kus-dp-nav--five .kus-dp-nav__btn{font-size:11.5px;padding:8px 2px}
}
@media(max-width:420px){
  ${P} .kus-ds-flowbar__group{flex-wrap:wrap;width:100%}
  ${P} .kus-ds-flow{font-size:12px;padding:6px 8px;gap:4px;min-width:0;white-space:normal;overflow-wrap:anywhere}
}
@media(max-height:720px){
  ${P} .kus-ds-flowbar{padding:4px 12px}
}
`;

export function ensureSourceStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
