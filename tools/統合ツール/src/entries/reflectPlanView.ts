import { reflectSectionLabel } from '../reflect/sections.js';
import { buildReflectErrorHint } from '../reflect/applyOutcome.js';
import { describeApplySectionStatus, normalizeApplySections } from '../reflect/liteSetup.js';
import { REFLECT_ITEM_KIND_ORDER, applyProgressUpdate, countReflectItemKinds, describeApplyProgressStatus, formatUploadList, orderReflectItems, summarizeApplyProgress, type ApplyProgressRow, type ApplyProgressStatus } from '../reflect/applyProgress.js';
import type { ReflectItemSummary } from '../reflect/changeSummary.js';
import type { ReflectSectionPlan } from '../reflect/standalonePlan.js';
import type { ReflectIdentities } from '../tabs/reflect-standalone.js';

/** 整形のために解析する値の上限（巨大な文字列の解析で画面が止まるのを避ける）。 */
const PRETTY_JSON_PARSE_LIMIT = 200_000;

/**
 * 内訳の値が JSON（オブジェクト・配列）の文字列なら、2 スペースのインデントで整形して返す。
 * それ以外（通常の文字列・数値・「（なし）」・壊れた JSON）はそのまま返す。
 */
export function formatReflectChangeValue(value: string): string {
  const text = String(value ?? '');
  const head = text.trimStart()[0];
  if ((head !== '{' && head !== '[') || text.length > PRETTY_JSON_PARSE_LIMIT) return text;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : text;
  } catch {
    return text;
  }
}

export function extractChangedJsonKeys(beforeText: string, afterText: string): string[] {
  const bTrim = String(beforeText || '').trim();
  const aTrim = String(afterText || '').trim();
  if (!bTrim.startsWith('{') || !aTrim.startsWith('{')) return [];
  try {
    const bObj = JSON.parse(bTrim);
    const aObj = JSON.parse(aTrim);
    if (!bObj || typeof bObj !== 'object' || Array.isArray(bObj)) return [];
    if (!aObj || typeof aObj !== 'object' || Array.isArray(aObj)) return [];
    const keys = [...new Set([...Object.keys(bObj), ...Object.keys(aObj)])];
    return keys.filter((key) => JSON.stringify(bObj[key]) !== JSON.stringify(aObj[key]));
  } catch {
    return [];
  }
}

// =============================================================================
// 変更の要約（項目単位。利用者が読める形）
// =============================================================================

const ITEM_KIND_CLASS: Record<ReflectItemSummary['kind'], string> = { 削除: 'delete', 変更: 'change', 追加: 'add', 保持: 'keep' };
/** 最初に表示する件数と、「残りを表示」で追加する件数。 */
const ITEMS_INITIAL = 20;
const ITEMS_STEP = 50;

function buildReflectItem(item: ReflectItemSummary): HTMLLIElement {
  const row = document.createElement('li');
  row.className = `kus-rl-item kus-rl-item--${ITEM_KIND_CLASS[item.kind]}`;
  row.dataset.kind = item.kind;
  // 種類は色だけでなく文字でも示す。
  const badge = document.createElement('span');
  badge.className = `kus-rl-kind kus-rl-kind--${ITEM_KIND_CLASS[item.kind]}`;
  badge.textContent = item.kind;
  const name = document.createElement('span');
  name.className = 'kus-rl-item__name';
  name.textContent = item.name;
  row.append(badge, name);
  const details = (item.details || []).filter(Boolean);
  if (details.length) {
    const list = document.createElement('ul');
    list.className = 'kus-rl-item__details';
    for (const detail of details) { const li = document.createElement('li'); li.textContent = detail; list.appendChild(li); }
    row.appendChild(list);
  }
  return row;
}

/**
 * 「変更の要約」。削除・変更・追加・保持をバッジ付きで並べる（項目名と内容はすべて textContent で描画する）。
 * 多いときは先頭 20 件だけ表示し、「残り N 件を表示」で続きを出す。保持だけの項目は折りたたんで控えめに示す。
 */
