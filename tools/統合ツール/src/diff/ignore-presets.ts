'use strict';

import { DIFF_IGNORE_PRESETS_KEY } from '../constants.js';
import { ui } from '../state.js';

const MAX_PRESETS = 24;

export interface DiffIgnorePreset {
  name: string;
  keys: string[];
  savedAt: number;
}

function loadRaw(): DiffIgnorePreset[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DIFF_IGNORE_PRESETS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry: any) => ({
        name: String(entry?.name || '').trim(),
        keys: Array.isArray(entry?.keys)
          ? entry.keys.map((k: any) => String(k || '').trim()).filter(Boolean)
          : [],
        savedAt: Number(entry?.savedAt) || 0
      }))
      .filter((entry: DiffIgnorePreset) => entry.name.length > 0)
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

function saveRaw(list: DiffIgnorePreset[]): void {
  try {
    localStorage.setItem(DIFF_IGNORE_PRESETS_KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
  } catch { /* ignore */ }
}

function escapeAttr(s: unknown): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function parseCurrentKeys(): string[] {
  return String(ui.ignoreKeys?.value || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

export function listIgnorePresets(): DiffIgnorePreset[] {
  return loadRaw();
}

export function refreshIgnorePresetDropdown(): void {
  const sel = ui.ignorePresetSelect as HTMLSelectElement | undefined;
  if (!sel) return;
  const list = loadRaw();
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- 読込 --</option>' +
    list.map((s) => `<option value="${escapeAttr(s.name)}">${escapeAttr(s.name)} (${s.keys.length}件)</option>`).join('');
  if (list.some((s) => s.name === cur)) sel.value = cur;
}

export function saveIgnorePreset(name: string): DiffIgnorePreset {
  const n = String(name || '').trim();
  if (!n) throw new Error('セット名を入力してください');
  const keys = parseCurrentKeys();
  const list = loadRaw().filter((x) => x.name !== n);
  const entry: DiffIgnorePreset = { name: n, keys, savedAt: Date.now() };
  list.unshift(entry);
  saveRaw(list);
  refreshIgnorePresetDropdown();
  const sel = ui.ignorePresetSelect as HTMLSelectElement | undefined;
  if (sel) sel.value = n;
  return entry;
}

function applyKeysToInput(keys: string[]): void {
  if (!ui.ignoreKeys) return;
  ui.ignoreKeys.value = keys.join(', ');
}

export function loadIgnorePreset(name: string, options: { merge?: boolean } = {}): DiffIgnorePreset | null {
  const n = String(name || '').trim();
  if (!n) return null;
  const entry = loadRaw().find((x) => x.name === n);
  if (!entry) return null;
  if (options.merge) {
    const current = new Set(parseCurrentKeys());
    for (const key of entry.keys) current.add(key);
    applyKeysToInput([...current]);
  } else {
    applyKeysToInput(entry.keys);
  }
  return entry;
}

export function deleteIgnorePreset(name: string): boolean {
  const n = String(name || '').trim();
  if (!n) return false;
  const before = loadRaw();
  const after = before.filter((x) => x.name !== n);
  if (after.length === before.length) return false;
  saveRaw(after);
  refreshIgnorePresetDropdown();
  return true;
}
