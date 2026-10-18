import { SECTION_DEFS } from '../constants.js';
import { buildReflectErrorHint } from '../reflect/applyOutcome.js';
import { describeApplySectionStatus, normalizeApplySections } from '../reflect/liteSetup.js';
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

/** Plain text only: imported settings may contain arbitrary HTML. Render details on demand. */
export function appendReflectChanges(host: HTMLElement, plan: ReflectSectionPlan) {
  for (const warning of plan.warnings) {
    const note = document.createElement('p'); note.className = 'kus-rl-next kus-rl-next--warn'; note.textContent = warning; host.appendChild(note);
  }
  if (!plan.changes.length) return;
  const details = document.createElement('details'); details.className = 'kus-rl-changes';
  const summary = document.createElement('summary'); summary.textContent = `${plan.label}の内訳（変更 ${plan.changeCount}件・保持 ${plan.changes.length - plan.changeCount}件）`;
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
  return `${app.name}${app.appId ? `（ID: ${app.appId}）` : ''} / ${app.guestId ? `ゲスト ${app.guestId}` : '通常スペース'} / ${side === 'target' ? 'プレビュー' : sourceEnvironment}`;
}

export function renderReflectRoute(host: HTMLElement, identities: ReflectIdentities, environment: string) {
  const route = document.createElement('div'); route.className = 'kus-rl-confirm-route';
  for (const side of ['source', 'target'] as const) {
    const block = document.createElement('div'), label = document.createElement('span'), name = document.createElement('strong');
    label.textContent = side === 'source' ? '反映元 ↓' : '書き込み先';
    name.textContent = reflectIdentityLabel(identities, side, environment); block.append(label, name); route.appendChild(block);
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
  error: { text: '確認が必要', pill: 'error' }
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
  const note = document.createElement('span');
  note.textContent = '項目名を押すと、下の詳細へ移動します。';
  title.append(heading, note);
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
    name.textContent = section.label && section.label !== section.sectionKey
      ? section.label
      : SECTION_DEFS.find((def) => def.key === section.sectionKey)?.label || section.label || section.sectionKey;
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