export function appendReflectItems(host: HTMLElement, plan: Pick<ReflectSectionPlan, 'label' | 'items'> & Partial<Pick<ReflectSectionPlan, 'sectionKey'>>) {
  const items = orderReflectItems(plan.items);
  if (!items.length) return;
  const counts = countReflectItemKinds(items);
  const onlyKept = counts.保持 === items.length;
  const root = document.createElement(onlyKept ? 'details' : 'section');
  root.className = `kus-rl-items${onlyKept ? ' kus-rl-items--quiet' : ''}`;
  root.dataset.reflectItems = 'true';
  // 一覧を再描画しても、開いていた内訳や表示済みの件数を戻せるよう、項目の識別子を付ける。
  if (plan.sectionKey) {
    root.dataset.reflectSection = plan.sectionKey;
    if (onlyKept) root.dataset.reflectDetails = `${plan.sectionKey}:kept`;
  }
  const countText = REFLECT_ITEM_KIND_ORDER.filter((kind) => counts[kind]).map((kind) => `${kind} ${counts[kind]}`).join('・');
  const list = document.createElement('ul');
  list.className = 'kus-rl-items__list';
  let shown = 0;
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'kus-lp__btn kus-lp__btn--sub kus-rl-items__more';
  const showNext = (limit: number) => {
    for (const item of items.slice(shown, shown + limit)) list.appendChild(buildReflectItem(item));
    shown = Math.min(items.length, shown + limit);
    more.hidden = shown >= items.length;
    more.textContent = `残り ${items.length - shown} 件を表示`;
  };
  more.addEventListener('click', () => showNext(ITEMS_STEP));
  if (onlyKept) {
    const head = document.createElement('summary');
    head.textContent = `${plan.label}：反映先だけの設定を保持（${counts.保持} 件）`;
    root.appendChild(head);
    // 開かれるまで描画しない（保持が大量でも画面を重くしない）。
    root.addEventListener('toggle', () => { if ((root as HTMLDetailsElement).open && !shown) showNext(ITEMS_INITIAL); });
  } else {
    const head = document.createElement('div');
    head.className = 'kus-rl-items__title';
    const title = document.createElement('strong');
    title.textContent = '変更の要約';
    const total = document.createElement('span');
    total.textContent = countText;
    head.append(title, total);
    root.appendChild(head);
    showNext(ITEMS_INITIAL);
  }
  root.append(list, more);
  more.hidden = onlyKept || shown >= items.length;
  host.appendChild(root);
}

/** 反映時に反映先へアップロードするファイル（JS/CSS）。同じファイルは 1 回にまとめて示す。 */
export function appendReflectUploads(host: HTMLElement, plan: Pick<ReflectSectionPlan, 'fileUploads'>) {
  const labels = formatUploadList(plan.fileUploads);
  if (!labels.length) return;
  const box = document.createElement('div');
  box.className = 'kus-rl-uploads';
  box.dataset.reflectUploads = 'true';
  const title = document.createElement('strong');
  title.textContent = `反映先へアップロードするファイル（${labels.length} 件）`;
  const list = document.createElement('ul');
  for (const label of labels) { const li = document.createElement('li'); li.textContent = label; list.appendChild(li); }
  box.append(title, list);
  host.appendChild(box);
}

