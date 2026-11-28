import { afterEach, describe, expect, it } from 'vitest';
import { SECTION_DEFS } from '../../src/constants';
import { LiteZip } from '../../src/archive/lite-zip';
import { computeDiffRows } from '../../src/diff/engine';
import { enrichDiffRows } from '../../src/diff/enrich';
import { buildDiffHtml, bundleToMarkdown } from '../../src/diff/export';
import { buildDiffXlsxSheets } from '../../src/diff/xlsx-export';
import { buildDiffMarkdownExport } from '../../src/diff/markdown-export';
import { parseDiffBatchFolderImport } from '../../src/diff/batch-folder-import';
import { parseDiffComparisonProfile } from '../../src/diff/comparison-profile';
import { buildDesignSnapshot } from '../../src/design/snapshot';
import { buildDesignAiMarkdown } from '../../src/design/ai-markdown';
import { stripSensitiveSupplements } from '../../src/design/sanitize';
import { buildErAppModel, buildErAppModelFromBundle, buildErMarkdownSpec, buildErMermaidSource, buildErRelationsCsv } from '../../src/tabs/er-model';
import { buildHTML } from '../../src/tabs/er.js';
import { pickAllSettingsBundles, pickSettingsBundle } from '../../src/settingsBundleImport';
import { readSettingsZip } from '../../src/settingsZipImport';
import { buildErModelFromOfflineSource, buildErOfflineSource, listOfflineSpaceApps } from '../../src/tabs/er-offline';
import { buildDesignHtml } from '../../src/design/html';
import { readDiffBatchZipFiles } from '../../src/diff/batch-zip-import';
import { buildProcessBatchOverviewMarkdown, buildProcessSpecMarkdown, extractOfflineProcessStatusData, formatProcessSimulationHistory } from '../../src/tabs/process-standalone';
import { REFLECT_SECTION_KEYS } from '../../src/reflect/sections';
import { buildReflectSectionPlan } from '../../src/reflect/standalonePlan';
import { normalizeImportedReflectPresets } from '../../src/reflect/presetIo';
import { parseSelectionFile } from '../../src/deploy/sourceSelectionFile';
import { parseFieldJsonInput, parseLookupMapInput, planFieldApply } from '../../src/tabs/field-standalone';
import { parseCsvText, planCsvImport } from '../../src/tabs/record-csv-import';
import { buildCopyRecordPayloads } from '../../src/tabs/record-standalone';

/**
 * 読み込む設定JSON・ZIP・比較条件は利用者の手元のファイルで、中身は信用しない。
 * `__proto__`・`constructor`・`prototype` を、フィールドコード・一覧名・選択肢名・プラグイン設定のキーなど、
 * 名前として使われる位置と、設定の入れ物の位置の両方に入れる。
 */
