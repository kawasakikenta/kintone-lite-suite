import { attachCardHelp, makeButton, makeDetails, makeDialog, type LitePanelHandle } from './litePanelTheme.js';

export interface LiteWorkflowAction {
  id: string;
  label: string;
  description: string;
  button: HTMLButtonElement;
  writes?: boolean;
  validate: () => string;
  summary: () => Array<[string, string]>;
  onSelect?: () => void;
}

const CSS = `
.kus-wf.kus-lp{width:min(920px,calc(100vw - 32px));max-height:calc(100dvh - 32px);top:16px;right:16px;border-radius:18px}
.kus-wf .kus-lp__hero{background:#172033;padding:16px 22px}
.kus-wf .kus-lp__badge-row{margin-top:6px}
.kus-wf .kus-lp__body{padding:0;display:flex;flex-direction:column;overflow:hidden;min-height:0;background:#f5f7fa}
.kus-wf .kus-lp__hint{margin:0;padding:10px 22px;border-radius:0;flex-shrink:0}
.kus-wf [hidden]{display:none!important}
.kus-wf .kus-lp__card{padding:16px;border-radius:14px;min-width:0}
.kus-wf .kus-lp__card-head{flex-wrap:wrap}
.kus-wf .kus-lp__row{min-width:0;flex-wrap:wrap}
.kus-wf :is(input,select,textarea){max-width:100%;box-sizing:border-box}
.kus-wf .kus-lp__input{min-width:0}
.kus-wf .kus-lp__file{min-width:0;width:100%}
.kus-wf .kus-lp__btn{white-space:normal}
.kus-wf .kus-lp__tab-panel{min-width:0}
.kus-wf .kus-lp__note{overflow-wrap:anywhere}
.kus-wf :is(button,input,select,textarea,summary):focus-visible,.kus-wf-nav button:focus-visible{outline:3px solid #2563eb;outline-offset:3px}
.kus-wf-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px 22px;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.kus-wf-nav button{font-family:inherit;font-size:13.5px;font-weight:600;line-height:1.4;border:2px solid #e2e8f0;padding:9px 10px;border-radius:9px;background:#fff;color:#475569;cursor:pointer;position:relative}
/* 段階の状態: 現在（濃い青・太字）、済み（緑・左端に印）、これから（灰色） */
.kus-wf-nav button[aria-selected=true],.kus-wf-nav button[aria-current=step]{background:#1d4ed8;border-color:#1d4ed8;color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(29,78,216,.28)}
.kus-wf-nav button[data-state=done]{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
.kus-wf-nav button[data-state=done]::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;border-radius:7px 0 0 7px;background:#10b981}
.kus-wf-nav button[data-state=upcoming]{color:#64748b;background:#f8fafc}
.kus-wf-nav button:disabled{opacity:.5;cursor:not-allowed}
.kus-wf-canvas{overflow:auto;min-height:0;min-width:0;flex:1;padding:18px 22px;scroll-padding:16px}
.kus-wf-stage{min-width:0}
.kus-wf-heading{margin:0 0 4px;font-size:20px;color:#0f172a}
.kus-wf-intro{margin:0 0 16px;color:#64748b;font-size:13px}
.kus-wf-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-bottom:16px}
.kus-wf-action{padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer;display:grid;grid-template-columns:18px 1fr;gap:8px;font-size:13px;min-width:0;align-items:start}
.kus-wf-action:has(input:checked){border-color:#60a5fa;background:#eff6ff}
.kus-wf-action strong{display:block;color:#0f172a}
.kus-wf-action small{display:block;margin-top:3px;color:#64748b;line-height:1.5}
.kus-wf-action em{display:inline-block;font-size:12.5px;font-style:normal;color:#9a3412;margin-top:5px}
.kus-wf-action--more{grid-template-columns:1fr;text-align:left;font-family:inherit;color:#1d4ed8;border-style:dashed}
.kus-wf-action--more[aria-pressed=true]{border-style:solid;border-color:#60a5fa;background:#eff6ff}
.kus-wf-action--more strong{color:#1d4ed8}
.kus-wf-action--more[aria-pressed=true] strong{color:#0f172a}
.kus-wf-advanced{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:4px 0 16px;padding:10px 14px;border:1px dashed #cbd5e1;border-radius:10px;background:#fff}
.kus-wf-advanced__copy{font-size:13px;color:#475569;min-width:0;flex:1}
.kus-wf-advanced__btn{flex-shrink:0}
.kus-wf-dialog-status{flex:1 1 12em;min-width:0;max-height:6em;overflow:auto;align-self:center;padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#334155;font-size:13px;line-height:1.5}
.kus-wf-dialog-status[hidden]{display:none}
.kus-wf-dialog-status[data-tone=ok]{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
.kus-wf-dialog-status[data-tone=warn]{background:#fffbeb;border-color:#fde68a;color:#92400e}
.kus-wf-dialog-status[data-tone=err]{background:#fef2f2;border-color:#fecaca;color:#991b1b}
.kus-wf-summary{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:4px 16px}
.kus-wf-summary>div{display:grid;grid-template-columns:140px minmax(0,1fr);gap:16px;padding:12px 0;border-bottom:1px solid #eef2f6}
.kus-wf-summary>div:last-child{border:0}
.kus-wf-summary dt{color:#64748b;font-size:13px}
.kus-wf-summary dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#0f172a;font-size:14px}
.kus-wf-notice{padding:12px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;margin:14px 0;color:#1e40af;font-size:13px;overflow-wrap:anywhere;white-space:pre-wrap}
.kus-wf-notice[data-write=true]{border-color:#fed7aa;background:#fff7ed;color:#9a3412}
.kus-wf-footer{padding:12px 22px;background:#fff;border-top:1px solid #e2e8f0;flex-shrink:0}
.kus-wf-footer-row{display:flex;align-items:center;gap:12px}
.kus-wf-footer-copy{flex:1;min-width:0;font-size:13px;color:#475569;overflow-wrap:anywhere}
.kus-wf-footer-buttons{display:flex;gap:8px;flex-shrink:0}
.kus-wf-footer-buttons button{min-height:42px;max-width:320px}
.kus-wf-footer .kus-lp__status{margin-top:8px}
.kus-wf-footer .kus-lp__status-text{max-height:44px;overflow:auto}
.kus-wf .kus-lp__result{white-space:pre-wrap;max-height:none;overflow-wrap:anywhere}
.kus-wf .kus-lp__apptable-scroll{overflow:auto}
.kus-wf-jump{border:1px solid #e2e8f0;border-radius:12px;margin-bottom:14px}
@media(max-width:720px){
 .kus-wf.kus-lp{width:calc(100vw - 16px);max-height:calc(100dvh - 16px);top:8px;right:8px}
 .kus-wf .kus-lp__hero{padding:12px 16px}
 .kus-wf .kus-lp__hint{padding:8px 16px;font-size:12.5px}
 .kus-wf-nav{padding:8px;gap:4px}
 .kus-wf-nav button{padding:9px 3px;font-size:12.5px}
 .kus-wf-canvas{padding:16px}
 .kus-wf .kus-lp__card{padding:12px}
 .kus-wf-actions{grid-template-columns:1fr}
 .kus-wf-summary>div{grid-template-columns:1fr;gap:4px}
 .kus-wf-footer{padding:10px 16px}
 .kus-wf-footer-row{display:block}
 .kus-wf-footer-buttons{display:flex;margin-top:8px}
 .kus-wf-footer-buttons button{flex:1;min-width:0;max-width:none}
}
`;

