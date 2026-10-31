'use strict';

import { apiGet, buildApiPrefix, fetchRecordsByQuery } from '../api.js';
import { downloadBlob, buildExportFilename } from '../utils.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { isRunCancelledError } from '../runControl.js';
import { createCancelReport, formatCancelledHeadline } from './run-cancel-summary.js';
import { parseRecordAppIds, type RecordStatusCallback } from './record-standalone.js';
import { readQualityFields, selectQualityFields, inspectRecordQuality, type QualityAppResult, type QualityOptions } from './record-quality.js';
import { buildCsvImportTemplate } from './record-template.js';

type Status = RecordStatusCallback;
function connection(appIdsText: string, guestId: string) {
  // Leading zeros are accepted by the shared parser but break record links and make "7" and "07" separate targets.
  const appIds = [...new Set(parseRecordAppIds(appIdsText).map(id => id.replace(/^0+/, '')))];
  if (!appIds.length) throw new Error('対象アプリを指定してください');
  if (guestId && !/^[1-9]\d*$/.test(guestId)) throw new Error('ゲストIDは正の数値で入力してください');
  return { appIds, prefix: buildApiPrefix(guestId, false) };
}

export async function runLoadQualityFieldsStandalone(options: { appIdsText: string; guestId: string; intersectAll?: boolean }) {
  const { appIds, prefix } = connection(options.appIdsText, options.guestId);
  const firstFields = readQualityFields((await apiGet(prefix, '/app/form/fields.json', { app: appIds[0], lang: 'user' }))?.properties);
  if (!options.intersectAll || appIds.length <= 1) return firstFields;
  let common = firstFields;
  for (let i = 1; i < appIds.length; i++) {
    try {
      const nextProps = (await apiGet(prefix, '/app/form/fields.json', { app: appIds[i], lang: 'user' }))?.properties;
      const nextMap = new Map(readQualityFields(nextProps).map(f => [f.code, f.type]));
      common = common.filter(f => nextMap.get(f.code) === f.type);
    } catch (error) {
      // 中止は「取得できなかった」ではないので、共通項目を絞り込んだ結果として返さない。
      if (isRunCancelledError(error)) throw error;
      // Keep existing fields if a secondary app cannot be fetched during field loading
    }
  }
  return common;
}

export async function runRecordQualityStandalone(options: QualityOptions & { appIdsText: string; guestId: string; codes: string[]; query: string }, setStatus: Status): Promise<QualityAppResult[]> {
  const { appIds, prefix } = connection(options.appIdsText, options.guestId);
  const results: QualityAppResult[] = [];
  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];
    setStatus(`App ${appId}: 検査用の設定を取得中…`);
    try {
      const properties = (await apiGet(prefix, '/app/form/fields.json', { app: appId, lang: 'user' }))?.properties;
      const fields = selectQualityFields(properties, options.codes);
      const { records } = await fetchRecordsByQuery(prefix, appId, options.query, { fields: ['$id', ...options.codes], onProgress: count => setStatus(`App ${appId}: ${count}件を取得済み…`) });
      results.push({ appId, report: inspectRecordQuality(records, fields, options) });
    } catch (error: any) {
      if (isRunCancelledError(error)) {
        // 検査は読み取りだけなので、検査し終えた分は返す。中断した App と残りは成功扱いにせず「未実行（中止）」と示す。
        for (const pendingId of appIds.slice(i)) results.push({ appId: pendingId, error: '未実行（中止）' });
        setStatus(`${formatCancelledHeadline(i, appIds.length)}。検査済みの結果だけを表示します`, 'warn');
        return results;
      }
      results.push({ appId, error: error.message || String(error) });
    }
  }
  return results;
}

export async function runCsvTemplateStandalone(options: { appIdsText: string; guestId: string }, setStatus: Status): Promise<{ warning?: string }> {
  const { appIds, prefix } = connection(options.appIdsText, options.guestId);
  const templates: Array<{ appId: string; excludedCount: number; template: ReturnType<typeof buildCsvImportTemplate> }> = [];
  const failures: string[] = [];
  /** 中止で止めた位置。-1 は最後まで実行した。 */
  let stoppedAt = -1;
  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];
    setStatus(`App ${appId}: CSVひな形を作成中…`);
    try {
      // Match the existing CSV importer, which validates choices in the app's default language.
      const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId });
      const Built = buildCsvImportTemplate(fields?.properties);
      const excludedCount = Math.max(0, Object.keys(fields?.properties || {}).length - Built.columnCount);
      templates.push({ appId, excludedCount, template: Built });
    } catch (error: any) {
      if (isRunCancelledError(error)) { stoppedAt = i; break; }
      failures.push(`App ${appId}: ${error.message || String(error)}`);
    }
  }
  const notRun = stoppedAt >= 0 ? appIds.slice(stoppedAt).map(id => `App ${id}`) : [];
  if (!templates.length && stoppedAt >= 0) {
    throw createCancelReport(stoppedAt, appIds.length, [...failures.map(failure => `失敗 ${failure}`), `未実行（中止）: ${notRun.join(', ')}`, 'ZIP は保存していません']);
  }
  if (!templates.length) throw new Error(`ひな形を作成できませんでした\n${failures.join('\n')}`);
  const JSZip = await loadJSZipLite(), zip = new JSZip();
  const generatedAt = new Date().toISOString();
  for (const { appId, template } of templates) {
    const folder = `app_${appId}/`;
    zip.file(folder + 'import.csv', template.csv);
    zip.file(folder + 'fields.csv', template.guideCsv);
    zip.file(folder + 'excluded.csv', template.excludedCsv);
    const head = [
      'kintone CSV取込ひな形',
      `対象: App ${appId}${options.guestId ? ` / ゲストスペース ${options.guestId}` : ''}`,
      `生成: ${generatedAt}`,
      `取込できる列: ${template.columnCount}列`,
      ''
    ].join('\r\n');
    zip.file(folder + 'README.txt', head + template.readme + '\r\n');
  }
  const appEntries = templates.map(item => ({ appId: item.appId, guestId: options.guestId || '', columns: item.template.columnCount, excludedCount: item.excludedCount }));
  zip.file('manifest.json', JSON.stringify({ generatedAt, createdAt: generatedAt, guestId: options.guestId, apps: appEntries, templates: appEntries, failures, ...(notRun.length ? { cancelled: true, notExecuted: notRun.map(label => `${label}: 未実行（中止）`) } : {}) }, null, 2));
  downloadBlob(buildExportFilename('CSV取込ひな形', 'zip'), await zip.generateAsync({ type: 'blob' }));
  if (notRun.length) {
    return { warning: `${formatCancelledHeadline(stoppedAt, appIds.length)}\n${templates.length}アプリのひな形だけを保存しました${failures.length ? ` / 失敗 ${failures.length}アプリ` : ''}\n未実行（中止）: ${notRun.join(', ')}${failures.length ? `\n${failures.join('\n')}` : ''}` };
  }
  if (failures.length) return { warning: `${templates.length}アプリのひな形を保存 / 失敗 ${failures.length}アプリ\n${failures.join('\n')}` };
  setStatus(`${templates.length}アプリのCSVひな形と入力ガイドを保存しました`);
  return {};
}
