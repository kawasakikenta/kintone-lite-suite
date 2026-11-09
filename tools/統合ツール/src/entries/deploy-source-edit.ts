'use strict';

/**
 * 「反映元アプリから本番へ」の段階 3「内容を修正する」。
 * 選んだ変更の editables を入力欄（text / boolean / select）で並べ、既定の値との違いを強調して「元に戻す」を付ける。
 * 項目ごとに「JSONで編集」（jsonEditable のとき）で送る設定の JSON を直接直せる。修正のたびに作り直した計画の変更の要約と問題を示す。
 */

import { clipText } from '../deploy/sourceDisplay.js';
import { hasJsonOverride, hasOverride, type SourceSession } from '../deploy/sourceSession.js';
import { getAt, parsePointer } from '../reflect/selectionPointer.js';
import type { SectionSelectionModel, SelectableChange, SelectableEditable } from '../reflect/selectionTypes.js';
import { el, firstLines, setButtonText } from './deployProgressView.js';
import { makeButton, makeInput, makeSelect, makeTextarea } from './litePanelTheme.js';
import { appendReflectItems } from './reflectPlanView.js';

/** この件数以下の項目は、最初から開いて描画する。 */
export const EDIT_OPEN_LIMIT = 30;
/** 一度に描画するグループ数。 */
export const EDIT_GROUP_PAGE = 40;

export interface EditViewHost {
  session(): SourceSession | null;
  activeScopes(): string[];
  isFresh(): boolean;
  /** 入力欄の値を保存して作り直す。debounce が true のときは、入力中の連続入力をまとめる */
  setOverride(sectionKey: string, pointer: string, value: unknown, defaultValue: unknown, debounce: boolean): void;
  /** 項目の入力欄の修正をすべて元に戻す */
  resetSection(sectionKey: string): void;
  /** JSON での修正を設定する（undefined で取り消し） */
  applyJson(sectionKey: string, json: unknown): void;
  notify(message: string): void;
  /** JSON の入力欄の状態（編集中・適用・取り消し）が変わった。適用していない変更があるかを呼び出し側が確かめ直す */
  jsonEditsChanged(): void;
}

