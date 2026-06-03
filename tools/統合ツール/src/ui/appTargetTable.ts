'use strict';

/**
 * 統合ツール本体用の「複数アプリ × アプリごとのゲストスペース」表入力コントローラ。
 *
 * - 1 行だけ使えば単一アプリ、複数行で一括処理（単一/複数を分けない）
 * - アプリごとに別のゲストスペースを指定できる
 * - 各行に「↑コピー」（上の行をコピー）「複製」「×（削除）」を備える
 * - 互換性のため、隠した <textarea>（mirror）へアプリID一覧を同期し続ける。
 *   既存のスナップショット保存/復元・プリセット・クイック追加は mirror.value を
 *   読み書きし続けられる（その後 syncFromMirror() で表へ反映する）。
 */

export interface AppTarget { appId: string; guestId: string }

const STYLE_ID = 'kus-app-target-table-styles';

const CSS = `
.app-target-table{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff}
.app-target-table table{width:100%;border-collapse:collapse;table-layout:fixed}
.app-target-table th{background:#f1f5f9;font-size:11px;font-weight:600;color:#334155;text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0}
.app-target-table td{padding:5px 8px;border-bottom:1px solid #eef2f7;vertical-align:middle}
.app-target-table tbody tr:last-child td{border-bottom:none}
.app-target-table input{width:100%;box-sizing:border-box;padding:6px 8px;font-size:12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f172a}
.app-target-table input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.app-target-table__no{width:30px;text-align:center;color:#94a3b8;font-size:11px;font-variant-numeric:tabular-nums}
.app-target-table__acts-h{width:132px}
.app-target-table__acts{white-space:nowrap}
.app-target-table__acts .btn{padding:4px 7px;font-size:11px;margin-left:4px}
.app-target-table__acts .btn:first-child{margin-left:0}
.app-target-table__foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;background:#f8fafc;border-top:1px solid #e2e8f0}
.app-target-table__count{font-size:11px;color:#64748b;margin-left:auto;font-weight:600}
`;

function ensureStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  (doc.head || doc.documentElement).appendChild(s);
}

