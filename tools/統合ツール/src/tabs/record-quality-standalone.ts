'use strict';

import { apiGet, buildApiPrefix, fetchRecordsByQuery } from '../api.js';
import { downloadBlob, buildExportFilename } from '../utils.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { parseRecordAppIds } from './record-standalone.js';
import { readQualityFields, selectQualityFields, inspectRecordQuality, type QualityAppResult, type QualityOptions } from './record-quality.js';
import { buildCsvImportTemplate } from './record-template.js';

type Status = (message: string, error?: boolean) => void;
function connection(appIdsText: string, guestId: string) {
  const appIds = parseRecordAppIds(appIdsText);
  if (!appIds.length) throw new Error('対象アプリを指定してください');
  if (guestId && !/^[1-9]\d*$/.test(guestId)) throw new Error('ゲストIDは正の数値で入力してください');
  return { appIds, prefix: buildApiPrefix(guestId, false) };
}

export async function runLoadQualityFieldsStandalone(options: { appIdsText: string; guestId: string }) {
  const { appIds, prefix } = connection(options.appIdsText, options.guestId);
  return readQualityFields((await apiGet(prefix, '/app/form/fields.json', { app: appIds[0], lang: 'user' })).properties);
}

export async function runRecordQualityStandalone(options: QualityOptions & { appIdsText: string; guestId: string; codes: string[]; query: string }, setStatus: Status): Promise<QualityAppResult[]> {
  const { appIds, prefix } = connection(options.appIdsText, options.guestId);
  const results: QualityAppResult[] = [];
  for (const appId of appIds) {
    setStatus(`App ${appId}: 検査用の設定を取得中…`);
    try {
      const properties = (await apiGet(prefix, '/app/form/fields.json', { app: appId, lang: 'user' })).properties;
      const fields = selectQualityFields(properties, options.codes);
      const { records } = await fetchRecordsByQuery(prefix, appId, options.query, { fields: ['$id', ...options.codes], onProgress: count => setStatus(`App ${appId}: ${count}件を取得済み…`) });
      results.push({ appId, report: inspectRecordQuality(records, fields, options) });
    } catch (error: any) { results.push({ appId, error: error.message || String(error) }); }
  }
  return results;
}

export async function runCsvTemplateStandalone(options: { appIdsText: string; guestId: string }, setStatus: Status): Promise<{ warning?: string }> {
  const { appIds, prefix } = connection(options.appIdsText, options.guestId);
  const templates: Array<{ appId: string; template: ReturnType<typeof buildCsvImportTemplate> }> = [];
  const failures: string[] = [];
  for (const appId of appIds) {
    setStatus(`App ${appId}: CSVひな形を作成中…`);
    try {
      // Match the existing CSV importer, which validates choices in the app's default language.
      const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId });
      templates.push({ appId, template: buildCsvImportTemplate(fields.properties) });
    } catch (error: any) { failures.push(`App ${appId}: ${error.message || String(error)}`); }
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
  zip.file('manifest.json', JSON.stringify({ createdAt: generatedAt, guestId: options.guestId, templates: templates.map(item => ({ appId: item.appId, columns: item.template.columnCount })), failures }, null, 2));
  downloadBlob(buildExportFilename('CSV取込ひな形', 'zip'), await zip.generateAsync({ type: 'blob' }));
  if (failures.length) return { warning: `${templates.length}アプリのひな形を保存 / 失敗 ${failures.length}アプリ\n${failures.join('\n')}` };
  setStatus(`${templates.length}アプリのCSVひな形と入力ガイドを保存しました`);
  return {};
}
