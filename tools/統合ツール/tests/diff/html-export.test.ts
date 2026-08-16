import { describe, expect, it } from 'vitest';
import {
  buildDiffExportPayload,
  buildDiffHtml,
  buildDiffWarningInfo,
  buildPatchPayload,
  selectDiffHtmlRowsForExport
} from '../../src/diff/export';
import { buildDiffHtmlStandaloneExport } from '../../src/tabs/diff-export-standalone';

function extractInlineScript(html: string): string {
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error('inline report script was not found');
  return match[1];
}

describe('diff/html export', () => {
  it('preserves partial comparison issues in warning totals and JSON metadata', () => {
    const partialIssues = [{
      sectionKey: 'customizeSettings',
      section: 'JS/CSS',
      side: 'source',
      message: '一部ファイルは本文比較を省略し、fileKey で比較します',
      files: [{ fileName: 'large.js', fileKey: 'large-key', reason: 'oversize', byteSize: 2 * 1024 * 1024 }]
    }];
    const warning = buildDiffWarningInfo([], [], partialIssues);

    expect(warning).toMatchObject({
      diffCount: 0,
      issueCount: 0,
      partialIssueCount: 1,
      total: 1
    });

    const payload = buildDiffExportPayload({
      sourceBundle: { appId: '1', sections: {} },
      targetBundle: { appId: '2', sections: {} },
      rows: [],
      fetchIssues: [],
      partialIssues
    });

    expect(payload.summary).toMatchObject({
      fetchIssueCount: 0,
      partialIssueCount: 1,
      incompleteComparison: true
    });
    expect(payload.partialIssues).toEqual(partialIssues);
    expect(payload.sectionSummaries).toContainEqual(expect.objectContaining({
      sectionKey: 'customizeSettings',
      partialIssueCount: 1
    }));
  });

  it('emits syntactically valid inline script for the standalone report', () => {
    const sourceBundle = {
      appId: '1',
      guestId: '',
      preview: false,
      sections: {
        fieldSettings: {
          properties: {
            field_a: { code: 'field_a', label: '旧ラベル', type: 'SINGLE_LINE_TEXT' }
          }
        },
        layoutSettings: { layout: [] }
      },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2',
      guestId: '',
      preview: false,
      sections: {
        fieldSettings: {
          properties: {
            field_a: { code: 'field_a', label: '新ラベル', type: 'SINGLE_LINE_TEXT' }
          }
        },
        layoutSettings: { layout: [] }
      },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const rows = [{
      _id: 'row-1',
      sectionKey: 'fieldSettings',
      section: 'フィールド',
      type: 'changed',
      path: 'fieldSettings.properties.field_a.label',
      left: '旧ラベル',
      right: '新ラベル',
      severity: 'low'
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings'], '', {});

    expect(() => new Function(extractInlineScript(html))).not.toThrow();
  });

  it('drops severity/importance UI and exposes the new comparison controls', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {});

    // 重要度（severity）などの抽象指標は UI から除去されている
    expect(html).not.toContain('data-severity-chip');
    expect(html).not.toContain('全重要度');
    expect(html).not.toContain('.meta-tag.sev-high');
    expect(html).not.toContain('重要度が高い順');

    // 素のJSON比較・確認済み・CSV/MD 出力・確認済み統計を追加
    expect(html).toContain('id="rawJson"');
    expect(html).toContain('id="hideReviewed"');
    expect(html).toContain('id="csvBtn"');
    expect(html).toContain('id="mdBtn"');
    expect(html).toContain('id="stat-reviewed"');

    // 選択差分→反映JSON・比較元/比較先JSON出力・選択統計
    expect(html).toContain('id="reflectJsonBtn"');
    expect(html).toContain('id="reflectJsonCopyBtn"');
    expect(html).toContain('id="srcJsonBtn"');
    expect(html).toContain('id="tgtJsonBtn"');
    expect(html).toContain('id="stat-selected"');

    // KV差分色付けと関連レコード一覧設定の日本語キーラベル
    const script = extractInlineScript(html);
    expect(html).toContain('tr.kv-add>td');
    expect(script).toContain('SETTING_KEY_LABELS');
    expect(script).toContain('renderSettingKvTable');

    // 英語見出しの日本語化
    expect(html).not.toContain('Visual Diff / Settings Review');
    expect(html).not.toContain('Kintone Settings Diff');
    expect(html).not.toContain('Field Detail Popup');
  });

  it('provides keyboard-operable tabs and modal focus management', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, [], ['fieldSettings'], '', {});
    const script = extractInlineScript(html);

    expect(html).toContain('aria-controls="reportPaneDiff"');
    expect(html).toContain('role="tabpanel" aria-labelledby="reportTabDiff"');
    expect(html).toContain('aria-describedby="fieldDetailModalSub" tabindex="-1"');
    expect(script).toContain("'ArrowLeft', 'ArrowRight', 'Home', 'End'");
    expect(script).toContain("e.key === 'Tab' && detailModalOpen");
    expect(script).toContain('fieldDetailReturnFocus');
    expect(() => new Function(script)).not.toThrow();
  });

  it('colors differing keys inside the reference-table key/value snapshot', () => {
    const referenceTableSrc = {
      condition: { field: '物件ID', relatedField: '子会社ID' },
      displayFields: ['会社名', '住所'],
      relatedApp: { app: '475', code: '' },
      size: '5',
      sort: 'レコード番号 desc'
    };
    const referenceTableTgt = {
      condition: { field: '保有会社選択', relatedField: '子会社ID' },
      displayFields: ['会社名', '住所'],
      relatedApp: { app: '471', code: '' },
      size: '5',
      sort: '子会社ID asc'
    };
    const mkBundle = (appId: string, referenceTable: any) => ({
      appId, guestId: '', preview: false,
      sections: { fieldSettings: { properties: {
        保有会社情報: { code: '保有会社情報', label: '保有会社情報', type: 'REFERENCE_TABLE', referenceTable }
      } }, layoutSettings: { layout: [] } },
      meta: { sectionRevisions: { fieldSettings: appId } }
    });
    const rows = [{
      _id: 'r1', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.保有会社情報.referenceTable.relatedApp.app',
      left: '475', right: '471', severity: 'low'
    }];
    const html = buildDiffHtml(
      mkBundle('475', referenceTableSrc),
      mkBundle('471', referenceTableTgt),
      rows, ['fieldSettings'], '', {}
    );
    const script = extractInlineScript(html);
    // 埋め込みスクリプトは有効な JS のまま
    expect(() => new Function(script)).not.toThrow();
    // 関連レコード一覧設定のキーは日本語ラベルへ変換される
    expect(script).toContain('参照するアプリ');
    expect(script).toContain('表示条件（フィールドの一致）');
  });

  it('embeds both compared bundles and the field-unit JSON compare / reflect helpers', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: '旧', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', type: 'LIST', index: '0' } } }
      },
      meta: { sectionRevisions: { fieldSettings: '1' } }
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { field_a: { code: 'field_a', label: '新', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', type: 'LIST', index: '1' } } }
      },
      meta: { sectionRevisions: { fieldSettings: '2' } }
    };
    const rows = [{
      _id: 'row-1', sectionKey: 'fieldSettings', section: 'フィールド', type: 'changed',
      path: 'fieldSettings.properties.field_a.label', left: '旧', right: '新', severity: 'low'
    }];
    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'viewSettings'], '', {});
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    // 作成時に利用した両アプリのセクションデータが埋め込まれている
    expect(script).toContain('const SOURCE_SECTIONS');
    expect(script).toContain('const TARGET_SECTIONS');
    // フィールド単位のWinMerge風JSON比較と反映JSONビルダー
    expect(script).toContain('buildFieldJsonGroups');
    expect(script).toContain('renderFieldJsonBlockHtml');
    expect(script).toContain('buildReflectJson');
    expect(script).toContain('const TARGET_PREVIEW_API_PREFIX = "/k/v1/preview";');
    expect(script).toContain("TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json'");
    // フィールド単位ビューにも種別チップの絞り込みがある
    expect(script).toContain('data-field-status-chip');
    // フィールド詳細ポップアップの下部にあった「設定差分」リストは撤去済み
    expect(script).not.toContain('<h3>設定差分</h3>');
  });

  it('builds a valid evidence report when the comparison has zero differences', () => {
    const sections = { fieldSettings: { properties: {} }, layoutSettings: { layout: [] } };
    const output = buildDiffHtmlStandaloneExport({
      rows: [],
      fetchIssues: [],
      sourceBundle: { appId: '101', guestId: '', preview: false, sections, meta: {} },
      targetBundle: { appId: '202', guestId: '', preview: false, sections, meta: {} },
      scopes: ['fieldSettings'],
      ignoreKeys: '',
      normalizationPresetState: {}
    });

    expect(output.filename).toMatch(/\.html$/);
    expect(output.html).toContain('差分 <b>0件</b>');
    expect(output.html).toContain('アプリ 101');
    expect(output.html).toContain('アプリ 202');
    expect(() => new Function(extractInlineScript(output.html))).not.toThrow();
  });

  it('adds the same-section evidence row when object key insertion order differs', () => {
    const fieldA = { code: 'field_a', label: 'フィールドA', type: 'SINGLE_LINE_TEXT' };
    const fieldB = { code: 'field_b', label: 'フィールドB', type: 'NUMBER' };
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { field_a: fieldA, field_b: fieldB } } },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: { field_b: fieldB, field_a: fieldA } } },
      meta: {}
    };

    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {});
    const script = extractInlineScript(html);

    expect(html).toContain('差分 <b>0件</b>');
    expect(html).toContain('id="stat-same">1</b>');
    expect(script).toContain('"_id":"same:fieldSettings"');
  });

  it('uses the completed engine result to preserve same evidence after ignored metadata differences', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { revision: '10', properties: {} } }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { revision: '11', properties: {} } }, meta: {}
    };

    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {
      fetchIssues: [],
      truncation: null
    });

    expect(html).toContain('id="stat-same">1</b>');
    expect(extractInlineScript(html)).toContain('"_id":"same:fieldSettings"');
  });

  it('does not duplicate internal fetch caches or plugin config in an identical-section report', () => {
    const bodySecret = 'INTERNAL_BODY_SHOULD_NOT_BE_EMBEDDED';
    const pluginSecret = 'INTERNAL_PLUGIN_CONFIG_SHOULD_NOT_BE_EMBEDDED';
    const sections = {
      customizeSettings: {
        scope: 'ALL',
        desktop: {
          js: [{
            type: 'FILE',
            file: { fileKey: 'same-key', name: 'same.js' },
            _bodyText: bodySecret,
            _bodyHash: 'deadbeef',
            _bodyUnavailable: 'oversize'
          }],
          css: []
        },
        mobile: { js: [], css: [] },
        _partial: { kind: 'customizeBody', message: 'internal metadata' }
      },
      pluginSettings: {
        plugins: [{ id: 'plugin-1', _config: { token: pluginSecret } }]
      }
    };
    const sourceBundle = { appId: '1', guestId: '', preview: false, sections, meta: {} };
    const targetBundle = { appId: '2', guestId: '', preview: false, sections: structuredClone(sections), meta: {} };

    const html = buildDiffHtml(
      sourceBundle,
      targetBundle,
      [],
      ['customizeSettings', 'pluginSettings'],
      '',
      { fetchIssues: [], truncation: null }
    );

    expect(html).not.toContain(bodySecret);
    expect(html).not.toContain(pluginSecret);
    expect(html).not.toContain('"_bodyText"');
    expect(html).not.toContain('"_config"');
    expect(html).toContain('"_id":"same:customizeSettings"');
    expect(html).toContain('"_id":"same:pluginSettings"');
  });

  it('sanitizes one-sided supplemental caches without deleting valid underscore-named fields', () => {
    const bodySecret = 'ONE_SIDED_BODY_CACHE_SHOULD_NOT_BE_EMBEDDED';
    const pluginSecret = 'ONE_SIDED_PLUGIN_CACHE_SHOULD_NOT_BE_EMBEDDED';
    const fieldSettings = {
      properties: {
        _body: { code: '_body', label: 'KEEP_BODY_FIELD', type: 'SINGLE_LINE_TEXT' },
        _config: { code: '_config', label: 'KEEP_CONFIG_FIELD', type: 'SINGLE_LINE_TEXT' }
      }
    };
    const customizeSettings = {
      scope: 'ALL',
      desktop: {
        js: [{
          type: 'FILE',
          file: { fileKey: 'kept-file-key', name: 'one-sided.js' },
          _bodyText: bodySecret,
          _bodyHash: 'deadbeef'
        }],
        css: []
      },
      mobile: { js: [], css: [] }
    };
    const pluginSettings = {
      plugins: [{ id: 'kept-plugin-id', _config: { token: pluginSecret } }]
    };
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: structuredClone(fieldSettings), customizeSettings, pluginSettings }, meta: {}
    };
    const rows = [{
      _id: 'customize-added', sectionKey: 'customizeSettings', section: 'JS/CSS', type: 'added',
      path: 'customizeSettings', left: undefined, right: customizeSettings
    }, {
      _id: 'plugin-added', sectionKey: 'pluginSettings', section: 'プラグイン', type: 'added',
      path: 'pluginSettings', left: undefined, right: pluginSettings
    }];

    const html = buildDiffHtml(
      sourceBundle,
      targetBundle,
      rows,
      ['fieldSettings', 'customizeSettings', 'pluginSettings'],
      '',
      { fetchIssues: [], truncation: null }
    );

    expect(html).not.toContain(bodySecret);
    expect(html).not.toContain(pluginSecret);
    expect(html).toContain('kept-file-key');
    expect(html).toContain('kept-plugin-id');
    expect(html).toContain('KEEP_BODY_FIELD');
    expect(html).toContain('KEEP_CONFIG_FIELD');
    expect(html).toContain('共有先と保管場所を確認してください');
    expect(sourceBundle.sections).not.toHaveProperty('customizeSettings');
    expect(targetBundle.sections.customizeSettings.desktop.js[0]._bodyText).toBe(bodySecret);
    expect(targetBundle.sections.pluginSettings.plugins[0]._config.token).toBe(pluginSecret);
  });

  it('keeps fetch failures in report metadata without leaking the section scratch value', () => {
    const scratchError = 'FIELD_FETCH_SCRATCH_SHOULD_NOT_BE_EMBEDDED';
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { _fetchError: scratchError } }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const html = buildDiffHtml(sourceBundle, targetBundle, [], ['fieldSettings'], '', {
      fetchIssues: [{ sectionKey: 'fieldSettings', section: 'フィールド設定', side: 'source', message: 'HTTP 403' }],
      truncation: null
    });

    expect(html).not.toContain(scratchError);
    expect(html).toContain('API取得失敗 1件');
    expect(html).toContain('HTTP 403');
    expect(extractInlineScript(html)).toContain('"fetchIssues"');
  });

  it('does not synthesize same evidence for a scope where diff collection was truncated', () => {
    const bundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const html = buildDiffHtml(bundle, { ...bundle, appId: '2' }, [], ['fieldSettings'], '', {
      fetchIssues: [],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        sections: [{ sectionKey: 'fieldSettings', section: 'フィールド設定' }]
      }
    });

    expect(html).toContain('id="stat-same">0</b>');
    expect(extractInlineScript(html)).not.toContain('"_id":"same:fieldSettings"');
  });

  it('does not call an omitted scope identical in a filtered export', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { a: { code: 'a', label: '旧', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', index: '0', type: 'LIST' } } }
      }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: { a: { code: 'a', label: '新', type: 'SINGLE_LINE_TEXT' } } },
        viewSettings: { views: { 一覧: { name: '一覧', index: '1', type: 'LIST' } } }
      }, meta: {}
    };
    const filteredRows = [{
      _id: 'field-only', sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'changed',
      path: 'fieldSettings.properties.a.label', left: '旧', right: '新'
    }];

    const html = buildDiffHtml(
      sourceBundle,
      targetBundle,
      filteredRows,
      ['fieldSettings', 'viewSettings'],
      '',
      { fetchIssues: [], truncation: null, exportMode: 'filtered', exportLabel: '表示中' }
    );

    const script = extractInlineScript(html);
    expect(script).toContain('"exportMode":"filtered"');
    expect(script).not.toContain('"_id":"same:viewSettings"');
    expect(html).toContain('差分 <b>1件</b>');
  });

  it('makes offline reflect JSON safety, incompleteness, and guest API routing explicit', () => {
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: {
        fieldSettings: { properties: {} },
        processSettings: { states: {}, actions: [] }
      },
      meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '88', preview: true,
      sections: {
        fieldSettings: { properties: { target_only: { code: 'target_only', label: '比較先のみ', type: 'SINGLE_LINE_TEXT' } } },
        processSettings: { enable: true, states: {}, actions: [] }
      },
      meta: {}
    };
    const rows = [{
      _id: 'target-only', sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'added',
      path: 'fieldSettings.properties.target_only', left: undefined,
      right: targetBundle.sections.fieldSettings.properties.target_only
    }, {
      _id: 'display-only', sectionKey: 'processSettings', section: 'プロセス管理', type: 'changed',
      path: 'processSettings.states.__rename__', left: { name: '旧' }, right: { name: '新' }, _displayOnly: true
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'processSettings'], '', {
      fetchIssues: [{ sectionKey: 'appSettings', section: 'アプリ設定', side: 'source', message: '403' }],
      partialIssues: [{ sectionKey: 'customizeSettings', section: 'JS/CSS', side: 'target', message: 'oversize' }],
      truncation: { truncated: true, diffLimit: 1000, sections: [{ sectionKey: 'fieldSettings' }] }
    });
    const script = extractInlineScript(html);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('const TARGET_PREVIEW_API_PREFIX = "/k/guest/88/v1/preview";');
    expect(script).toContain("row.type !== 'same' && !row._displayOnly");
    expect(script).toContain('if (!row || row._displayOnly || row.type === \'same\') return;');
    expect(script).toContain('replacesEntireSection');
    expect(script).toContain('destructive');
    expect(script).toContain('warnings: warnings');
    expect(script).toContain('requiresExplicitDeleteOptIn: true');
    expect(script).toContain('const FIELD_REFLECT_BATCH_LIMIT = 100;');
    expect(script).toContain('buildPluginReflectRequests');
    expect(script).toContain('比較元のみのプラグインだけを追加します');
    expect(script).toContain('/^[\\t\\r\\n ]*[=+\\-@]/');
    expect(script).toContain('method: null');
    expect(script).not.toContain("method: 'DELETE', api: TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json'");
    expect(script).toContain('if (sec && sec.enable !== undefined) p.enable = sec.enable;');
    expect(script).not.toContain('enable: !!(sec && sec.enable)');
    expect(script).toContain('"incompleteComparison":true');
    expect(script).toContain('"partialIssueCount":1');
    expect(html).toContain('本文未検証 1件');
  });

  it('preserves severity in the exported patch rows', () => {
    const payload = buildPatchPayload([{
      sectionKey: 'appAcl', section: 'アプリのアクセス権', type: 'changed',
      path: 'appAcl.rights[0].accessibility', left: 'READ', right: 'WRITE', severity: 'high'
    }], { appId: '1', sections: {} }, { appId: '2', sections: {} });

    expect(payload.sections['アプリのアクセス権'][0].severity).toBe('high');
  });

  it('calls out process state rename notices even when they are excluded from actionable counts', () => {
    const sourceBundle = { appId: '1', guestId: '', preview: false, sections: { processSettings: {} }, meta: {} };
    const targetBundle = { appId: '2', guestId: '', preview: false, sections: { processSettings: {} }, meta: {} };
    const rows = [{
      _id: 'rename-1',
      sectionKey: 'processSettings',
      section: 'プロセス管理',
      type: 'changed',
      path: 'processSettings.states.__rename__',
      left: { name: '未処理' },
      right: { name: '受付' },
      _displayOnly: true,
      _stateRenameNotice: true
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['processSettings'], '', {});
    expect(html).toContain('プロセスの状態名変更候補が 1 件あります');
    expect(html).toContain('追加・削除・変更件数には含めていません');
  });

  it('prioritizes actual differences over display-only helpers and same rows', () => {
    const selection = selectDiffHtmlRowsForExport([
      { _id: 'display-1', type: 'added', _displayOnly: true },
      { _id: 'same-1', type: 'same' },
      { _id: 'display-2', type: 'removed', _displayOnly: true },
      { _id: 'actual-late', type: 'changed' },
      { _id: 'display-3', type: 'added', _displayOnly: true }
    ], 3);

    expect(selection.rows.map((row) => row._id)).toEqual(['display-1', 'display-2', 'actual-late']);
    expect(selection.summary.policy).toBe('actualDiff > displayOnly > same');
    expect(selection.summary.categories.actualDiff).toEqual({ total: 1, rendered: 1, omitted: 0 });
    expect(selection.summary.categories.displayOnly).toEqual({ total: 3, rendered: 2, omitted: 1 });
    expect(selection.summary.categories.same).toEqual({ total: 1, rendered: 0, omitted: 1 });
  });

  it('warns when display-row expansion exceeds the HTML report limit without dropping a later actual difference', () => {
    const fields = Object.fromEntries(Array.from({ length: 2000 }, (_, index) => {
      const code = `child_${index}`;
      return [code, { code, label: code, type: 'SINGLE_LINE_TEXT' }];
    }));
    const sourceBundle = {
      appId: '1', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const targetBundle = {
      appId: '2', guestId: '', preview: false,
      sections: { fieldSettings: { properties: {} } }, meta: {}
    };
    const rows = [{
      _id: 'table-parent', sectionKey: 'fieldSettings', section: 'フィールド', type: 'added',
      path: 'fieldSettings.properties.table_a', left: undefined,
      right: { code: 'table_a', label: 'テーブルA', type: 'SUBTABLE', fields }, severity: 'medium'
    }, {
      _id: 'actual-late', sectionKey: 'viewSettings', section: 'ビュー', type: 'changed',
      path: 'viewSettings.views.list.index', left: '0', right: '1', severity: 'low'
    }];

    const html = buildDiffHtml(sourceBundle, targetBundle, rows, ['fieldSettings', 'viewSettings'], '', {});

    expect(html).toContain('表示用展開後 2002 件のうち 2000 件を収録し、2 件を省略しました');
    expect(html).toContain('省略: 実差分 0 件 / 表示専用の補助行 2 件 / 同一行 0 件');
    expect(html).toContain('actual-late');
    expect(html).not.toContain('このレポートは不完全です');
  });
});
