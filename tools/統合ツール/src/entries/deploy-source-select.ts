'use strict';

/**
 * 「反映元アプリから本番へ」の段階 2「差分を選ぶ」。
 * 抽出結果の要約・反映先の未公開の変更・項目ごとのカード（変更をグループごとに並べ、行・グループ・項目単位で選ぶ）を描画する。
 * 件数が多い項目は畳み、開いたときに描画する。グループは一度に一定数だけ描画し、続きを「さらに表示」で出す。
 */

import {
  clipText,
  countExtraction,
  describePath,
  describeExtractionSummary,
  describeRequires,
  filterChanges,
  groupChanges,
  groupCheckState,
  isFilterActive,
  type ChangeFilter,
  type ChangeGroup,
  type KindFilter,
  type SelectionBlockerResult
} from '../deploy/sourceDisplay.js';
import { hasJsonOverride, isChangeSelected, selectedCount, type SelectionResult, type SourceSession } from '../deploy/sourceSession.js';
import type { SelectableChange } from '../reflect/selectionTypes.js';
import type { ReflectTargetPending } from '../reflect/targetPending.js';
import { makeButton, makeInput, makeSelect } from './litePanelTheme.js';
import { el, firstLines, setButtonText } from './deployProgressView.js';

/** この件数以下の項目は、最初から開いて描画する。 */
export const SELECT_OPEN_LIMIT = 30;
/** 一度に描画するグループ数。 */
export const SELECT_GROUP_PAGE = 40;

export interface SelectViewHost {
  session(): SourceSession | null;
  /** 反映する項目（段階 1 のチップ。抽出時の項目の部分集合） */
  activeScopes(): string[];
  /** 変更を選ぶ／外す。連動（requires）の結果を返す。呼び出し側が作り直しと再描画を行う */
  changeSelection(ids: readonly string[], on: boolean): SelectionResult;
  /** 取得失敗の項目を、反映する項目から外す */
  dropScope(sectionKey: string): void;
  blockers(): SelectionBlockerResult;
  notify(message: string): void;
  /** 抽出結果が現在の入力と一致しているか */
  isFresh(): boolean;
}

export interface SelectView {
  root: HTMLElement;
  /** 全体を作り直す（抽出し直し・項目の増減・絞り込みの変更） */
  render(): void;
  /** 選択・作り直しの結果を、描画済みの部分へ反映する */
  refresh(): void;
}

/**
 * 反映先プレビューに以前からの未公開の変更があるかの表示。状態は色だけでなく見出しの文字でも示す。
 */
export function renderTargetPending(host: HTMLElement, pending: ReflectTargetPending | undefined, emphasis = true): HTMLElement | null {
  if (!pending) return null;
  const box = el('div');
  box.dataset.targetPending = pending.state;
  const text = el('span', '', pending.message);
  if (pending.state === 'pending') {
    box.className = 'kus-ds-note kus-ds-note--warn';
    box.append(el('strong', '', '反映先に以前からの未公開の変更があります'), text);
  } else {
    box.className = `kus-ds-note kus-ds-note--${pending.state === 'unknown' ? 'info' : 'ok'}${emphasis ? '' : ' kus-ds-note--quiet'}`;
    const title = pending.state === 'clean' ? '✓ 未公開の変更なし' : pending.state === 'own' ? '✓ 未公開の変更はこのツールの反映分だけ' : 'ⓘ 未公開の変更は未確認';
    box.append(el('strong', '', title), text);
  }
  host.appendChild(box);
  return box;
}

interface RowView { change: SelectableChange; input: HTMLInputElement }
interface GroupView { group: ChangeGroup; input: HTMLInputElement; count: HTMLElement }
interface CardView {
  sectionKey: string;
  card: HTMLElement;
  count: HTMLElement;
  jsonBadge: HTMLElement;
  problems: HTMLElement;
  body: HTMLElement;
  toggle: HTMLButtonElement;
  allBtn: HTMLButtonElement;
  noneBtn: HTMLButtonElement;
  more: HTMLButtonElement;
  opened: boolean;
  groups: ChangeGroup[];
  shown: number;
  rows: Map<string, RowView>;
  groupViews: Map<string, GroupView>;
  filtered: SelectableChange[];
}

const KIND_CLASS: Record<string, string> = { 追加: 'add', 変更: 'change', 削除: 'delete' };