/** Plain text only: imported settings may contain arbitrary HTML. Render details on demand. */
export function appendReflectChanges(host: HTMLElement, plan: ReflectSectionPlan, options: { uploads?: boolean } = {}) {
  for (const warning of plan.warnings) {
    const note = document.createElement('p'); note.className = 'kus-rl-next kus-rl-next--warn'; note.textContent = warning; host.appendChild(note);
  }
  // 利用者が読める要約を先に、生の設定値の内訳は折りたたんで後に置く。
  appendReflectItems(host, plan);
  if (options.uploads !== false) appendReflectUploads(host, plan);
  if (!plan.changes.length) return;
  const details = document.createElement('details'); details.className = 'kus-rl-changes';
  if (plan.sectionKey) details.dataset.reflectDetails = `${plan.sectionKey}:changes`;
  const summary = document.createElement('summary'); summary.textContent = `${plan.label}：設定値の内訳（変更 ${plan.changeCount}件・保持 ${plan.changes.length - plan.changeCount}件）`;
  details.appendChild(summary); host.appendChild(details);
  let activeKind: 'すべて' | '削除' | '変更' | '追加' = 'すべて';
  let rendered = 0;
  const filteredChanges = () => activeKind === 'すべて'
    ? plan.changes
    : plan.changes.filter((change) => change.kind === activeKind);

  if (plan.changes.length > 1) {
    const filterBar = document.createElement('div');
    filterBar.className = 'kus-rl-change-filters';
    const filterButtons: HTMLButtonElement[] = [];
    for (const kind of ['すべて', '削除', '変更', '追加'] as const) {
      const count = kind === 'すべて'
        ? plan.changes.length
        : plan.changes.filter((c) => c.kind === kind).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kus-lp__btn kus-lp__btn--sub';
      btn.dataset.filterKind = kind;
      btn.setAttribute('aria-pressed', kind === activeKind ? 'true' : 'false');
      btn.textContent = `${kind} (${count})`;
      btn.disabled = kind !== 'すべて' && count === 0;
      btn.addEventListener('click', () => {
        activeKind = kind;
        for (const b of filterButtons) {
          b.setAttribute('aria-pressed', b.dataset.filterKind === activeKind ? 'true' : 'false');
        }
        rendered = 0;
        list.replaceChildren();
        append();
      });
      filterButtons.push(btn);
      filterBar.appendChild(btn);
    }
    details.appendChild(filterBar);
  }

  const list = document.createElement('div'); details.appendChild(list);
  const more = document.createElement('button'); more.type = 'button'; more.className = 'kus-lp__btn kus-lp__btn--sub'; more.textContent = '続きを50件表示';
  const append = () => {
    const sourceChanges = filteredChanges();
    for (const change of sourceChanges.slice(rendered, rendered + 50)) {
      const row = document.createElement('div'); row.className = 'kus-rl-change'; row.dataset.kind = change.kind;
      const title = document.createElement('strong'); title.textContent = `${change.kind} · ${change.path}`; row.appendChild(title);
      const changedKeys = extractChangedJsonKeys(change.before, change.after);
      if (changedKeys.length) {
        const keyNote = document.createElement('span');
        keyNote.className = 'kus-rl-change__keys';
        keyNote.textContent = `変更キー: ${changedKeys.join(', ')}`;
        row.appendChild(keyNote);
      }
      const grid = document.createElement('div'); grid.className = 'kus-rl-change__values';
      for (const [label, raw] of [['反映先の現在', change.before], ['反映後', change.after]]) {
        const value = formatReflectChangeValue(raw);
        const cell = document.createElement('div'), caption = document.createElement('span'), content = document.createElement('pre');
        caption.textContent = label; content.textContent = value.length > 1600 ? value.slice(0, 1600) + '\n…（全内容は計画JSONで確認できます）' : value;
        cell.append(caption, content); grid.appendChild(cell);
      }
      row.appendChild(grid); list.appendChild(row);
    }
    rendered = Math.min(rendered + 50, sourceChanges.length); more.hidden = rendered >= sourceChanges.length;
  };
  more.addEventListener('click', append); details.appendChild(more);
  details.addEventListener('toggle', () => { if (details.open && !rendered) append(); });
}

export function reflectIdentityLabel(identities: ReflectIdentities, side: 'source' | 'target', sourceEnvironment: string): string {
  const app = identities[side];
  return `${app.name}${app.appId ? `（ID: ${app.appId}）` : ''} / ${app.guestId ? `ゲストスペース ${app.guestId}` : '通常スペース'} / ${side === 'target' ? 'プレビュー' : sourceEnvironment}`;
}

/** sourceLabel を渡すと、反映元の表示を差し替える（バックアップから戻すときに「反映前のバックアップ（…）」と示すため）。 */
export function renderReflectRoute(host: HTMLElement, identities: ReflectIdentities, environment: string, options: { sourceLabel?: string } = {}) {
  const route = document.createElement('div'); route.className = 'kus-rl-confirm-route';
  for (const side of ['source', 'target'] as const) {
    const block = document.createElement('div'), label = document.createElement('span'), name = document.createElement('strong');
    label.textContent = side === 'source' ? '反映元 ↓' : '書き込み先（反映先）';
    name.textContent = side === 'source' && options.sourceLabel ? options.sourceLabel : reflectIdentityLabel(identities, side, environment); block.append(label, name); route.appendChild(block);
  }
  host.appendChild(route);
}

