import type { ReflectSectionPlan } from '../reflect/standalonePlan.js';
import type { ReflectIdentities } from '../tabs/reflect-standalone.js';

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
      for (const [label, value] of [['反映先の現在', change.before], ['反映後', change.after]]) {
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
