'use strict';

// 反映進捗・プラン要約の「副作用ゼロ」な部分。DOM 書き込みやステート更新は呼ばない。
// ここに置くことで単体での再利用やテストが容易になる。

import { SECTION_DEFS, HIGH_IMPACT_SECTIONS } from '../constants.js';
import { esc, renderSectionIconHtml } from '../utils.js';

export interface LogToneInfo {
  tone: string;
  icon: string;
  rest: string;
}

export function classifyLogLine(line: string): LogToneInfo {
  if (line.startsWith('OK ')) return { tone: 'ok', icon: '✓', rest: line.slice(3) };
  if (line.startsWith('NG ')) return { tone: 'ng', icon: '✗', rest: line.slice(3) };
  if (line.startsWith('SKIP ')) return { tone: 'skip', icon: '⊘', rest: line.slice(5) };
  if (line.startsWith('START ')) return { tone: 'start', icon: '▶', rest: line.slice(6) };
  if (line.startsWith('PLAN ')) return { tone: 'plan', icon: '📋', rest: line.slice(5) };
  if (/^=+/.test(line)) return { tone: 'head', icon: '', rest: line };
  if (line.trim() === '') return { tone: 'blank', icon: '', rest: '' };
  return { tone: 'plain', icon: '', rest: line };
}

export interface GanttRow {
  sectionKey: string;
  label: string;
  status: 'pending' | 'running' | 'ok' | 'ng' | 'skip';
}

export function deriveGanttRows(logs: readonly string[], scopes: readonly string[] | undefined): GanttRow[] {
  if (!Array.isArray(scopes) || !scopes.length) return [];
  const rows: GanttRow[] = scopes.map((k) => ({
    sectionKey: String(k),
    label: SECTION_DEFS.find((d) => d.key === k)?.label || k,
    status: 'pending'
  }));
  let runningKey = '';
  for (const line of logs) {
    const text = String(line);
    for (const r of rows) {
      if (text.startsWith(`OK ${r.label}`)) r.status = 'ok';
      else if (text.startsWith(`NG ${r.label}`)) r.status = 'ng';
      else if (text.startsWith(`SKIP ${r.label}`)) r.status = 'skip';
      else if (text.startsWith(`START ${r.label}`)) { r.status = 'running'; runningKey = r.sectionKey; }
    }
  }
  if (!runningKey) {
    const firstPending = rows.find((r) => r.status === 'pending');
    if (firstPending) firstPending.status = 'running';
  }
  return rows;
}

export function buildGanttHtmlFromLogs(logs: readonly string[], scopes: readonly string[] | undefined): string {
  const rows = deriveGanttRows(logs, scopes);
  if (!rows.length) return '';
  const rowsHtml = rows.map((r) => {
    const pct = r.status === 'ok' ? 100
      : r.status === 'ng' ? 100
      : r.status === 'skip' ? 100
      : r.status === 'running' ? 60
      : 0;
    const barCls = r.status === 'ok' ? 'apply-gantt__bar--ok'
      : r.status === 'ng' ? 'apply-gantt__bar--ng'
      : r.status === 'running' ? 'apply-gantt__bar--running'
      : '';
    const statusGlyph = r.status === 'ok' ? '✓' : r.status === 'ng' ? '✗' : r.status === 'skip' ? '⊘' : r.status === 'running' ? '⏳' : '';
    return `<div class="apply-gantt__row" data-status="${r.status}">
      <div class="apply-gantt__label">${renderSectionIconHtml(r.sectionKey)}<span>${esc(r.label)}</span></div>
      <div class="apply-gantt__track"><div class="apply-gantt__bar ${barCls}" style="width:${pct}%"></div></div>
      <div class="apply-gantt__time">${statusGlyph}</div>
    </div>`;
  }).join('');
  return `<div class="apply-gantt" aria-label="セクション別進捗">${rowsHtml}</div>`;
}

export interface PlanRequestSummary {
  totalRequests: number;
  methods: { POST: number; PUT: number; DELETE: number; OTHER: number };
  sectionRows: Array<{ sectionKey: string; sectionLabel: string; count: number; methods: { POST: number; PUT: number; DELETE: number; OTHER: number } }>;
  sectionCount: number;
  highImpactCount: number;
  highImpactLabels: string[];
}

export function buildPlanRequestSummary(requests: readonly any[]): PlanRequestSummary {
  const list = Array.isArray(requests) ? requests : [];
  const methods = { POST: 0, PUT: 0, DELETE: 0, OTHER: 0 };
  const sections = new Map<string, any>();
  for (const req of list) {
    const method = String(req?.method || '').toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') methods[method] += 1;
    else methods.OTHER += 1;
    const sectionKey = String(req?.sectionKey || '');
    const sectionLabel = String(req?.sectionLabel || sectionKey || '-');
    const row = sections.get(sectionKey) || { sectionKey, sectionLabel, count: 0, methods: { POST: 0, PUT: 0, DELETE: 0, OTHER: 0 } };
    row.count += 1;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') row.methods[method] += 1;
    else row.methods.OTHER += 1;
    sections.set(sectionKey, row);
  }
  const sectionRows = [...sections.values()].sort((a, b) => b.count - a.count);
  const highImpact = sectionRows.filter((row) => HIGH_IMPACT_SECTIONS.has(row.sectionKey));
  return {
    totalRequests: list.length,
    methods,
    sectionRows,
    sectionCount: sectionRows.length,
    highImpactCount: highImpact.length,
    highImpactLabels: highImpact.map((row) => row.sectionLabel)
  };
}