// =============================================================================
// 差分確認: 取得した全項目の要約表
// =============================================================================

export interface ReflectSummaryTableOptions {
  selectedScopes: ReadonlySet<string>;
  /** 行（または項目名）が押されたとき。該当項目の詳細へ移動する。 */
  onNavigate: (sectionKey: string) => void;
}

const SUMMARY_STATUS: Record<'change' | 'same' | 'error', { text: string; pill: string }> = {
  change: { text: '差分あり', pill: 'change' },
  same: { text: '一致', pill: 'same' },
  error: { text: '取得失敗', pill: 'error' }
};

/** 項目名｜状態｜変更｜削除｜保持｜反映方法｜選択中 の一覧。狭い画面では CSS で縦積みにする。 */
export function renderReflectSummaryTable(host: HTMLElement, entries: readonly ReflectSectionPlan[], options: ReflectSummaryTableOptions) {
  const wrap = document.createElement('section');
  wrap.className = 'kus-rl-summary';
  wrap.setAttribute('aria-label', `取得した全 ${entries.length} 項目の要約`);
  const title = document.createElement('div');
  title.className = 'kus-rl-summary__title';
  const heading = document.createElement('strong');
  heading.textContent = `取得した全 ${entries.length} 項目`;
  title.append(heading);
  const table = document.createElement('table');
  table.className = 'kus-rl-summary__table';
  table.setAttribute('role', 'table');
  const thead = document.createElement('thead');
  thead.setAttribute('role', 'rowgroup');
  const headRow = document.createElement('tr');
  headRow.setAttribute('role', 'row');
  const columns: Array<[string, string]> = [['name', '項目'], ['status', '状態'], ['num', '変更'], ['num', '削除'], ['num', '保持'], ['how', '反映方法'], ['sel', '選択']];
  for (const [kind, text] of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.setAttribute('role', 'columnheader');
    th.className = `kus-rl-summary__${kind}`;
    th.textContent = text;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  tbody.setAttribute('role', 'rowgroup');
  for (const entry of entries) {
    const tone = entry.status === 'change' || entry.status === 'same' ? entry.status : 'error';
    const computed = tone !== 'error';
    const tr = document.createElement('tr');
    tr.setAttribute('role', 'row');
    tr.dataset.reflectSummary = entry.sectionKey;
    const cell = (kind: string, label: string) => {
      const td = document.createElement('td');
      td.setAttribute('role', 'cell');
      td.className = `kus-rl-summary__${kind}`;
      td.dataset.label = label;
      tr.appendChild(td);
      return td;
    };
    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.className = 'kus-rl-summary__link';
    nameButton.textContent = entry.label;
    nameButton.title = `${entry.label}の詳細へ移動`;
    cell('name', '項目').appendChild(nameButton);
    const pill = document.createElement('span');
    pill.className = `kus-rl-pill kus-rl-pill--${SUMMARY_STATUS[tone].pill}`;
    pill.textContent = SUMMARY_STATUS[tone].text;
    cell('status', '状態').appendChild(pill);
    const kept = Math.max(0, entry.changes.length - entry.changeCount);
    cell('num', '変更').textContent = computed ? String(entry.changeCount) : '－';
    cell('num', '削除').textContent = computed ? String(entry.removalCount) : '－';
    cell('num', '保持').textContent = computed ? String(kept) : '－';
    cell('how', '反映方法').textContent = computed ? entry.behavior : '－';
    const selected = options.selectedScopes.has(entry.sectionKey);
    const mark = document.createElement('span');
    mark.className = 'kus-rl-preview-mini';
    mark.textContent = selected ? '選択中' : '未選択';
    cell('sel', '選択').appendChild(mark);
    tr.addEventListener('click', () => options.onNavigate(entry.sectionKey));
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);
  wrap.append(title, table);
  host.appendChild(wrap);
}

// =============================================================================
// 反映結果: セクション別の結果一覧
// =============================================================================

/** セクションごとの結果（状態アイコン＋文字、項目名、メッセージ、失敗時は対処のヒント）。すべて textContent で描画する。 */
export function renderApplySectionResults(host: HTMLElement, rawSections: unknown) {
  host.replaceChildren();
  const sections = normalizeApplySections(rawSections);
  if (!sections.length) return;
  const heading = document.createElement('div');
  heading.className = 'kus-rl-result-heading';
  heading.textContent = '項目ごとの結果';
  const list = document.createElement('ul');
  list.className = 'kus-rl-result-list';
  for (const section of sections) {
    const display = describeApplySectionStatus(section.status);
    const item = document.createElement('li');
    item.className = `kus-rl-result-item kus-rl-result-item--${display.tone}`;
    const head = document.createElement('div');
    head.className = 'kus-rl-result-item__head';
    const state = document.createElement('span');
    state.className = `kus-rl-result-state kus-rl-result-state--${display.tone}`;
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = display.icon;
    state.append(icon, document.createTextNode(display.text));
    const name = document.createElement('strong');
    name.textContent = section.label && section.label !== section.sectionKey ? section.label : reflectSectionLabel(section.sectionKey);
    head.append(state, name);
    item.appendChild(head);
    if (section.message) {
      const message = document.createElement('div');
      message.className = 'kus-rl-result-item__message';
      message.textContent = section.message;
      item.appendChild(message);
    }
    const hint = section.status === 'ng' ? buildReflectErrorHint(section.message || '') : '';
    if (hint) {
      const hintNode = document.createElement('div');
      hintNode.className = 'kus-rl-result-item__hint';
      hintNode.textContent = `ヒント: ${hint}`;
      item.appendChild(hintNode);
    }
    list.appendChild(item);
  }
  host.append(heading, list);
}

// =============================================================================
// 反映中: 項目ごとの進捗（待機中 → 実行中… → 成功／失敗／変更なし／未実行）
// =============================================================================

export interface ApplyProgressView {
  /** 反映エンジンの通知を反映して表示を更新する。 */
  update(update: { sectionKey: string; status: ApplyProgressStatus; message?: string }): void;
  rows(): ApplyProgressRow[];
}

/**
 * 実行予定の全項目を並べ、通知に合わせてその場で状態を更新する一覧。
 * 状態は色だけでなく記号と文字でも示し、変化は aria-live で読み上げる。結果一覧（renderApplySectionResults）と同じ見た目の部品を使う。
 */
export function createApplyProgressView(host: HTMLElement, initial: readonly ApplyProgressRow[]): ApplyProgressView {
  host.replaceChildren();
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'false');
  let rows = [...initial];
  const summary = document.createElement('div');
  summary.className = 'kus-rl-progress__summary';
  const list = document.createElement('ul');
  list.className = 'kus-rl-result-list';
  const nodes = new Map<string, { item: HTMLElement; state: HTMLElement; icon: HTMLElement; text: Text; message: HTMLElement }>();
  for (const row of rows) {
    const item = document.createElement('li');
    item.dataset.progressSection = row.sectionKey;
    const head = document.createElement('div');
    head.className = 'kus-rl-result-item__head';
    const state = document.createElement('span');
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createTextNode('');
    state.append(icon, text);
    const name = document.createElement('strong');
    name.textContent = row.label;
    head.append(state, name);
    const message = document.createElement('div');
    message.className = 'kus-rl-result-item__message';
    item.append(head, message);
    list.appendChild(item);
    nodes.set(row.sectionKey, { item, state, icon, text, message });
  }
  const paint = (row: ApplyProgressRow) => {
    const node = nodes.get(row.sectionKey);
    if (!node) return;
    const display = describeApplyProgressStatus(row.status);
    node.item.className = `kus-rl-result-item kus-rl-result-item--${display.tone}`;
    node.state.className = `kus-rl-result-state kus-rl-result-state--${display.tone}`;
    node.icon.textContent = display.icon;
    node.text.data = display.text;
    node.message.textContent = row.message || '';
    node.message.hidden = !row.message;
  };
  const paintSummary = () => { summary.textContent = summarizeApplyProgress(rows); };
  rows.forEach(paint);
  paintSummary();
  host.append(summary, list);
  return {
    update(update) {
      rows = applyProgressUpdate(rows, update);
      const row = rows.find((candidate) => candidate.sectionKey === update.sectionKey);
      if (row) paint(row);
      paintSummary();
    },
    rows: () => rows.map((row) => ({ ...row }))
  };
}