const POISON = '{"__proto__":{"polluted":"proto"},"constructor":{"prototype":{"polluted":"ctor"}},"prototype":{"polluted":"prototype"}}';
const field = (code: string, label: string) => `{"type":"DROP_DOWN","code":"${code}","label":"${label}","options":${POISON.replace('{', `{"${label}":{"label":"${label}","index":"0"},`)}}`;

function poisonedBundleText(appId: string, label: string): string {
  return `{
    "appId": "${appId}", "guestId": "", "preview": false, "fetchedAt": "2026-11-28T00:00:00.000Z",
    "meta": ${POISON},
    "sections": {
      "__proto__": {"polluted": "sections"},
      "appSettings": {"name": "アプリ${label}", "__proto__": {"polluted": "app"}, "theme": "WHITE"},
      "fieldSettings": {"properties": {
        "__proto__": ${field('__proto__', label)},
        "constructor": ${field('constructor', label)},
        "prototype": ${field('prototype', label)},
        "table": {"type": "SUBTABLE", "code": "table", "fields": {"__proto__": ${field('__proto__', label)}}},
        "lookup": {"type": "SINGLE_LINE_TEXT", "code": "lookup", "label": "L", "lookup": {"relatedApp": {"app": "9"}, "relatedKeyField": "__proto__", "fieldMappings": [{"field": "constructor", "relatedField": "__proto__"}]}}
      }},
      "layoutSettings": {"layout": [{"type": "ROW", "fields": [{"type": "DROP_DOWN", "code": "__proto__"}, {"type": "LABEL", "label": "<b>${label}</b>", "__proto__": {"polluted": "layout"}}]}]},
      "viewSettings": {"views": {"__proto__": {"type": "LIST", "name": "__proto__", "index": "0", "fields": ["__proto__"], "filterCond": "constructor = \\"${label}\\""}, "constructor": {"type": "CUSTOM", "name": "constructor", "index": "1", "html": "<div>${label}</div>"}}},
      "reportSettings": {"reports": ${POISON}},
      "processSettings": {"enable": true, "states": {"__proto__": {"name": "__proto__", "index": "0", "assignee": {"type": "ONE", "entities": [{"entity": {"type": "USER", "code": "__proto__"}}]}}, "constructor": {"name": "constructor", "index": "1"}}, "actions": [{"name": "__proto__", "from": "__proto__", "to": "constructor", "filterCond": ""}]},
      "pluginSettings": {"plugins": [{"id": "p1", "name": "P", "enabled": true, "_config": ${POISON}}]},
      "customizeSettings": {"scope": "ALL", "desktop": {"js": [{"type": "URL", "url": "https://example.invalid/${label}.js"}], "css": []}, "mobile": {"js": [], "css": []}},
      "appAcl": {"rights": [{"entity": {"type": "USER", "code": "__proto__"}, "appEditable": true}]},
      "fieldAcl": {"rights": [{"code": "__proto__", "entities": [{"accessibility": "READ", "entity": {"type": "USER", "code": "constructor"}}]}]},
      "recordAcl": {"rights": [{"filterCond": "", "entities": [{"entity": {"type": "GROUP", "code": "prototype"}, "viewable": true}]}]},
      "notifications": {"notifyToCommenter": true, "targets": [{"entity": {"type": "USER", "code": "__proto__"}, "recordAdded": true}]},
      "perRecordNotifications": {"notifications": [{"filterCond": "", "title": "${label}", "targets": [{"entity": {"type": "FIELD_ENTITY", "code": "__proto__"}}]}]},
      "reminderNotifications": {"notifications": [{"timing": {"code": "__proto__", "daysLater": 1}, "title": "${label}", "targets": []}], "timezone": "Asia/Tokyo"},
      "actionSettings": {"actions": {"__proto__": {"name": "__proto__", "index": "0", "destApp": {"app": "9"}, "mappings": [{"srcType": "FIELD", "srcField": "__proto__", "destField": "constructor"}], "entities": []}}},
      "categories": {"enabled": true, "categories": [{"id": "1", "name": {"__proto__": "${label}"}, "children": []}]}
    }
  }`;
}

const watchedPrototypes: Array<[string, object]> = [
  ['Object.prototype', Object.prototype],
  ['Array.prototype', Array.prototype],
  ['Function.prototype', Function.prototype],
  ['String.prototype', String.prototype]
];
const before = watchedPrototypes.map(([, proto]) => Object.getOwnPropertyNames(proto).sort().join(','));

function expectNoPollution(): void {
  watchedPrototypes.forEach(([name, proto], index) => {
    expect(Object.getOwnPropertyNames(proto).sort().join(','), name).toBe(before[index]);
  });
  expect(({} as any).polluted).toBeUndefined();
  expect(([] as any).polluted).toBeUndefined();
}

afterEach(() => {
  expectNoPollution();
});

const scopes = SECTION_DEFS.map((def) => def.key);

describe('読み込んだ設定の __proto__ / constructor / prototype でプロトタイプを汚さない', () => {
  it('設定JSONの読み込み（単体・複数・ZIP）', async () => {
    const pair = `{"source": ${poisonedBundleText('1', '旧')}, "target": ${poisonedBundleText('2', '新')}}`;
    pickSettingsBundle(JSON.parse(pair), { side: 'target', appId: '2', sections: scopes });
    pickAllSettingsBundles(JSON.parse(`{"apps": [${poisonedBundleText('1', '旧')}, ${poisonedBundleText('2', '新')}]}`), undefined, true, true);
    const zip = new LiteZip();
    zip.file('manifest.json', `{"apps": [{"file": "a.json"}], "__proto__": {"polluted": "manifest"}}`);
    zip.file('a.json', poisonedBundleText('1', '旧'));
    const bytes = new Uint8Array(await (await zip.generateAsync({ type: 'blob' })).arrayBuffer());
    const imported = await readSettingsZip(bytes);
    expect(imported.raw.bundles).toHaveLength(1);
    const folder = parseDiffBatchFolderImport([
      { name: 'manifest.json', relativePath: 'x/manifest.json', text: '{"__proto__":{"polluted":"m"},"apps":[]}' },
      { name: 'a.json', relativePath: 'x/a.json', text: poisonedBundleText('1', '旧') }
    ], { side: 'source' });
    expect(folder).toBeTruthy();
    // 正規化の名前に使えないキー（__proto__ など）は読み飛ばす
    const presets = parseDiffComparisonProfile(JSON.parse(`{"kind":"kintone-diff-comparison-profile","version":1,"name":"x","scopes":["appSettings"],"ignoreKeys":"","normalizationPresetState":${POISON}}`));
    expect(Object.getOwnPropertyNames(presets.normalizationPresetState)).toEqual([]);
    // 知らないキーは読まない（ホワイトリスト）
    const profile = parseDiffComparisonProfile(JSON.parse(`{"kind":"kintone-diff-comparison-profile","version":1,"name":"x","scopes":["appSettings"],"ignoreKeys":"","extra":${POISON}}`));
    expect(Object.keys(profile)).not.toContain('extra');
  });

  it('差分の比較と出力（HTML・Excel・AI向けMarkdown・設計書Markdown）', () => {
    const source = pickSettingsBundle(JSON.parse(poisonedBundleText('1', '旧')), { appId: '1', sections: scopes });
    const target = pickSettingsBundle(JSON.parse(poisonedBundleText('2', '新')), { appId: '2', sections: scopes });
    const result = computeDiffRows(source, target, scopes, '__proto__, constructor*, *.prototype.*');
    const rows = enrichDiffRows(result.rows, source, target);
    expect(rows.length).toBeGreaterThan(0);
    for (const exportContentMode of ['diffOnly', 'withCompared']) {
      buildDiffHtml(source, target, rows, scopes, '', { exportContentMode, fetchIssues: result.fetchIssues, truncation: result.truncation });
    }
    for (const audience of ['customer', 'internal'] as const) {
      buildDiffXlsxSheets({ audience, rows, sourceBundle: source, targetBundle: target, scopes, fetchIssues: result.fetchIssues } as any);
    }
    buildDiffMarkdownExport({ rows, sourceBundle: source, targetBundle: target, scopes } as any);
    bundleToMarkdown(source);
  });

  it('設計書（スナップショット・AI向けMarkdown・機微な値の除外）', () => {
    const bundle = JSON.parse(poisonedBundleText('1', '旧'));
    const stripped = stripSensitiveSupplements(bundle);
    buildDesignSnapshot(bundle);
    buildDesignAiMarkdown({ bundle: stripped.bundle, bundles: [stripped.bundle], snapshot: buildDesignSnapshot(stripped.bundle) });
  });

  it('設定JSONから作る ER図・設計書 HTML・差分比較の ZIP 取込（11/28 に足した入口）', async () => {
    const source = buildErOfflineSource(JSON.parse(`{"apps": [${poisonedBundleText('1', '旧')}, ${poisonedBundleText('2', '新')}], "__proto__": {"polluted": "apps"}}`), '__proto__.json');
    expect(source.appIds).toEqual([1, 2]);
    const models = source.appIds.map((appId) => buildErModelFromOfflineSource(source, appId));
    expect(models.map((model) => model?.id)).toEqual([1, 2]);
    listOfflineSpaceApps(source, '__proto__');
    buildHTML(models, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'full', source: {}, offlineSource: source });
    expect(buildDesignHtml(JSON.parse(poisonedBundleText('1', '旧')), { appNames: JSON.parse(POISON) })).toContain('アプリ旧');
    const zip = new LiteZip();
    zip.file('manifest.json', `{"apps": [{"file": "__proto__.json"}], "__proto__": {"polluted": "manifest"}}`);
    zip.file('__proto__.json', poisonedBundleText('1', '旧'));
    zip.file('constructor/prototype.json', poisonedBundleText('2', '新'));
    const bytes = new Uint8Array(await (await zip.generateAsync({ type: 'blob' })).arrayBuffer());
    const files = await readDiffBatchZipFiles(bytes, '__proto__.zip');
    expect(files.files.map((file) => file.relativePath)).toEqual(['__proto__.zip/manifest.json', '__proto__.zip/__proto__.json', '__proto__.zip/constructor/prototype.json']);
    parseDiffBatchFolderImport(files.files, { side: 'source' });
  });

  it('lite にしかない入口: 設定JSONの束から作る ER図（buildErAppModelFromBundle）と、設定JSONから作るプロセス管理仕様書・一括の overview.md', () => {
    const bundles = [JSON.parse(poisonedBundleText('1', '旧')), JSON.parse(poisonedBundleText('2', '新'))];
    const apps = bundles.map((bundle) => buildErAppModelFromBundle(bundle));
    expect(apps.map((app) => app.id)).toEqual([1, 2]);
    buildErMarkdownSpec(apps, {} as any);
    const status = extractOfflineProcessStatusData({ importedBundle: bundles[0] });
    expect(Object.prototype.hasOwnProperty.call(status.states, '__proto__')).toBe(true);
    expect(buildProcessSpecMarkdown({ appId: '1', appName: '__proto__', states: status.states, actions: status.actions })).toContain('| __proto__ |');
    formatProcessSimulationHistory([{ from: '__proto__', action: '__proto__', to: 'constructor' }], 'constructor', status.states);
    buildProcessBatchOverviewMarkdown([{ appId: '1', guestId: '', appName: '__proto__', outcome: 'enabled', stateCount: 2, actionCount: 1, warnings: [], reason: '', file: '__proto__.mmd', states: status.states, actions: status.actions }], JSON.parse(`{"__proto__.mmd": "stateDiagram-v2", "__proto__": {"polluted": "sources"}}`), { generatedAt: 'x', preview: false, cancelled: false, total: 1 });
  });

  it('ER図（モデル・HTML・Mermaid・Markdown・CSV）', () => {
    const bundle = JSON.parse(poisonedBundleText('1', '旧'));
    const app = buildErAppModel({
      appId: '1',
      fieldsResponse: bundle.sections.fieldSettings,
      appInfoResponse: JSON.parse(`{"appId":"1","name":"__proto__","spaceId":null,"__proto__":{"polluted":"info"}}`),
      actionsResponse: bundle.sections.actionSettings
    });
    const apps = [app, { ...app, id: 9, name: 'constructor', relations: [] }];
    buildHTML(apps, { startAppId: '1', startAppIds: ['1'], layoutName: 'dagre', fieldDensity: 'full', source: {} });
    buildErMermaidSource(apps, { showAllFields: true });
    buildErMarkdownSpec(apps, {} as any);
    buildErRelationsCsv(apps);
  });
});