export interface EditView {
  root: HTMLElement;
  /** 選んだ変更から作り直す（段階に入ったとき・項目の増減） */
  render(): void;
  /** 作り直した計画・問題・修正の強調を反映する */
  refresh(): void;
  /** JSON の入力欄を開いたまま、適用していない変更がある項目の名前。あれば最終確認へ進めない（直した内容が送られないため） */
  unappliedJson(): string[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function editableText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** 「既定: …」に示す値。真偽値は「はい / いいえ」、選択肢の入力欄は選択肢の表示名で示す（true / false などの内部の値は出さない）。 */
export function editableDefaultText(editable: Pick<SelectableEditable, 'value' | 'editor'>): string {
  const { value } = editable;
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  const raw = editableText(value);
  const option = editable.editor.type === 'select' ? (editable.editor.options || []).find(([optionValue]) => optionValue === raw) : undefined;
  return (option ? option[1] : raw) || '（空）';
}

/** JSON で直した項目の入力欄に表示する値（JSON の同じ場所の値）。JSON にその場所が無ければ undefined（空の表示）。 */
export function jsonValueAt(json: unknown, pointer: string): unknown {
  try { return getAt(json, parsePointer(pointer)); } catch { return undefined; }
}

/** 入力欄の文字列を、既定の値と同じ型に戻す（数値・真偽値の既定は型を保つ）。 */
export function coerceEditable(text: string, like: unknown): unknown {
  if (typeof like === 'number') { const n = Number(text); return text.trim() !== '' && Number.isFinite(n) ? n : text; }
  if (typeof like === 'boolean') return text === 'true';
  return text;
}

interface EditRowView { section: string; change: SelectableChange; editable: SelectableEditable; row: HTMLElement; reset: HTMLButtonElement; controls: Array<HTMLInputElement | HTMLSelectElement>; setControl(value: unknown): void; /** 直前に描いたとき、JSON 優先で入力欄を無効にしていたか */ locked: boolean }

interface EditCardView {
  sectionKey: string;
  card: HTMLElement;
  counts: HTMLElement;
  jsonNote: HTMLElement;
  errors: HTMLElement;
  warnings: HTMLElement;
  planHost: HTMLElement;
  resetAll: HTMLButtonElement;
  jsonArea: HTMLElement;
  jsonText: HTMLTextAreaElement;
  jsonError: HTMLElement;
  jsonToggle: HTMLButtonElement | null;
  /** JSON の入力欄を開いた時点・適用した時点の内容（これと違えば、適用していない変更） */
  jsonBaseline: string;
  body: HTMLElement;
  toggle: HTMLButtonElement;
  more: HTMLButtonElement;
  opened: boolean;
  groups: Array<{ label: string; items: Array<{ change: SelectableChange; editable: SelectableEditable }> }>;
  shown: number;
  rows: Map<string, EditRowView>;
}

function collectEditables(session: SourceSession, model: SectionSelectionModel) {
  const groups = new Map<string, { label: string; items: Array<{ change: SelectableChange; editable: SelectableEditable }> }>();
  for (const change of model.changes) {
    if (!session.selected[model.sectionKey]?.has(change.id) || !change.editables.length) continue;
    let group = groups.get(change.groupId);
    if (!group) { group = { label: change.groupLabel, items: [] }; groups.set(change.groupId, group); }
    for (const editable of change.editables) group.items.push({ change, editable });
  }
  return [...groups.values()];
}

export function createEditView(host: EditViewHost): EditView {
  const root = el('div', 'kus-ds-edit-root');
  const cardsHost = el('div', 'kus-ds-cards');
  const blockers = el('div', 'kus-ds-blockers');
  blockers.dataset.editBlockers = 'true';
  root.append(cardsHost, blockers);
  const cards = new Map<string, EditCardView>();
  let idSeq = 0;

  function currentValue(session: SourceSession, sectionKey: string, editable: SelectableEditable): unknown {
    return hasOverride(session, sectionKey, editable.pointer) ? session.states[sectionKey].overrides[editable.pointer] : editable.value;
  }

  /** 入力欄に表示する値。JSON で直している間は JSON の値（入力欄は無効で、選択・入力欄より JSON を優先して送る）。 */
  function displayValue(session: SourceSession, sectionKey: string, editable: SelectableEditable): unknown {
    return hasJsonOverride(session, sectionKey) ? jsonValueAt(session.states[sectionKey].json, editable.pointer) : currentValue(session, sectionKey, editable);
  }

  function buildControl(session: SourceSession, view: EditCardView, sectionKey: string, change: SelectableChange, editable: SelectableEditable) {
    const id = `kus-ds-edit-${++idSeq}`;
    const row = el('div', 'kus-ds-edit');
    row.dataset.editPointer = editable.pointer;
    const label = el('label', 'kus-ds-edit__label', `${change.groupLabel} / ${editable.label}`);
    label.htmlFor = id;
    const control = el('div', 'kus-ds-edit__control');
    const controls: Array<HTMLInputElement | HTMLSelectElement> = [];
    let setControl: (value: unknown) => void;
    const push = (value: unknown, debounce: boolean) => host.setOverride(sectionKey, editable.pointer, value, editable.value, debounce);
    if (editable.editor.type === 'boolean') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      const text = el('span', 'kus-ds-edit__bool');
      input.addEventListener('change', () => { text.textContent = input.checked ? 'はい' : 'いいえ'; push(input.checked, false); paint(); });
      setControl = (value) => { input.checked = value === true || value === 'true'; text.textContent = input.checked ? 'はい' : 'いいえ'; };
      control.append(input, text);
      controls.push(input);
    } else if (editable.editor.type === 'select') {
      const options = [...(editable.editor.options || [])];
      const select = makeSelect(options.map(([value, text]) => [value, text] as [string, string]));
      select.id = id;
      select.classList.add('kus-ds-edit__select');
      select.addEventListener('change', () => { push(coerceEditable(select.value, editable.value), false); paint(); });
      setControl = (value) => {
        const text = editableText(value);
        if (![...select.options].some((option) => option.value === text)) {
          const option = document.createElement('option');
          option.value = text;
          option.textContent = text || '（空）';
          select.appendChild(option);
        }
        select.value = text;
      };
      control.appendChild(select);
      controls.push(select);
    } else {
      const input = makeInput({ width: 'wide', noSubmit: true });
      input.id = id;
      input.classList.add('kus-ds-edit__input');
      input.addEventListener('input', () => { push(coerceEditable(input.value, editable.value), true); paint(); });
      input.addEventListener('change', () => { push(coerceEditable(input.value, editable.value), false); paint(); });
      setControl = (value) => { input.value = editableText(value); };
      control.appendChild(input);
      controls.push(input);
    }
    const reset = makeButton('元に戻す', 'ghost');
    reset.dataset.action = 'edit-reset';
    reset.setAttribute('aria-label', `${change.groupLabel} / ${editable.label}を既定の値に戻す`);
    reset.addEventListener('click', () => { setControl(editable.value); push(editable.value, false); paint(); });
    const meta = el('div', 'kus-ds-edit__meta');
    const defaultText = editableDefaultText(editable);
    const fallback = el('span', 'kus-ds-edit__default', `既定: ${defaultText}`);
    fallback.title = clipText(defaultText, 2000);
    meta.append(fallback, reset);
    row.append(label, control, meta);
    const rowView: EditRowView = { section: sectionKey, change, editable, row, reset, controls, setControl, locked: false };
    setControl(displayValue(session, sectionKey, editable));
    const paint = () => paintRow(rowView);
    view.rows.set(`${change.id}|${editable.pointer}`, rowView);
    paintRow(rowView);
    return row;
  }

  function paintRow(row: EditRowView) {
    const session = host.session();
    if (!session) return;
    const locked = hasJsonOverride(session, row.section);
    // JSON で直している間は入力欄に JSON の値を出す。JSON の修正を取り消したら、入力欄の修正（なければ既定）へ戻す。
    if (locked || row.locked) row.setControl(displayValue(session, row.section, row.editable));
    row.locked = locked;
    const changed = !same(displayValue(session, row.section, row.editable), row.editable.value);
    row.row.classList.toggle('kus-ds-edit--changed', changed);
    row.row.dataset.changed = String(changed);
    row.row.dataset.jsonLocked = String(locked);
    row.reset.hidden = !changed || locked;
    for (const control of row.controls) control.disabled = locked;
    row.reset.disabled = locked;
  }

  function appendGroups(view: EditCardView, session: SourceSession) {
    const next = view.groups.slice(view.shown, view.shown + EDIT_GROUP_PAGE);
    const frag = document.createDocumentFragment();
    for (const group of next) {
      const node = el('div', 'kus-ds-edit-group');
      node.appendChild(el('div', 'kus-ds-edit-group__title', group.label));
      for (const { change, editable } of group.items) node.appendChild(buildControl(session, view, view.sectionKey, change, editable));
      frag.appendChild(node);
    }
    view.body.insertBefore(frag, view.more);
    view.shown += next.length;
    const rest = view.groups.length - view.shown;
    view.more.hidden = rest <= 0;
    if (rest > 0) setButtonText(view.more, `さらに表示（残り ${rest} グループ）`);
  }

  function setOpen(view: EditCardView, open: boolean, session: SourceSession) {
    view.opened = open;
    view.body.hidden = !open;
    view.toggle.setAttribute('aria-expanded', String(open));
    const total = view.groups.reduce((sum, group) => sum + group.items.length, 0);
    setButtonText(view.toggle, open ? '入力欄を閉じる' : `入力欄を表示（${total} 件）`);
    view.body.replaceChildren(view.more);
    view.rows.clear();
    view.shown = 0;
    if (open) appendGroups(view, session);
  }

  function buildCard(session: SourceSession, sectionKey: string): HTMLElement | null {
    const model = session.models[sectionKey];
    if (!model) return null;
    const card = el('section', 'kus-ds-card');
    card.dataset.editSection = sectionKey;
    const head = el('div', 'kus-ds-card__head');
    const counts = el('span', 'kus-ds-card__count');
    counts.dataset.editCount = sectionKey;
    const tools = el('div', 'kus-ds-card__tools');
    const resetAll = makeButton('この項目の修正を元に戻す', 'ghost');
    resetAll.dataset.action = 'edit-reset-all';
    resetAll.setAttribute('aria-label', `${model.label}の入力欄の修正をすべて元に戻す`);
    resetAll.addEventListener('click', () => { host.resetSection(sectionKey); render(); });
    tools.appendChild(resetAll);
    let jsonToggle: HTMLButtonElement | null = null;
    if (model.jsonEditable) {
      jsonToggle = makeButton('JSONで編集', 'sub');
      jsonToggle.dataset.action = 'json-toggle';
      jsonToggle.setAttribute('aria-label', `${model.label}の送る設定をJSONで編集`);
      jsonToggle.setAttribute('aria-expanded', 'false');
      tools.appendChild(jsonToggle);
    }
    head.append(el('strong', 'kus-ds-card__title', model.label), counts, tools);
    card.appendChild(head);

    const jsonNote = el('div', 'kus-ds-note kus-ds-note--info', 'JSONで修正中です。この項目は、選択・入力欄より JSON の内容を優先します。入力欄には JSON の値を表示していて、ここでは直せません。');
    jsonNote.dataset.jsonActive = sectionKey;
    card.appendChild(jsonNote);

    const groups = collectEditables(session, model);
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    const toggle = makeButton('', 'sub');
    toggle.dataset.action = 'toggle';
    toggle.setAttribute('aria-label', `${model.label}の入力欄を表示`);
    const more = makeButton('さらに表示', 'sub');
    more.classList.add('kus-dp-more');
    more.dataset.action = 'more';
    more.hidden = true;
    const body = el('div', 'kus-ds-card__body');
    body.dataset.editBody = sectionKey;
    body.appendChild(more);

    const jsonArea = el('div', 'kus-ds-json');
    jsonArea.dataset.jsonArea = sectionKey;
    jsonArea.hidden = true;
    const jsonText = makeTextarea({ rows: 14, code: true });
    jsonText.setAttribute('aria-label', `${model.label}の送る設定（JSON）`);
    jsonText.spellcheck = false;
    const jsonError = el('p', 'kus-ds-json__error');
    jsonError.setAttribute('role', 'alert');
    jsonError.hidden = true;
    const apply = makeButton('JSONを適用', 'primary');
    apply.dataset.action = 'json-apply';
    apply.setAttribute('aria-label', `${model.label}のJSONを適用`);
    const cancel = makeButton('JSONでの修正を取り消す', 'sub');
    cancel.dataset.action = 'json-cancel';
    cancel.setAttribute('aria-label', `${model.label}のJSONでの修正を取り消す`);
    const jsonActions = el('div', 'kus-ds-json__actions');
    jsonActions.append(apply, cancel);
    jsonArea.append(el('p', 'kus-ds-json__help', '反映先に送る設定（反映後の形）です。直した内容は、選択・入力欄より優先されます。'), jsonText, jsonError, jsonActions);

    const errors = el('ul', 'kus-ds-card__problems kus-ds-card__problems--error');
    errors.dataset.editErrors = sectionKey;
    const warnings = el('ul', 'kus-ds-card__problems kus-ds-card__problems--warn');
    const planHost = el('div', 'kus-ds-plan');
    planHost.dataset.editPlan = sectionKey;
    const view: EditCardView = { sectionKey, card, counts, jsonNote, errors, warnings, planHost, resetAll, jsonArea, jsonText, jsonError, jsonToggle, jsonBaseline: '', body, toggle, more, opened: false, groups, shown: 0, rows: new Map() };
    cards.set(sectionKey, view);

    if (total) card.append(toggle, body);
    else card.appendChild(el('div', 'kus-ds-card__note', '画面で直せる値はありません。必要なときは「JSONで編集」を使います。'));
    toggle.addEventListener('click', () => { const current = host.session(); if (current) setOpen(view, !view.opened, current); });
    more.addEventListener('click', () => { const current = host.session(); if (current) appendGroups(view, current); });
    card.append(jsonArea, errors, warnings, planHost);
    if (total) setOpen(view, total <= EDIT_OPEN_LIMIT, session);

    const openJson = (open: boolean) => {
      const current = host.session();
      if (!current) return;
      jsonArea.hidden = !open;
      jsonToggle?.setAttribute('aria-expanded', String(open));
      if (jsonToggle) setButtonText(jsonToggle, open ? 'JSONの編集を閉じる' : 'JSONで編集');
      if (open) {
        const composed = current.composed?.sections.find((section) => section.sectionKey === sectionKey);
        const base = current.states[sectionKey].json !== undefined ? current.states[sectionKey].json : composed?.after;
        jsonText.value = JSON.stringify(base ?? {}, null, 2);
        view.jsonBaseline = jsonText.value;
        jsonError.hidden = true;
      }
      host.jsonEditsChanged();
    };
    jsonText.addEventListener('input', () => host.jsonEditsChanged());
    jsonToggle?.addEventListener('click', () => openJson(jsonArea.hidden));
    apply.addEventListener('click', () => {
      let parsed: unknown;
      try { parsed = JSON.parse(jsonText.value); } catch (error: any) {
        jsonError.textContent = `JSONの形式が正しくありません（${firstLines(String(error?.message || error), 1)}）。直してから適用してください。`;
        jsonError.hidden = false;
        return;
      }
      if (parsed === null || typeof parsed !== 'object') {
        jsonError.textContent = 'JSONはオブジェクトまたは配列で入力してください。';
        jsonError.hidden = false;
        return;
      }
      jsonError.hidden = true;
      view.jsonBaseline = jsonText.value;
      host.applyJson(sectionKey, parsed);
      host.notify(`${model.label}をJSONの内容で修正しました。選択・入力欄より JSON を優先します。`);
    });
    cancel.addEventListener('click', () => {
      jsonError.hidden = true;
      host.applyJson(sectionKey, undefined);
      openJson(false);
      host.notify(`${model.label}のJSONでの修正を取り消しました。選択と入力欄の内容に戻しました。`);
    });
    return card;
  }

  function render() {
    const session = host.session();
    cardsHost.replaceChildren();
    blockers.replaceChildren();
    blockers.hidden = true;
    cards.clear();
    if (!session || !host.isFresh()) { cardsHost.appendChild(el('div', 'kus-ds-empty', '「対象を選ぶ」で差分を抽出し、反映する変更を選んでください。')); return; }
    if (!session.composed) {
      cardsHost.appendChild(el('div', 'kus-ds-note kus-ds-note--warn', `選んだ内容から反映内容を作れません（${firstLines(session.composeError || '原因を確認できません。', 1)}）。`));
      return;
    }
    const active = new Set(host.activeScopes());
    const sections = session.composed.sections.filter((section) => active.has(section.sectionKey) && section.selectedCount > 0);
    for (const section of sections) { const card = buildCard(session, section.sectionKey); if (card) cardsHost.appendChild(card); }
    if (!cardsHost.children.length) cardsHost.appendChild(el('div', 'kus-ds-empty', '反映する変更が選ばれていません。「差分を選ぶ」で選んでください。'));
    refresh();
  }

  function refresh() {
    const session = host.session();
    if (!session || !session.composed) return;
    for (const view of cards.values()) {
      const composed = session.composed.sections.find((section) => section.sectionKey === view.sectionKey);
      if (!composed) continue;
      view.counts.textContent = `選んだ変更 ${composed.selectedCount}/${composed.totalCount}・修正した値 ${composed.editedCount}`;
      const json = hasJsonOverride(session, view.sectionKey);
      view.jsonNote.hidden = !json;
      view.resetAll.disabled = json || !Object.keys(session.states[view.sectionKey].overrides).length;
      view.errors.replaceChildren(...[...new Set([...composed.errors, ...composed.plan.blockers])].slice(0, 10).map((line) => el('li', '', line)));
      view.errors.hidden = !view.errors.children.length;
      view.warnings.replaceChildren(...(composed.plan.warnings || []).slice(0, 5).map((line) => el('li', '', line)));
      view.warnings.hidden = !view.warnings.children.length;
      view.planHost.replaceChildren();
      view.planHost.appendChild(el('div', 'kus-ds-plan__title', '反映される内容'));
      if (composed.plan.items?.length) appendReflectItems(view.planHost, { label: composed.label, items: composed.plan.items, sectionKey: composed.sectionKey });
      else view.planHost.appendChild(el('div', 'kus-ds-card__note', `変更 ${composed.plan.changeCount} 件（要約を作成できませんでした）`));
      for (const row of view.rows.values()) paintRow(row);
    }
    // 問題は画面下にもまとめる（段階 3 の下部）
    const lines = [...new Set([...session.composed.sections.flatMap((section) => (host.activeScopes().includes(section.sectionKey) ? section.errors.map((error) => `${section.label}: ${error}`) : [])), ...session.composed.blockers])];
    blockers.replaceChildren();
    blockers.hidden = !lines.length;
    if (lines.length) {
      const box = el('div', 'kus-ds-note kus-ds-note--warn');
      box.append(el('strong', '', '次へ進む前に解消が必要です'));
      const list = el('ul', 'kus-ds-card__problems');
      for (const line of lines.slice(0, 20)) list.appendChild(el('li', '', line));
      box.appendChild(list);
      blockers.appendChild(box);
    }
  }

  function unappliedJson(): string[] {
    const session = host.session();
    if (!session) return [];
    return [...cards.values()].filter(view => !view.jsonArea.hidden && view.jsonText.value !== view.jsonBaseline).map(view => session.models[view.sectionKey]?.label || view.sectionKey);
  }

  return { root, render, refresh, unappliedJson };
}