export function createSelectView(host: SelectViewHost): SelectView {
  const root = el('div', 'kus-ds-select');
  const summaryHost = el('div', 'kus-ds-summary');
  const filterBar = el('div', 'kus-ds-filter');
  const keywordInput = makeInput({ placeholder: '場所・値で絞り込み（例: 顧客名）', width: 'wide', noSubmit: true });
  keywordInput.setAttribute('aria-label', '変更をキーワードで絞り込み');
  keywordInput.dataset.selectFilter = 'keyword';
  const kindSelect = makeSelect([['all', 'すべての種類'], ['追加', '追加'], ['変更', '変更'], ['削除', '削除']], 'all');
  kindSelect.setAttribute('aria-label', '変更を種類で絞り込み');
  kindSelect.dataset.selectFilter = 'kind';
  const filterCount = el('span', 'kus-ds-filter__count');
  filterCount.setAttribute('aria-live', 'polite');
  filterBar.append(keywordInput, kindSelect, filterCount);
  const cardsHost = el('div', 'kus-ds-cards');
  const blockersHost = el('div', 'kus-ds-blockers');
  blockersHost.dataset.selectBlockers = 'true';
  root.append(summaryHost, filterBar, cardsHost, blockersHost);

  const cards = new Map<string, CardView>();
  const filter = (): ChangeFilter => ({ keyword: keywordInput.value, kind: kindSelect.value as KindFilter });

  // -------------------------------------------------------------------------
  // 行・グループ
  // -------------------------------------------------------------------------
  function describeSelectionResult(session: SourceSession, result: SelectionResult, on: boolean) {
    const names = (ids: string[]) => {
      const labels = ids.slice(0, 2).map((id) => { const change = session.index.byId.get(id); return change ? `「${describePath(change)}」` : ''; }).filter(Boolean);
      return `${labels.join('、')}${ids.length > 2 ? ` ほか ${ids.length - 2} 件` : ''}`;
    };
    if (on && result.required.length) host.notify(`${names(result.required)}は、選んだ変更に必要なため一緒に選びました。`);
    else if (!on && result.cascaded.length) host.notify(`${names(result.cascaded)}は、外した変更を必要とするため一緒に外しました。`);
  }

  function select(ids: readonly string[], on: boolean) {
    const session = host.session();
    if (!session) return;
    describeSelectionResult(session, host.changeSelection(ids, on), on);
  }

  function buildRow(view: CardView, change: SelectableChange, session: SourceSession): HTMLElement {
    const row = el('div', 'kus-ds-row');
    row.dataset.changeId = change.id;
    row.dataset.changeKind = change.kind;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isChangeSelected(session, change);
    input.setAttribute('aria-label', `${describePath(change)}（${change.kind}）を反映する`);
    input.addEventListener('change', () => select([change.id], input.checked));
    const check = el('label', 'kus-ds-row__check');
    check.appendChild(input);
    const main = el('div', 'kus-ds-row__main');
    const path = el('div', 'kus-ds-row__path');
    path.append(el('span', `kus-rl-kind kus-rl-kind--${KIND_CLASS[change.kind] || 'change'}`, change.kind), el('span', 'kus-ds-row__name', describePath(change)));
    const diff = el('div', 'kus-ds-row__diff');
    if (change.whole) {
      const text = change.kind === '削除' ? change.beforeText : change.afterText;
      diff.append(el('span', 'kus-ds-row__whole', change.kind === '削除' ? 'この要素を削除します' : 'この要素を追加します'));
      if (text) diff.append(el('span', 'kus-ds-value', clipText(text)));
      diff.title = clipText(text, 2000);
    } else {
      const before = el('span', 'kus-ds-value kus-ds-value--before', clipText(change.beforeText || '（なし）'));
      const after = el('span', 'kus-ds-value kus-ds-value--after', clipText(change.afterText || '（なし）'));
      before.title = clipText(change.beforeText, 2000);
      after.title = clipText(change.afterText, 2000);
      const arrow = el('span', 'kus-ds-arrow', '→');
      arrow.setAttribute('aria-label', '変更後');
      diff.append(before, arrow, after);
    }
    main.append(path, diff);
    const requires = describeRequires(change, session.index);
    if (requires) main.appendChild(el('div', 'kus-ds-row__req', requires));
    row.append(check, main);
    view.rows.set(change.id, { change, input });
    return row;
  }

  function buildGroup(view: CardView, group: ChangeGroup, session: SourceSession): HTMLElement {
    const node = el('div', 'kus-ds-group');
    node.dataset.groupId = group.groupId;
    const head = el('label', 'kus-ds-group__head');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('aria-label', `${group.groupLabel}の変更をまとめて選ぶ`);
    input.dataset.groupCheck = group.groupId;
    input.addEventListener('change', () => select(group.changes.map((change) => change.id), input.checked));
    const count = el('small', 'kus-ds-group__count');
    head.append(input, el('strong', '', group.groupLabel), count);
    node.appendChild(head);
    view.groupViews.set(group.groupId, { group, input, count });
    for (const change of group.changes) node.appendChild(buildRow(view, change, session));
    return node;
  }

  function paintGroup(view: GroupView, session: SourceSession) {
    const state = groupCheckState(view.group.changes, session.selected[view.group.changes[0].sectionKey] || new Set());
    view.input.checked = state === 'all';
    view.input.indeterminate = state === 'some';
    view.input.dataset.checkState = state;
    const chosen = view.group.changes.filter((change) => isChangeSelected(session, change)).length;
    view.count.textContent = `${chosen}/${view.group.changes.length}`;
  }

  function appendGroups(view: CardView, session: SourceSession) {
    const next = view.groups.slice(view.shown, view.shown + SELECT_GROUP_PAGE);
    const frag = document.createDocumentFragment();
    for (const group of next) frag.appendChild(buildGroup(view, group, session));
    view.body.insertBefore(frag, view.more);
    view.shown += next.length;
    for (const group of next) { const groupView = view.groupViews.get(group.groupId); if (groupView) paintGroup(groupView, session); }
    const rest = view.groups.length - view.shown;
    view.more.hidden = rest <= 0;
    if (rest > 0) setButtonText(view.more, `さらに表示（残り ${rest} グループ）`);
  }

  function renderBody(view: CardView, session: SourceSession) {
    const model = session.models[view.sectionKey];
    view.filtered = filterChanges(model.changes, filter());
    view.groups = groupChanges(view.filtered);
    view.shown = 0;
    view.rows.clear();
    view.groupViews.clear();
    view.body.replaceChildren(view.more);
    if (!view.filtered.length) view.body.insertBefore(el('div', 'kus-ds-empty', 'この条件に合う変更はありません。'), view.more);
    appendGroups(view, session);
  }

  function setOpen(view: CardView, open: boolean, session: SourceSession) {
    view.opened = open;
    view.body.hidden = !open;
    view.toggle.setAttribute('aria-expanded', String(open));
    const model = session.models[view.sectionKey];
    setButtonText(view.toggle, open ? '変更を閉じる' : `変更を表示（${model.changes.length} 件）`);
    if (open) renderBody(view, session);
    else { view.body.replaceChildren(view.more); view.rows.clear(); view.groupViews.clear(); }
  }

  // -------------------------------------------------------------------------
  // カード
  // -------------------------------------------------------------------------
  function statusCard(session: SourceSession, key: string, tone: 'same' | 'error', message: string): HTMLElement {
    const entry = session.preview.entries.find((candidate) => candidate.sectionKey === key)!;
    const card = el('section', `kus-ds-card kus-ds-card--${tone}`);
    card.dataset.selectSection = key;
    card.dataset.selectState = tone;
    const head = el('div', 'kus-ds-card__head');
    head.append(el('strong', 'kus-ds-card__title', entry.label), el('span', `kus-dp-pill kus-dp-pill--${tone === 'same' ? 'same' : 'error'}`, tone === 'same' ? '差分なし' : '取得失敗'));
    card.appendChild(head);
    card.appendChild(el('div', tone === 'error' ? 'kus-ds-card__problem' : 'kus-ds-card__note', message));
    if (tone === 'error') {
      const drop = makeButton('この項目を反映しない', 'sub');
      drop.dataset.action = 'drop-scope';
      drop.setAttribute('aria-label', `${entry.label}を反映しない項目から外す`);
      drop.addEventListener('click', () => host.dropScope(key));
      card.appendChild(drop);
    }
    return card;
  }

  function buildCard(session: SourceSession, key: string): HTMLElement {
    const entry = session.preview.entries.find((candidate) => candidate.sectionKey === key)!;
    if (session.modelErrors[key]) return statusCard(session, key, 'error', `差分の選択を準備できませんでした。${firstLines(session.modelErrors[key], 2)}`);
    const model = session.models[key];
    if (entry.status === 'same') return statusCard(session, key, 'same', '反映先は反映元と同じ設定です。反映する変更はありません。');
    if (entry.status !== 'change' || !model) {
      const reason = [...(entry.blockers || []), entry.message].filter(Boolean)[0] || '設定を取得できませんでした。';
      return statusCard(session, key, 'error', firstLines(reason, 4));
    }
    const card = el('section', 'kus-ds-card');
    card.dataset.selectSection = key;
    card.dataset.selectState = 'change';
    const head = el('div', 'kus-ds-card__head');
    const count = el('span', 'kus-ds-card__count');
    count.dataset.selectCount = key;
    const allBtn = makeButton('すべて選ぶ', 'ghost');
    const noneBtn = makeButton('すべて外す', 'ghost');
    allBtn.dataset.action = 'select-all';
    noneBtn.dataset.action = 'select-none';
    allBtn.setAttribute('aria-label', `${model.label}の変更をすべて選ぶ`);
    noneBtn.setAttribute('aria-label', `${model.label}の変更をすべて外す`);
    const tools = el('div', 'kus-ds-card__tools');
    tools.append(allBtn, noneBtn);
    head.append(el('strong', 'kus-ds-card__title', model.label), count, tools);
    card.appendChild(head);
    if (model.note) card.appendChild(el('div', 'kus-ds-card__note', model.note));
    const jsonBadge = el('div', 'kus-ds-note kus-ds-note--info', 'JSONで修正中です。この項目は、選択・入力欄より JSON の内容を優先します。');
    jsonBadge.dataset.jsonActive = key;
    card.appendChild(jsonBadge);
    const problems = el('ul', 'kus-ds-card__problems');
    problems.dataset.cardProblems = key;
    card.appendChild(problems);
    const toggle = makeButton('', 'sub');
    toggle.dataset.action = 'toggle';
    toggle.setAttribute('aria-label', `${model.label}の変更を表示`);
    const more = makeButton('さらに表示', 'sub');
    more.classList.add('kus-dp-more');
    more.dataset.action = 'more';
    more.hidden = true;
    const body = el('div', 'kus-ds-card__body');
    body.dataset.selectBody = key;
    body.hidden = true;
    const view: CardView = { sectionKey: key, card, count, jsonBadge, problems, body, toggle, allBtn, noneBtn, more, opened: false, groups: [], shown: 0, rows: new Map(), groupViews: new Map(), filtered: model.changes };
    cards.set(key, view);
    toggle.addEventListener('click', () => { const current = host.session(); if (current) setOpen(view, !view.opened, current); });
    more.addEventListener('click', () => { const current = host.session(); if (current) appendGroups(view, current); });
    const visibleIds = () => filterChanges(model.changes, filter()).map((change) => change.id);
    allBtn.addEventListener('click', () => select(visibleIds(), true));
    noneBtn.addEventListener('click', () => select(visibleIds(), false));
    card.append(toggle, body);
    body.appendChild(more);
    setOpen(view, model.changes.length <= SELECT_OPEN_LIMIT, session);
    return card;
  }

  // -------------------------------------------------------------------------
  // 全体
  // -------------------------------------------------------------------------
  function renderSummary(session: SourceSession) {
    summaryHost.replaceChildren();
    const counts = countExtraction(session.preview.entries, host.activeScopes());
    const pills = el('div', 'kus-dp-pills');
    pills.append(
      el('span', 'kus-dp-pill kus-dp-pill--change', `差分のある項目 ${counts.change}`),
      el('span', 'kus-dp-pill kus-dp-pill--same', `差分なし ${counts.same}`),
      el('span', 'kus-dp-pill kus-dp-pill--error', `取得失敗 ${counts.error}`)
    );
    const info = el('div', 'kus-ds-note kus-ds-note--info', describeExtractionSummary(counts));
    info.dataset.extractSummary = 'true';
    summaryHost.append(pills, info);
    renderTargetPending(summaryHost, session.preview.targetPending);
  }

  function paintBlockers(session: SourceSession) {
    const result = host.blockers();
    blockersHost.replaceChildren();
    const lines = [
      ...result.failed.map((item) => `${item.label}: 取得失敗（${item.message}）。この項目を反映しない項目から外すか、差分を抽出し直してください。`),
      ...result.problems
    ];
    if (session.composeError) lines.push(`選んだ内容から反映内容を作れません（${firstLines(session.composeError, 1)}）。`);
    if (result.empty && !lines.length) lines.push('反映する差分を選んでください。');
    blockersHost.hidden = !lines.length;
    if (!lines.length) return;
    const box = el('div', 'kus-ds-note kus-ds-note--warn');
    box.append(el('strong', '', '次へ進む前に解消が必要です'));
    const list = el('ul', 'kus-ds-card__problems');
    for (const line of lines.slice(0, 20)) list.appendChild(el('li', '', line));
    if (lines.length > 20) list.appendChild(el('li', '', `ほか ${lines.length - 20} 件`));
    box.appendChild(list);
    blockersHost.appendChild(box);
  }

  function renderCards(session: SourceSession) {
    cards.clear();
    cardsHost.replaceChildren();
    const active = new Set(host.activeScopes());
    for (const entry of session.preview.entries) if (active.has(entry.sectionKey)) cardsHost.appendChild(buildCard(session, entry.sectionKey));
    if (!cardsHost.children.length) cardsHost.appendChild(el('div', 'kus-ds-empty', '反映する項目がありません。「対象を選ぶ」で項目を選んでください。'));
    paintFilterCount(session);
  }

  function paintFilterCount(session: SourceSession) {
    const active = isFilterActive(filter());
    filterCount.textContent = active
      ? `表示中 ${[...cards.values()].reduce((sum, view) => sum + filterChanges(session.models[view.sectionKey].changes, filter()).length, 0)} 件`
      : '';
    for (const view of cards.values()) {
      view.allBtn.textContent = active ? '表示中をすべて選ぶ' : 'すべて選ぶ';
      view.noneBtn.textContent = active ? '表示中をすべて外す' : 'すべて外す';
    }
  }

  function render() {
    const session = host.session();
    if (!session || !host.isFresh()) {
      summaryHost.replaceChildren(el('div', 'kus-ds-empty', '「対象を選ぶ」で差分を抽出してください。'));
      cardsHost.replaceChildren();
      blockersHost.replaceChildren();
      blockersHost.hidden = true;
      filterBar.hidden = true;
      cards.clear();
      return;
    }
    filterBar.hidden = false;
    renderSummary(session);
    renderCards(session);
    paintBlockers(session);
    refresh();
  }

  function refresh() {
    const session = host.session();
    if (!session || !host.isFresh()) return;
    for (const view of cards.values()) {
      const model = session.models[view.sectionKey];
      const chosen = selectedCount(session, view.sectionKey);
      view.count.textContent = `選んだ変更 ${chosen}/${model.changes.length}`;
      view.count.dataset.chosen = String(chosen);
      view.jsonBadge.hidden = !hasJsonOverride(session, view.sectionKey);
      const composed = session.composed?.sections.find((section) => section.sectionKey === view.sectionKey);
      const lines = [...new Set([...(composed?.errors || []), ...(composed?.plan.blockers || []), ...(session.composed?.blockers || []).filter((line) => line.startsWith(`${model.label}:`)).map((line) => line.slice(model.label.length + 1).trim())])];
      view.problems.replaceChildren(...lines.slice(0, 10).map((line) => el('li', '', line)));
      view.problems.hidden = !lines.length;
      for (const row of view.rows.values()) row.input.checked = isChangeSelected(session, row.change);
      for (const group of view.groupViews.values()) paintGroup(group, session);
    }
    paintBlockers(session);
  }

  let keywordTimer = 0;
  keywordInput.addEventListener('input', () => {
    window.clearTimeout(keywordTimer);
    keywordTimer = window.setTimeout(() => rebuildBodies(), 150);
  });
  kindSelect.addEventListener('change', () => rebuildBodies());
  function rebuildBodies() {
    const session = host.session();
    if (!session || !host.isFresh()) return;
    for (const view of cards.values()) if (view.opened) renderBody(view, session);
    paintFilterCount(session);
  }

  return { root, render, refresh };
}