function parseAppIds(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tk of String(text || '').split(/[\s,]+/)) {
    const id = tk.trim();
    if (!/^\d+$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

interface RowEntry { tr: HTMLTableRowElement; app: HTMLInputElement; guest: HTMLInputElement; copyBtn: HTMLButtonElement }

export interface AppTargetTableOptions {
  key: string;
  container: HTMLElement;
  mirror?: HTMLTextAreaElement | null;
  /** 「現在のアプリ」ボタン用。未指定ならボタンを出さない */
  currentAppId?: () => string;
  /** 新規行の既定ゲストID（検索/取込で追加される行に使う） */
  defaultGuest?: () => string;
  /** 行が変化したときに呼ぶ（saveCurrentDialogState 等） */
  onChange?: () => void;
}

export class AppTargetTable {
  readonly key: string;
  private container: HTMLElement;
  private mirror: HTMLTextAreaElement | null;
  private currentAppId?: () => string;
  private defaultGuest: () => string;
  private onChange?: () => void;
  private doc: Document;
  private tbody!: HTMLTableSectionElement;
  private count!: HTMLElement;
  private rows: RowEntry[] = [];
  private suppressMirror = false;

  constructor(opts: AppTargetTableOptions) {
    this.key = opts.key;
    this.container = opts.container;
    this.mirror = opts.mirror || null;
    this.currentAppId = opts.currentAppId;
    this.defaultGuest = opts.defaultGuest || (() => '');
    this.onChange = opts.onChange;
    this.doc = opts.container.ownerDocument || document;
    ensureStyles(this.doc);
    this.render();
    this.syncFromMirror();
  }

  private render() {
    const doc = this.doc;
    this.container.classList.add('app-target-table');
    this.container.innerHTML =
      '<table><thead><tr>' +
      '<th class="app-target-table__no">#</th>' +
      '<th>アプリID</th><th>ゲストID</th>' +
      '<th class="app-target-table__acts-h">操作</th>' +
      '</tr></thead><tbody></tbody></table>' +
      '<div class="app-target-table__foot"></div>';
    this.tbody = this.container.querySelector('tbody') as HTMLTableSectionElement;
    const foot = this.container.querySelector('.app-target-table__foot') as HTMLElement;

    const addBtn = doc.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn sub';
    addBtn.textContent = '＋ 行を追加';
    addBtn.addEventListener('click', () => { const e = this.insertRow(this.rows.length, '', '', true); e.app.focus(); this.changed(); });
    foot.appendChild(addBtn);

    if (this.currentAppId) {
      const curBtn = doc.createElement('button');
      curBtn.type = 'button';
      curBtn.className = 'btn sub';
      curBtn.textContent = '現在のアプリ';
      curBtn.title = '今開いているアプリのIDを空き行に入れます';
      curBtn.addEventListener('click', () => {
        const id = String(this.currentAppId!() || '').trim();
        if (!/^\d+$/.test(id)) return;
        if (this.rows.some((r) => r.app.value.trim() === id)) return;
        const empty = this.rows.find((r) => !r.app.value.trim());
        if (empty) { empty.app.value = id; empty.app.focus(); }
        else { const e = this.insertRow(this.rows.length, id, '', true); e.app.focus(); }
        this.changed();
      });
      foot.appendChild(curBtn);
    }

    this.count = doc.createElement('span');
    this.count.className = 'app-target-table__count';
    foot.appendChild(this.count);
  }

  private insertRow(index: number, appId = '', guestId = '', _focus = false): RowEntry {
    const doc = this.doc;
    const tr = doc.createElement('tr');
    const mk = (cls?: string) => { const td = doc.createElement('td'); if (cls) td.className = cls; return td; };
    const tdNo = mk('app-target-table__no');
    const tdApp = mk();
    const tdGuest = mk();
    const tdAct = mk('app-target-table__acts');

    const app = doc.createElement('input');
    app.type = 'text'; app.placeholder = 'アプリID'; app.value = appId; app.setAttribute('aria-label', 'アプリID');
    const guest = doc.createElement('input');
    guest.type = 'text'; guest.placeholder = '空欄=通常スペース'; guest.value = guestId; guest.setAttribute('aria-label', 'ゲストID');

    const copyBtn = doc.createElement('button');
    copyBtn.type = 'button'; copyBtn.className = 'btn sub'; copyBtn.textContent = '↑コピー';
    copyBtn.title = '上の行のアプリID・ゲストIDをこの行へコピー';
    const dupBtn = doc.createElement('button');
    dupBtn.type = 'button'; dupBtn.className = 'btn sub'; dupBtn.textContent = '複製'; dupBtn.title = 'この行を下に複製';
    const delBtn = doc.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'btn sub'; delBtn.textContent = '×'; delBtn.title = 'この行を削除';

    tdApp.appendChild(app); tdGuest.appendChild(guest);
    tdAct.appendChild(copyBtn); tdAct.appendChild(dupBtn); tdAct.appendChild(delBtn);
    tr.appendChild(tdNo); tr.appendChild(tdApp); tr.appendChild(tdGuest); tr.appendChild(tdAct);

    const entry: RowEntry = { tr, app, guest, copyBtn };
    copyBtn.addEventListener('click', () => {
      const idx = this.rows.indexOf(entry);
      if (idx <= 0) return;
      const prev = this.rows[idx - 1];
      app.value = prev.app.value; guest.value = prev.guest.value;
      app.focus(); this.changed();
    });
    dupBtn.addEventListener('click', () => {
      const idx = this.rows.indexOf(entry);
      const ne = this.insertRow(idx + 1, app.value.trim(), guest.value.trim());
      ne.app.focus(); this.changed();
    });
    delBtn.addEventListener('click', () => this.removeRow(entry));
    app.addEventListener('input', () => this.changed());
    guest.addEventListener('input', () => this.changed());

    const at = Math.min(Math.max(index, 0), this.rows.length);
    if (at >= this.rows.length) this.tbody.appendChild(tr);
    else this.tbody.insertBefore(tr, this.rows[at].tr);
    this.rows.splice(at, 0, entry);
    this.refresh();
    return entry;
  }

  private removeRow(entry: RowEntry) {
    if (this.rows.length <= 1) {
      entry.app.value = ''; entry.guest.value = '';
      this.changed();
      return;
    }
    const idx = this.rows.indexOf(entry);
    if (idx >= 0) this.rows.splice(idx, 1);
    entry.tr.remove();
    this.changed();
  }

  private refresh() {
    this.rows.forEach((r, i) => {
      const no = r.tr.querySelector('.app-target-table__no') as HTMLElement | null;
      if (no) no.textContent = String(i + 1);
      r.copyBtn.disabled = i === 0;
    });
    const n = this.getTargets().length;
    this.count.textContent = n ? `${n} アプリ` : '未入力';
  }

  /** 行変化時：mirror へ書き戻し → refresh → onChange */
  private changed() {
    this.writeMirror();
    this.refresh();
    this.onChange?.();
  }

  private writeMirror() {
    if (!this.mirror || this.suppressMirror) return;
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const r of this.rows) {
      const id = r.app.value.trim();
      if (!/^\d+$/.test(id) || seen.has(id)) continue;
      seen.add(id); ids.push(id);
    }
    this.mirror.value = ids.join(', ');
  }

  /** mirror（アプリID一覧）から表を再構築。既存行のゲストは appId 一致で引き継ぐ。 */
  syncFromMirror() {
    if (!this.mirror) {
      if (!this.rows.length) this.insertRow(0, '', '');
      this.refresh();
      return;
    }
    const guestByApp = new Map<string, string>();
    for (const r of this.rows) {
      const id = r.app.value.trim();
      if (id && r.guest.value.trim()) guestByApp.set(id, r.guest.value.trim());
    }
    const ids = parseAppIds(this.mirror.value);
    this.suppressMirror = true;
    this.rows.splice(0).forEach((r) => r.tr.remove());
    this.tbody.innerHTML = '';
    const def = String(this.defaultGuest() || '').trim();
    if (ids.length) {
      for (const id of ids) this.insertRow(this.rows.length, id, guestByApp.get(id) ?? def);
    } else {
      this.insertRow(0, '', '');
    }
    this.suppressMirror = false;
    this.refresh();
  }

  getTargets(): AppTarget[] {
    const seen = new Set<string>();
    const out: AppTarget[] = [];
    for (const r of this.rows) {
      const appId = r.app.value.trim();
      if (!/^\d+$/.test(appId)) continue;
      const guestId = r.guest.value.trim();
      const key = `${appId}::${guestId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ appId, guestId });
    }
    return out;
  }

  getAllRows(): AppTarget[] {
    return this.rows.map((r) => ({ appId: r.app.value.trim(), guestId: r.guest.value.trim() }));
  }

  addRow(appId = '', guestId = '', focus = false) {
    const id = String(appId || '').trim();
    if (id && this.rows.some((r) => r.app.value.trim() === id)) {
      // 既存と同じ appId の行があればゲストだけ補完して終わり
      this.changed();
      return;
    }
    const empty = !id ? null : this.rows.find((r) => !r.app.value.trim());
    if (empty) { empty.app.value = id; empty.guest.value = guestId; if (focus) empty.app.focus(); }
    else { const e = this.insertRow(this.rows.length, id, guestId, focus); if (focus) e.app.focus(); }
    this.changed();
  }

  setTargets(list: AppTarget[]) {
    this.suppressMirror = true;
    this.rows.splice(0).forEach((r) => r.tr.remove());
    this.tbody.innerHTML = '';
    const src = Array.isArray(list) && list.length ? list : [{ appId: '', guestId: '' }];
    for (const r of src) this.insertRow(this.rows.length, String(r.appId || '').trim(), String(r.guestId || '').trim());
    this.suppressMirror = false;
    this.changed();
  }
}

const registry = new Map<string, AppTargetTable>();

export function getAppTargetTable(key: string): AppTargetTable | undefined {
  return registry.get(key);
}

export interface AppTargetTableConfig {
  currentAppId?: () => string;
  defaultGuest?: () => string;
  onChange?: () => void;
}

/**
 * root 内の [data-app-target-table] コンテナをすべて初期化する。
 * data-mirror 属性で対応する hidden textarea の id を指定する。
 */
export function initAppTargetTables(root: HTMLElement, configs: Record<string, AppTargetTableConfig> = {}) {
  const doc = root.ownerDocument || document;
  const nodes = root.querySelectorAll('[data-app-target-table]');
  nodes.forEach((el) => {
    const key = el.getAttribute('data-app-target-table') || '';
    if (!key) return;
    const cfg = configs[key] || {};
    const mirrorId = el.getAttribute('data-mirror') || '';
    const mirror = mirrorId ? (doc.getElementById(mirrorId) as HTMLTextAreaElement | null) : null;
    const table = new AppTargetTable({
      key,
      container: el as HTMLElement,
      mirror,
      currentAppId: cfg.currentAppId,
      defaultGuest: cfg.defaultGuest,
      onChange: cfg.onChange
    });
    registry.set(key, table);
  });
}

export function resetAppTargetTables() {
  registry.clear();
}
