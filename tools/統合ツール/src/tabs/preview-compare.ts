'use strict';

export function getPreviewCompareStatusPrefix(ui) {
  const sp = !!ui?.sourcePreview?.checked;
  const tp = !!ui?.targetPreview?.checked;
  if (!sp && tp) return '〔本番 → プレビュー〕';
  if (sp && tp) return '〔プレビュー同士〕';
  if (!sp && !tp) return '〔本番同士〕';
  return '〔プレビュー → 本番〕';
}
