'use strict';

/**
 * JS/CSS 本文とプラグイン設定は認証情報等を含み得る。
 * 「同一」行は値そのものを証跡へ重複収録する必要がないため、既定で省略する。
 */
export const SENSITIVE_DIFF_SECTION_KEYS: ReadonlySet<string> = new Set([
  'customizeSettings',
  'pluginSettings'
]);

export const SENSITIVE_SAME_VALUE_REDACTION = '（同一の機密値は安全のため省略しました）';

function sectionKeyOf(row: any): string {
  const explicit = String(row?.sectionKey || '').trim();
  if (explicit) return explicit;
  return String(row?.path || '').split(/[.\[]/, 1)[0] || '';
}

export function isSensitiveSameDiffRow(row: any): boolean {
  return row?.type === 'same' && SENSITIVE_DIFF_SECTION_KEYS.has(sectionKeyOf(row));
}

export function redactSensitiveSameDiffRows<T extends any[]>(rows: T | null | undefined): T {
  const source = Array.isArray(rows) ? rows : [];
  return source.map((row) => {
    if (!isSensitiveSameDiffRow(row)) return row;
    return {
      ...row,
      left: SENSITIVE_SAME_VALUE_REDACTION,
      right: SENSITIVE_SAME_VALUE_REDACTION,
      sensitiveValueRedacted: true
    };
  }) as T;
}