function ensureStyles() {
  if (document.getElementById('kus-workflow-style')) return;
  const style = document.createElement('style');
  style.id = 'kus-workflow-style';
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function foldWorkflowSection(title: string, ...nodes: HTMLElement[]): HTMLDetailsElement {
  const details = makeDetails(title);
  details.body.append(...nodes);
  return details.details;
}

export function connectionSummary(appId: string, guestId = '', environment = '本番'): string {
  return `#${appId || '未入力'}${guestId ? `（ゲスト ${guestId}）` : ''} · ${environment}`;
}

// 確認画面の対象一覧の省略（先頭 20 件＋件数）。tabs/ の実行処理の確認ダイアログでも使うため utils に置く。
export { SUMMARY_LIST_LIMIT, summarizeList } from '../utils.js';

export function validateJsonObject(value: string, label = 'JSON'): string {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? '' : `${label}はオブジェクト形式で入力してください。`;
  } catch { return `${label}を読み込むか、有効なJSONを入力してください。`; }
}

/** 既存の処理・確認ダイアログを保ったまま、入力と実行を段階に分ける。 */
export function installLiteWorkflow(panel: LitePanelHandle, options: {
  setup: HTMLElement[];
  /** 表面に出さない補助カード。「詳細設定…」のポップアップにまとめる。 */
  advanced?: HTMLElement[];
  /** 詳細設定ポップアップの見出し（既定: 詳細設定）。 */
  advancedLabel?: string;
  /** 詳細設定ボタンの横に出す 1 行の説明。 */
  advancedCopy?: string;
  /** 表面に出す操作の数（既定 3）。残りは「ほかの操作…」のポップアップで選ぶ。 */
  primaryActions?: number;
  results?: HTMLElement[];
  resultActions?: string[];
  beforeRun?: (actionId: string) => void;
  actions: LiteWorkflowAction[];
}) {
  ensureStyles();
  panel.root.classList.add('kus-wf');
  const nav = document.createElement('nav');
  nav.className = 'kus-wf-nav';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', '操作の手順');
  const canvas = document.createElement('div');
  canvas.className = 'kus-wf-canvas';
  const setup = document.createElement('section');
  const review = document.createElement('section');
  const result = document.createElement('section');
  const stages = [setup, review, result];
  const labels = ['1 対象と操作', '2 内容を確認', '3 実行結果'];
  const headings = ['対象と操作を選ぶ', 'この内容で実行します', '実行結果を確認'];
  const tabs = labels.map((label, index) => {
    const tab = makeButton(label, 'ghost');
    tab.id = `${panel.root.id}-workflow-tab-${index}`;
    tab.setAttribute('role', 'tab');
    const stage = stages[index];
    stage.id = `${panel.root.id}-workflow-stage-${index}`;
    stage.className = 'kus-wf-stage';
    stage.setAttribute('role', 'tabpanel');
    stage.setAttribute('aria-labelledby', tab.id);
    tab.setAttribute('aria-controls', stage.id);
    const heading = document.createElement('h2');
    heading.className = 'kus-wf-heading';
    heading.textContent = headings[index];
    stage.appendChild(heading);
    tab.addEventListener('click', () => show(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      show(next);
    });
    nav.appendChild(tab);
    canvas.appendChild(stage);
    return tab;
  });
  const intro = document.createElement('p');
  intro.className = 'kus-wf-intro';
  intro.textContent = '入力後に対象と条件を確認してから実行できます。';
  setup.appendChild(intro);
  const choices = document.createElement('div');
  choices.className = 'kus-wf-actions';
  choices.setAttribute('role', 'radiogroup');
  choices.setAttribute('aria-label', '行う操作');
  let selected = options.actions[0];
  const hiddenActions = document.createElement('div');
  hiddenActions.hidden = true;
  const primaryCount = Math.max(1, Math.floor(options.primaryActions ?? 3));
  const hasMore = options.actions.length > primaryCount;
  // 表面に出さない操作は「ほかの操作」のポップアップで選ぶ（同じ name のラジオなので選択状態は 1 つに保たれる）
  const moreDialog = hasMore ? makeDialog({ title: 'ほかの操作を選ぶ', id: `${panel.root.id}-more-actions` }) : null;
  const moreChoices = document.createElement('div');
  moreChoices.className = 'kus-wf-actions';
  moreChoices.setAttribute('role', 'radiogroup');
  moreChoices.setAttribute('aria-label', 'ほかの操作');
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'kus-wf-action kus-wf-action--more';
  moreBtn.setAttribute('aria-haspopup', 'dialog');
  moreBtn.setAttribute('aria-pressed', 'false');
  const moreTitle = document.createElement('strong');
  const moreCopy = document.createElement('small');
  const moreWrap = document.createElement('span');
  moreWrap.append(moreTitle, moreCopy);
  moreBtn.appendChild(moreWrap);
  function refreshMore() {
    if (!hasMore) return;
    const index = options.actions.indexOf(selected);
    const outside = index >= primaryCount;
    moreBtn.setAttribute('aria-pressed', String(outside));
    moreTitle.textContent = outside ? selected.label : `ほかの操作…（${options.actions.length - primaryCount} 件）`;
    moreCopy.textContent = outside ? `${selected.description} 変更するには押してください。` : options.actions.slice(primaryCount).map((action) => action.label).join(' / ');
  }
  moreBtn.addEventListener('click', () => moreDialog?.open());
  options.actions.forEach((action, index) => {
    const label = document.createElement('label');
    label.className = 'kus-wf-action';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${panel.root.id}-workflow-action`;
    radio.value = action.id;
    radio.checked = index === 0;
    radio.setAttribute('aria-label', action.label);
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = action.label;
    const description = document.createElement('small');
    description.textContent = action.description;
    copy.append(title, description);
    if (action.writes) {
      const badge = document.createElement('em');
      badge.textContent = '書き込みあり · 実行前に対象を確認';
      copy.appendChild(badge);
    }
    radio.addEventListener('change', () => {
      selected = action;
      reviewedSignature = '';
      action.onSelect?.();
      refresh();
    });
    label.append(radio, copy);
    if (hasMore && index >= primaryCount) {
      moreChoices.appendChild(label);
      // ポップアップで選んだら閉じて表面へ戻る
      radio.addEventListener('change', () => { refreshMore(); moreDialog?.close(); });
    } else {
      choices.appendChild(label);
      if (hasMore) radio.addEventListener('change', refreshMore);
    }
    hiddenActions.appendChild(action.button);
  });
  if (hasMore && moreDialog) {
    choices.appendChild(moreBtn);
    moreDialog.body.appendChild(moreChoices);
    panel.root.appendChild(moreDialog.dialog);
    refreshMore();
  }
  if (options.actions.length > 1) setup.appendChild(choices);
  setup.append(...options.setup);
  // 補助カードは表面に出さず、「詳細設定…」のポップアップにまとめる
  const advancedDialog = options.advanced?.length ? makeDialog({ title: options.advancedLabel || '詳細設定', id: `${panel.root.id}-advanced`, wide: true }) : null;
  if (advancedDialog && options.advanced) {
    advancedDialog.body.append(...options.advanced);
    panel.root.appendChild(advancedDialog.dialog);
    const row = document.createElement('div');
    row.className = 'kus-wf-advanced';
    const copy = document.createElement('div');
    copy.className = 'kus-wf-advanced__copy';
    copy.textContent = options.advancedCopy || 'ふだん使わない設定はポップアップにまとめています。';
    const btn = makeButton(`${options.advancedLabel || '詳細設定'}…`, 'sub');
    btn.classList.add('kus-wf-advanced__btn');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.addEventListener('click', () => advancedDialog.open());
    row.append(copy, btn);
    setup.appendChild(row);
  }
  // 補足説明（kind='help' の注記）はカードの「?」から読む
  attachCardHelp(setup);
  if (advancedDialog) attachCardHelp(advancedDialog.body);
  const summary = document.createElement('dl');
  summary.className = 'kus-wf-summary';
  const notice = document.createElement('div');
  notice.className = 'kus-wf-notice';
  review.append(summary, notice);
  const resultNote = document.createElement('div');
  resultNote.className = 'kus-wf-notice';
  resultNote.textContent = 'まだ実行していません。対象と操作を選んでください。';
  result.append(resultNote, ...(options.results || []), panel.result);
  options.results?.forEach(element => { element.hidden = true; });
  const footer = document.createElement('footer');
  footer.className = 'kus-wf-footer';
  const footerRow = document.createElement('div');
  footerRow.className = 'kus-wf-footer-row';
  const footerCopy = document.createElement('div');
  footerCopy.className = 'kus-wf-footer-copy';
  footerCopy.setAttribute('aria-live', 'polite');
  const buttons = document.createElement('div');
  buttons.className = 'kus-wf-footer-buttons';
  const back = makeButton('対象・条件を変更', 'sub');
  const next = makeButton('内容を確認する', 'primary');
  const execute = makeButton(selected.label, 'primary');
  buttons.append(back, next, execute);
  footerRow.append(footerCopy, buttons);
  footer.append(footerRow, panel.status);
  const hint = panel.body.querySelector('.kus-lp__hint');
  panel.body.replaceChildren(...(hint ? [hint] : []), nav, canvas, footer, hiddenActions);
  let active = 0;
  let busy = false;
  let pending: LiteWorkflowAction | null = null;
  let reviewedSignature = '';
  let lastContext = '';
  const signature = () => JSON.stringify([selected.id, selected.summary(), Array.from(panel.root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.kus-wf-stage:first-of-type input,.kus-wf-stage:first-of-type select,.kus-wf-stage:first-of-type textarea,dialog input,dialog select,dialog textarea')).map(input => [input.value, input instanceof HTMLInputElement ? input.checked : null, input instanceof HTMLInputElement && input.files ? Array.from(input.files).map(file => [file.name, file.size, file.lastModified]) : null])]);
  function show(index: number) {
    if (busy) return;
    const problem = index === 1 ? selected.validate() : '';
    if (problem) { panel.setStatus(problem, 'warn'); return; }
    active = index;
    if (index === 1) {
      summary.replaceChildren();
      for (const [label, value] of [['操作', selected.label], ...selected.summary()]) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        summary.appendChild(row);
      }
      reviewedSignature = signature();
    }
    stages.forEach((stage, i) => { stage.hidden = i !== active; tabs[i].setAttribute('aria-selected', String(i === active)); tabs[i].tabIndex = i === active ? 0 : -1; tabs[i].dataset.state = i === active ? 'current' : i < active ? 'done' : 'upcoming'; });
    canvas.scrollTop = 0;
    tabs[index].focus({ preventScroll: true });
    refresh();
  }
  function refresh() {
    const problem = busy ? '' : selected.validate();
    // 取得進捗や入力段階では、大きな対象表・JSONの確認用署名を作り直さない。
    const fresh = !busy && active === 1 && reviewedSignature === signature();
    next.hidden = active !== 0;
    execute.hidden = active !== 1;
    back.hidden = active === 0;
    next.disabled = busy || !!problem;
    execute.disabled = busy || !!problem || !fresh;
    execute.textContent = selected.label;
    execute.classList.toggle('kus-lp__btn--danger', !!selected.writes);
    tabs[1].disabled = busy || !!problem;
    footerCopy.textContent = busy ? '処理中です。完了すると結果を表示します。' : problem || (active === 0 ? `${selected.label} · 対象と条件を確認してください。` : active === 1 ? fresh ? '表示内容を確認し、実行してください。' : '条件が変わりました。対象・条件に戻って確認してください。' : '結果を確認してから、次の操作へ進めます。');
    notice.dataset.write = String(!!selected.writes);
    notice.textContent = selected.description + (selected.writes ? '\n書き込み先と内容を確認してください。続いて、変更内容の最終確認が表示されます。' : '\nアプリ設定やレコードの書き込みは行いません。');
    panel.setPrimaryAction(next); // 入力欄でのEnterは確認画面への移動に限定する。
  }
  back.addEventListener('click', () => show(0));
  next.addEventListener('click', () => show(1));
  function finish() {
    if (!pending) return;
    const status = panel.status.querySelector('.kus-lp__status-text')?.textContent || '';
    const tone = panel.status.dataset.tone || '';
    if ((tone === 'info' || tone === 'warn' || tone === 'neutral') && /キャンセルしました/.test(status)) {
      pending = null;
      refresh();
      return;
    }
    resultNote.textContent = `${lastContext}\n${status}`;
    resultNote.dataset.write = String(!!pending.writes);
    const showResults = !options.resultActions || options.resultActions.includes(pending.id);
    options.results?.forEach(element => { element.hidden = !showResults; });
    pending = null;
    reviewedSignature = '';
    show(2);
  }
  execute.addEventListener('click', () => {
    if (busy || pending || selected.validate() || reviewedSignature !== signature()) return;
    pending = selected;
    options.beforeRun?.(selected.id);
    panel.setResult('');
    options.results?.forEach(element => { element.hidden = true; });
    lastContext = `${selected.label}\n${selected.summary().map(([key, value]) => `${key}: ${value}`).join('\n')}`;
    selected.button.click();
    if (!busy) finish();
  });
  const originalBusy = panel.setBusy;
  const disabled = new Map<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement, boolean>();
  panel.setBusy = value => {
    busy = value;
    panel.root.setAttribute('aria-busy', String(value));
    canvas.inert = value;
    nav.inert = value;
    if (value) {
      // 折りたたみと中止は実行中でも使えるようにし、長い処理中に kintone 画面を確認したり処理を止めたりできるようにする。
      panel.root.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input,button,select,textarea').forEach(input => { if (input.classList.contains('kus-lp__toggle') || input.classList.contains('kus-lp__cancel')) return; disabled.set(input, input.disabled); input.disabled = true; });
    } else {
      disabled.forEach((wasDisabled, input) => { input.disabled = wasDisabled; });
      disabled.clear();
      finish();
      refresh();
    }
    originalBusy(value);
  };
  const originalStatus = panel.setStatus;
  // ポップアップを開いている間は背面のステータスが見えないため、ポップアップの下部にも同じ文言を出す
  const dialogStatuses = [advancedDialog, moreDialog].filter(Boolean).map((d) => {
    const el = document.createElement('div');
    el.className = 'kus-wf-dialog-status';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    d!.dialog.querySelector('.kus-lp__dialog-foot')?.insertAdjacentElement('afterbegin', el);
    return { dialog: d!.dialog, el };
  });
  panel.setStatus = (message, tone) => {
    originalStatus(message, tone);
    for (const { dialog, el } of dialogStatuses) {
      if (!dialog.open) { el.hidden = true; continue; }
      el.textContent = message || '';
      el.dataset.tone = tone || 'neutral';
      el.hidden = !message;
    }
    refresh();
  };
  let refreshQueued = false;
  const scheduleRefresh = () => {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => { refreshQueued = false; refresh(); });
  };
  for (const event of ['input', 'change', 'click']) {
    setup.addEventListener(event, scheduleRefresh);
    // 詳細設定・ほかの操作に加え、各ツールが panel.root に置いた独自のポップアップ内の変更も確認ボタンの可否に反映する
    panel.root.addEventListener(event, (e) => { if (e.target instanceof Element && e.target.closest('dialog')) scheduleRefresh(); });
  }
  selected.onSelect?.();
  show(0);
  return { refresh, show };
}

/** 差分比較の既存の縦配置を維持し、各段階へ直接移動できるようにする。 */
export function installWorkflowNavigation(panel: LitePanelHandle, steps: Array<{ label: string; element: HTMLElement; open?: () => void }>) {
  ensureStyles();
  const nav = document.createElement('nav');
  nav.className = 'kus-wf-nav kus-wf-jump';
  nav.setAttribute('aria-label', '作業ステップへ移動');
  steps.forEach((step, index) => {
    const button = makeButton(`${index + 1} ${step.label}`, 'ghost');
    button.addEventListener('click', () => {
      step.open?.();
      step.element.scrollIntoView({ block: 'start' });
      const heading = step.element.querySelector<HTMLElement>('h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    nav.appendChild(button);
  });
  steps[0].element.parentElement?.insertBefore(nav, steps[0].element);
}