describe('lite-suite の書き込み系ツールが読む入力の __proto__ / constructor / prototype でプロトタイプを汚さない', () => {
  it('プレビュー反映: 設定JSONを反映元にした計画と、反映プリセットの読み込み', () => {
    const source = pickSettingsBundle(JSON.parse(poisonedBundleText('1', '旧')), { side: 'source', appId: '1', rawSettings: true });
    const target = pickSettingsBundle(JSON.parse(poisonedBundleText('2', '新')), { side: 'source', appId: '2', rawSettings: true });
    for (const key of REFLECT_SECTION_KEYS) buildReflectSectionPlan(key, source.sections?.[key], target.sections?.[key], { lookupMap: JSON.parse(POISON) });
    const presets = normalizeImportedReflectPresets(JSON.parse(`{"kind":"reflect-presets","presets":[{"name":"__proto__","source":${POISON},"target":${POISON},"scopes":["__proto__","constructor"]}],"__proto__":{"polluted":"x"}}`));
    expect(presets.presets).toHaveLength(1);
  });

  it('フィールド追加: フィールドJSON・参照先変換の JSON と計画', () => {
    const props = parseFieldJsonInput(`{"properties":{"__proto__":${field('__proto__', 'a')},"constructor":${field('constructor', 'b')},"prototype":${field('prototype', 'c')}}}`);
    // 参照先変換のキー・値は正の整数だけを受け付けるので、__proto__ などのキーは理由を示して止める
    expect(() => parseLookupMapInput(POISON)).toThrow(/正の整数/);
    const lookupMap = parseLookupMapInput('{"10":"20"}');
    planFieldApply(props, JSON.parse(`{"constructor":${field('constructor', 'old')}}`), lookupMap, true);
  });

  it('本番反映: 選択と修正の保存ファイル', () => {
    parseSelectionFile(`{"kind":"kintone-source-deploy-selection","version":1,"createdAt":"x","source":${POISON},"target":${POISON},"scopes":[],"lookupMap":${POISON},"sections":[{"sectionKey":"__proto__","label":"x","selected":[],"notSelected":[],"overrides":[{"pointer":"/__proto__/polluted","value":"x"}]}],"__proto__":{"polluted":"file"}}`);
  });

  it('レコード: CSV取込の計画とレコードコピーの送る内容', () => {
    const properties = JSON.parse(`{"__proto__":{"type":"SINGLE_LINE_TEXT","code":"__proto__","label":"p"},"name":{"type":"SINGLE_LINE_TEXT","code":"name","label":"n"}}`);
    expect(() => planCsvImport(parseCsvText('constructor,name\r\nx,y\r\n'), properties)).toThrow(/存在しないフィールドコード/);
    const planned = planCsvImport(parseCsvText('__proto__,name\r\nx,y\r\n'), properties);
    expect(Object.keys(planned.records[0])).toEqual(['__proto__', 'name']);
    const copy = buildCopyRecordPayloads([JSON.parse(`{"__proto__":{"type":"SINGLE_LINE_TEXT","value":"x"},"constructor":{"type":"SINGLE_LINE_TEXT","value":"y"},"$id":{"type":"__ID__","value":"1"}}`)], properties);
    expect(copy.records).toHaveLength(1);
  });
});
