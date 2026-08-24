import { describe, it, expect } from 'vitest';
import {
  detectRowSeverity, isIgnoredKey, parseIgnoreRules,
  hasUniquePrimitiveKey, computeDiffRows,
  isNotationOnlyChange, isEmptyLikeValue,
  countActualDiffRows, countActionableDiffRows,
  detectProcessStateRenames, hasIncompleteActualDiffTruncation, summarizeRows,
  encodeExactIgnorePathRule, decodeExactIgnorePathRule, isAppReferenceIdPath
} from '../../src/diff/engine';

function makeBundle(sections: Record<string, any>) {
  return { sections };
}

function diffRows(sourceSections: Record<string, any>, targetSections: Record<string, any>, sections: string[]) {
  const { rows } = computeDiffRows(makeBundle(sourceSections), makeBundle(targetSections), sections, '');
  return rows.filter((r: any) => r.type !== 'same');
}

describe('diff/engine', () => {
  describe('detectRowSeverity', () => {
    it('returns low for simple decoration changes', () => {
      const row = { sectionKey: 'fieldSettings', path: 'fieldSettings.width', type: 'changed' };
      expect(detectRowSeverity(row)).toBe('low');
    });

    it('returns high for ACL downgrade (true -> false)', () => {
      const row = { sectionKey: 'appAcl', path: 'appAcl.recordViewable', type: 'changed', left: true, right: false };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns medium for ACL upgrade (false -> true)', () => {
      const row = { sectionKey: 'appAcl', path: 'appAcl.recordViewable', type: 'changed', left: false, right: true };
      expect(detectRowSeverity(row)).toBe('medium');
    });

    it('returns high for HIGH_IMPACT_SECTIONS removal', () => {
      const row = { sectionKey: 'fieldSettings', path: 'fieldSettings.code1', type: 'removed' };
      expect(detectRowSeverity(row)).toBe('high');
    });
  });

  describe('parseIgnoreRules & isIgnoredKey', () => {
    it('does not hide identifiers unless the user or a normalization preset asks for it', () => {
      const rules = parseIgnoreRules('');
      expect(isIgnoredKey(rules, 'id')).toBe(false);
      expect(isIgnoredKey(rules, 'appId')).toBe(false);
      expect(isIgnoredKey(rules, 'revision')).toBe(true);
    });

    it('parses comma separated ignore keys', () => {
      const rules = parseIgnoreRules('id, name, revision');
      expect(isIgnoredKey(rules, 'id')).toBe(true);
      expect(isIgnoredKey(rules, 'name')).toBe(true);
      expect(isIgnoredKey(rules, 'revision')).toBe(true);
      expect(isIgnoredKey(rules, 'code')).toBe(false);
    });

    it('supports wildcard patterns', () => {
      const rules = parseIgnoreRules('test_*');
      expect(isIgnoredKey(rules, 'test_abc')).toBe(true);
      expect(isIgnoredKey(rules, 'test_123')).toBe(true);
      expect(isIgnoredKey(rules, 'other_test')).toBe(false);
    });

    it('keeps spaces inside an exact path rule instead of splitting the entity name', () => {
      const source = makeBundle({ viewSettings: { views: {
        '営業 一覧': { name: '営業 一覧', filterCond: 'a = 1' },
        '営業一覧': { name: '営業一覧', filterCond: 'b = 1' }
      } } });
      const target = makeBundle({ viewSettings: { views: {
        '営業 一覧': { name: '営業 一覧', filterCond: 'a = 2' },
        '営業一覧': { name: '営業一覧', filterCond: 'b = 2' }
      } } });
      const result = computeDiffRows(source, target, ['viewSettings'], 'viewSettings.views.営業 一覧.filterCond');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].path).toBe('viewSettings.views.営業一覧.filterCond');
    });

    it('treats a root section name as an exact path instead of a global leaf key', () => {
      const rules = parseIgnoreRules('pluginSettings');
      expect(rules.pathSet.has('pluginsettings')).toBe(true);
      expect(isIgnoredKey(rules, 'pluginSettings')).toBe(false);
    });

    it('encodes UI-selected paths as case-sensitive literals instead of wildcard patterns', () => {
      const selectedPath = 'viewSettings.views.Sales*View, East.filterCond';
      const rule = encodeExactIgnorePathRule(selectedPath);
      expect(decodeExactIgnorePathRule(rule)).toBe(selectedPath);

      const source = makeBundle({ viewSettings: { views: {
        'Sales*View, East': { name: 'Sales*View, East', filterCond: 'a = 1' },
        'SalesWestView, East': { name: 'SalesWestView, East', filterCond: 'b = 1' },
        'sales*view, East': { name: 'sales*view, East', filterCond: 'c = 1' }
      } } });
      const target = makeBundle({ viewSettings: { views: {
        'Sales*View, East': { name: 'Sales*View, East', filterCond: 'a = 2' },
        'SalesWestView, East': { name: 'SalesWestView, East', filterCond: 'b = 2' },
        'sales*view, East': { name: 'sales*view, East', filterCond: 'c = 2' }
      } } });
      const result = computeDiffRows(source, target, ['viewSettings'], rule);
      expect(result.rows.map((row: any) => row.path)).toEqual([
        'viewSettings.views.SalesWestView, East.filterCond',
        'viewSettings.views.sales*view, East.filterCond'
      ]);
    });
  });

  describe('entity identifier container ignore collisions', () => {
    const cases = [
      {
        label: 'top-level field',
        section: 'fieldSettings',
        source: { properties: { revision: { type: 'SINGLE_LINE_TEXT', code: 'revision' } } },
        target: { properties: {} },
        expectedPath: 'fieldSettings.properties.revision'
      },
      {
        label: 'subtable field',
        section: 'fieldSettings',
        source: {
          properties: {
            table: {
              type: 'SUBTABLE',
              code: 'table',
              fields: { revision: { type: 'SINGLE_LINE_TEXT', code: 'revision' } }
            }
          }
        },
        target: {
          properties: {
            table: { type: 'SUBTABLE', code: 'table', fields: {} }
          }
        },
        expectedPath: 'fieldSettings.properties.table.fields.revision'
      },
      {
        label: 'view',
        section: 'viewSettings',
        source: { views: { revision: { type: 'LIST', name: 'revision' } } },
        target: { views: {} },
        expectedPath: 'viewSettings.views.revision'
      },
      {
        label: 'report',
        section: 'reportSettings',
        source: { reports: { revision: { name: 'revision' } } },
        target: { reports: {} },
        expectedPath: 'reportSettings.reports.revision'
      },
      {
        label: 'process state',
        section: 'processSettings',
        source: { enable: true, states: { revision: { name: 'revision', index: '0' } }, actions: [] },
        target: { enable: true, states: {}, actions: [] },
        expectedPath: 'processSettings.states.revision'
      },
      {
        label: 'category',
        section: 'categories',
        source: { categories: { revision: { name: 'revision' } } },
        target: { categories: {} },
        expectedPath: 'categories.categories.revision'
      }
    ];

    it.each(cases)('does not hide a $label named like a default ignored key', ({ section, source, target, expectedPath }) => {
      const rows = diffRows({ [section]: source }, { [section]: target }, [section]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ type: 'removed', path: expectedPath });
    });

    it('does not let a user leaf-only ignore hide an entity with that identifier', () => {
      const result = computeDiffRows(
        makeBundle({ viewSettings: { views: { name: { type: 'LIST' } } } }),
        makeBundle({ viewSettings: { views: {} } }),
        ['viewSettings'],
        'name'
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({ type: 'removed', path: 'viewSettings.views.name' });
    });

    it('still allows an entity to be ignored by its explicit full path', () => {
      const result = computeDiffRows(
        makeBundle({ fieldSettings: { properties: { revision: { type: 'SINGLE_LINE_TEXT', code: 'revision' } } } }),
        makeBundle({ fieldSettings: { properties: {} } }),
        ['fieldSettings'],
        'fieldSettings.properties.revision'
      );
      expect(countActualDiffRows(result.rows)).toBe(0);
    });

    it('still ignores a real revision property inside a field entity', () => {
      const source = { properties: { customer: { type: 'SINGLE_LINE_TEXT', code: 'customer', revision: '1' } } };
      const target = { properties: { customer: { type: 'SINGLE_LINE_TEXT', code: 'customer', revision: '2' } } };
      const rows = diffRows({ fieldSettings: source }, { fieldSettings: target }, ['fieldSettings']);
      expect(rows).toHaveLength(0);
    });
  });

  describe('customize fetch metadata', () => {
    it('does not report root partial-fetch metadata as a settings difference', () => {
      const source = { scope: 'ALL', _partial: { reason: 'oversize' } };
      const target = { scope: 'ALL' };
      expect(diffRows({ customizeSettings: source }, { customizeSettings: target }, ['customizeSettings'])).toHaveLength(0);
    });

    it('does not report file body availability metadata as a settings difference', () => {
      const source = {
        scope: 'ALL',
        desktop: { js: [{ type: 'FILE', name: 'app.js', file: { fileKey: 'same' }, _bodyUnavailable: 'oversize' }], css: [] },
        mobile: { js: [], css: [] }
      };
      const target = {
        scope: 'ALL',
        desktop: { js: [{ type: 'FILE', name: 'app.js', file: { fileKey: 'same' } }], css: [] },
        mobile: { js: [], css: [] }
      };
      expect(diffRows({ customizeSettings: source }, { customizeSettings: target }, ['customizeSettings'])).toHaveLength(0);
    });
  });

  describe('detectRowSeverity (non-field refinements)', () => {
    it('returns high when process management is turned off', () => {
      const row = { sectionKey: 'processSettings', path: 'processSettings.enable', type: 'changed', left: true, right: false };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns medium when process management is turned on', () => {
      const row = { sectionKey: 'processSettings', path: 'processSettings.enable', type: 'changed', left: false, right: true };
      expect(detectRowSeverity(row)).toBe('medium');
    });

    it('returns high for plugin removal', () => {
      const row = { sectionKey: 'pluginSettings', path: 'pluginSettings.plugins[2]', type: 'removed' };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns medium for plugin addition', () => {
      const row = { sectionKey: 'pluginSettings', path: 'pluginSettings.plugins[0]', type: 'added' };
      expect(detectRowSeverity(row)).toBe('medium');
    });

    it('returns high for plugin disabling', () => {
      const row = { sectionKey: 'pluginSettings', path: 'pluginSettings.plugins[0].enabled', type: 'changed', left: true, right: false };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns high for JS/CSS item removal', () => {
      const row = { sectionKey: 'customizeSettings', path: 'customizeSettings.desktop.js[1]', type: 'removed' };
      expect(detectRowSeverity(row)).toBe('high');
    });
  });

  describe('identifier differences', () => {
    it('keeps different plugin IDs as an addition and removal by default', () => {
      const rows = diffRows(
        { pluginSettings: { plugins: [{ id: 'plugin-a', name: '同名プラグイン', version: '1.0.0', enabled: true }] } },
        { pluginSettings: { plugins: [{ id: 'plugin-b', name: '同名プラグイン', version: '1.0.0', enabled: true }] } },
        ['pluginSettings']
      );

      expect(rows).toHaveLength(2);
      expect(rows.map((row: any) => row.type).sort()).toEqual(['added', 'removed']);
      expect(rows.every((row: any) => row.arrayKey === 'id')).toBe(true);
    });

    it('still allows ID differences to be explicitly ignored', () => {
      const result = computeDiffRows(
        makeBundle({ pluginSettings: { plugins: [{ id: 'plugin-a', name: '同名プラグイン', version: '1.0.0' }] } }),
        makeBundle({ pluginSettings: { plugins: [{ id: 'plugin-b', name: '同名プラグイン', version: '1.0.0' }] } }),
        ['pluginSettings'],
        'id'
      );
      expect(countActualDiffRows(result.rows)).toBe(0);
    });
  });

  describe('comparison target and reference app ID normalization', () => {
    it('recognizes only the supported semantic app ID paths', () => {
      expect([
        'appInfo.appId',
        'fieldSettings.properties.customer.lookup.relatedApp.app',
        'fieldSettings.properties.table.fields.customer.lookup.relatedApp.appId',
        'fieldSettings.properties.history.referenceTable.relatedAppId',
        'fieldSettings.properties.customer.lookup.targetAppId',
        'fieldSettings.properties.history.referenceTable.sourceApp.app',
        'actionSettings.actions.copy.destApp.app',
        'actionSettings.actions[0].destApp.appId',
        'actionSettings.actions.copy.destAppId',
        'actionSettings.actions.copy.targetAppId',
        'actionSettings.actions.copy.sourceApp.appId'
      ].every((path) => isAppReferenceIdPath(path))).toBe(true);

      expect([
        'fieldSettings.properties.customer.app',
        'fieldSettings.properties.customer.applicationId',
        'fieldSettings.properties.customer.lookup.relatedApp.code',
        'actionSettings.actions.copy.appId',
        'actionSettings.actions.copy.destApp.code',
        'pluginSettings.plugins[0].config.app',
        'customizeSettings.appId'
      ].some((path) => isAppReferenceIdPath(path))).toBe(false);
    });

    const appReferencePair = () => ({
      source: {
        appInfo: { appId: '101', name: '保有物件' },
        fieldSettings: {
          properties: {
            customer: {
              type: 'SINGLE_LINE_TEXT',
              code: 'customer',
              lookup: {
                relatedApp: { app: '201', code: 'customer-master' },
                targetAppId: '211',
                relatedKeyField: 'customer_code'
              }
            },
            history: {
              type: 'REFERENCE_TABLE',
              code: 'history',
              referenceTable: {
                relatedApp: { appId: '301', code: 'history-app' },
                condition: { field: 'asset_code', relatedField: 'asset_code' }
              }
            }
          }
        },
        actionSettings: {
          actions: {
            copy: {
              name: '複製',
              destApp: { app: '401', code: 'destination-app' },
              targetAppId: '411',
              mappings: []
            }
          }
        }
      },
      target: {
        appInfo: { appId: '102', name: '保有物件' },
        fieldSettings: {
          properties: {
            customer: {
              type: 'SINGLE_LINE_TEXT',
              code: 'customer',
              lookup: {
                relatedApp: { app: '202', code: 'customer-master' },
                targetAppId: '212',
                relatedKeyField: 'customer_code'
              }
            },
            history: {
              type: 'REFERENCE_TABLE',
              code: 'history',
              referenceTable: {
                relatedApp: { appId: '302', code: 'history-app' },
                condition: { field: 'asset_code', relatedField: 'asset_code' }
              }
            }
          }
        },
        actionSettings: {
          actions: {
            copy: {
              name: '複製',
              destApp: { app: '402', code: 'destination-app' },
              targetAppId: '412',
              mappings: []
            }
          }
        }
      }
    });

    it('keeps app IDs as differences until the explicit preset is enabled', () => {
      const { source, target } = appReferencePair();
      const result = computeDiffRows(
        makeBundle(source),
        makeBundle(target),
        ['appInfo', 'fieldSettings', 'actionSettings'],
        ''
      );

      expect(result.rows.map((row: any) => row.path)).toEqual([
        'appInfo.appId',
        'fieldSettings.properties.customer.lookup.relatedApp.app',
        'fieldSettings.properties.customer.lookup.targetAppId',
        'fieldSettings.properties.history.referenceTable.relatedApp.appId',
        'actionSettings.actions.copy.destApp.app',
        'actionSettings.actions.copy.targetAppId'
      ]);
    });

    it('excludes only appInfo and reference destination IDs when enabled', () => {
      const { source, target } = appReferencePair();
      const result = computeDiffRows(
        makeBundle(source),
        makeBundle(target),
        ['appInfo', 'fieldSettings', 'actionSettings'],
        '',
        { normalizationPresetState: { appReferences: true } }
      );

      expect(countActualDiffRows(result.rows)).toBe(0);
    });

    it('keeps non-ID reference settings and misleading app-like keys', () => {
      const source = {
        fieldSettings: {
          properties: {
            customer: {
              type: 'SINGLE_LINE_TEXT',
              code: 'customer',
              lookup: {
                relatedApp: { app: '201', code: 'customer-master-a' },
                relatedKeyField: 'old_key'
              },
              applicationId: 'application-a',
              myAppId: 'mine-a',
              appIdLabel: '表示A',
              app: 'ordinary-a'
            }
          }
        }
      };
      const target = {
        fieldSettings: {
          properties: {
            customer: {
              type: 'SINGLE_LINE_TEXT',
              code: 'customer',
              lookup: {
                relatedApp: { app: '202', code: 'customer-master-b' },
                relatedKeyField: 'new_key'
              },
              applicationId: 'application-b',
              myAppId: 'mine-b',
              appIdLabel: '表示B',
              app: 'ordinary-b'
            }
          }
        }
      };
      const result = computeDiffRows(
        makeBundle(source),
        makeBundle(target),
        ['fieldSettings'],
        '',
        { normalizationPresetState: { appReferences: true } }
      );

      expect(result.rows.map((row: any) => row.path)).toEqual([
        'fieldSettings.properties.customer.app',
        'fieldSettings.properties.customer.appIdLabel',
        'fieldSettings.properties.customer.applicationId',
        'fieldSettings.properties.customer.lookup.relatedApp.code',
        'fieldSettings.properties.customer.lookup.relatedKeyField',
        'fieldSettings.properties.customer.myAppId'
      ]);
    });

    it('does not affect app-like keys in plugin or customize settings', () => {
      const result = computeDiffRows(
        makeBundle({
          pluginSettings: { plugins: [{ id: 'plugin-a', _config: { app: '1', appId: '2', applicationId: '3' } }] },
          customizeSettings: { app: '4', appId: '5', applicationId: '6' }
        }),
        makeBundle({
          pluginSettings: { plugins: [{ id: 'plugin-a', _config: { app: '11', appId: '12', applicationId: '13' } }] },
          customizeSettings: { app: '14', appId: '15', applicationId: '16' }
        }),
        ['pluginSettings', 'customizeSettings'],
        '',
        { normalizationPresetState: { appReferences: true } }
      );

      expect(result.rows.map((row: any) => row.path)).toEqual([
        'pluginSettings.plugins[0].config.app',
        'pluginSettings.plugins[0].config.appId',
        'pluginSettings.plugins[0].config.applicationId',
        'customizeSettings.app',
        'customizeSettings.appId',
        'customizeSettings.applicationId'
      ]);
    });

    it.each([
      { label: '追加', source: {}, target: { appInfo: { appId: '501' } } },
      { label: '削除', source: { appInfo: { appId: '501' } }, target: {} }
    ])('suppresses an ID-only one-sided appInfo section ($label)', ({ source, target }) => {
      const result = computeDiffRows(
        makeBundle(source),
        makeBundle(target),
        ['appInfo'],
        '',
        { normalizationPresetState: { appReferences: true } }
      );

      expect(countActualDiffRows(result.rows)).toBe(0);
    });

    it.each([
      { label: '追加', source: {}, target: { fieldSettings: {
        properties: { customer: {
          type: 'SINGLE_LINE_TEXT', code: 'customer',
          lookup: { relatedApp: { app: '765' }, relatedKeyField: 'customer_code' }
        } }
      } } },
      { label: '削除', source: { fieldSettings: {
        properties: { customer: {
          type: 'SINGLE_LINE_TEXT', code: 'customer',
          lookup: { relatedApp: { app: '765' }, relatedKeyField: 'customer_code' }
        } }
      } }, target: {} }
    ])('removes IDs from a meaningful one-sided section without hiding the section ($label)', ({ source, target }) => {
      const result = computeDiffRows(
        makeBundle(source),
        makeBundle(target),
        ['fieldSettings'],
        '',
        { normalizationPresetState: { appReferences: true } }
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].path).toBe('fieldSettings');
      expect(JSON.stringify(result.rows[0])).not.toContain('765');
      expect(JSON.stringify(result.rows[0])).toContain('customer_code');
    });

    it('removes a destination app ID from a one-sided action section', () => {
      const result = computeDiffRows(
        makeBundle({}),
        makeBundle({ actionSettings: { actions: {
          copy: { name: '複製', destApp: { app: '876', code: 'destination-app' }, mappings: [] }
        } } }),
        ['actionSettings'],
        '',
        { normalizationPresetState: { appReferences: true } }
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].path).toBe('actionSettings');
      expect(JSON.stringify(result.rows[0])).not.toContain('876');
      expect(JSON.stringify(result.rows[0])).toContain('destination-app');
    });
  });

  describe('hasUniquePrimitiveKey', () => {
    it('rejects boolean keys as identities', () => {
      const arr = [{ includeSubs: true }, { includeSubs: false }];
      expect(hasUniquePrimitiveKey(arr, 'includeSubs')).toBe(false);
    });
  });

  describe('composite-key array matching (appAcl.rights)', () => {
    const rights = (entries: Array<[string, string, boolean]>) => ({
      rights: entries.map(([type, code, editable]) => ({
        entity: { type, code },
        includeSubs: false,
        appEditable: editable,
        recordViewable: true
      }))
    });

    it('reorder of ACL entries yields moved rows, not added/removed', () => {
      const src = rights([['USER', 'u1', true], ['GROUP', 'g1', false]]);
      const tgt = rights([['GROUP', 'g1', false], ['USER', 'u1', true]]);
      const rows = diffRows({ appAcl: src }, { appAcl: tgt }, ['appAcl']);
      expect(rows.every((r: any) => r.type === 'changed' && r.moved)).toBe(true);
      expect(rows.length).toBe(2);
    });

    it('flag change on one entity yields a single changed row with entity context', () => {
      const src = rights([['USER', 'u1', true], ['GROUP', 'g1', false]]);
      const tgt = rights([['GROUP', 'g1', false], ['USER', 'u1', false]]);
      const rows = diffRows({ appAcl: src }, { appAcl: tgt }, ['appAcl']);
      const changed = rows.filter((r: any) => !r.moved);
      expect(changed.length).toBe(1);
      expect(changed[0].path).toMatch(/appEditable$/);
      expect(changed[0].arrayKey).toBe('entity');
      expect(changed[0].arrayKeyValue).toEqual({ type: 'USER', code: 'u1' });
      expect(rows.some((r: any) => r.type === 'added' || r.type === 'removed')).toBe(false);
    });

    it('entity removal is reported as removed with entity key', () => {
      const src = rights([['USER', 'u1', true], ['GROUP', 'g1', false]]);
      const tgt = rights([['USER', 'u1', true]]);
      const rows = diffRows({ appAcl: src }, { appAcl: tgt }, ['appAcl']);
      expect(rows.length).toBe(1);
      expect(rows[0].type).toBe('removed');
      expect(rows[0].arrayKeyValue).toEqual({ type: 'GROUP', code: 'g1' });
    });
  });

  describe('composite-key array matching (process actions with duplicate names)', () => {
    it('matches actions by name|from|to when no single key is unique', () => {
      const src = {
        enable: true,
        states: { draft: {}, review: {}, done: {} },
        actions: [
          { name: '承認', from: 'draft', to: 'review', filterCond: '' },
          { name: '承認', from: 'review', to: 'done', filterCond: '' },
          { name: '却下', from: 'review', to: 'draft', filterCond: '' },
          { name: '却下', from: 'done', to: 'draft', filterCond: '' }
        ]
      };
      const tgt = JSON.parse(JSON.stringify(src));
      tgt.actions[1].filterCond = 'status = "A"';
      const rows = diffRows({ processSettings: src }, { processSettings: tgt }, ['processSettings']);
      expect(rows.length).toBe(1);
      expect(rows[0].type).toBe('changed');
      expect(rows[0].path).toMatch(/filterCond$/);
      expect(rows[0].arrayKey).toBe('name');
      expect(rows[0].arrayKeyValue).toBe('承認');
    });
  });

  describe('process state rename detection', () => {
    const processPair = () => {
      const source = {
        enable: true,
        states: {
          未処理: { name: '未処理', index: '0', assignee: { type: 'ONE', entities: [] } },
          完了: { name: '完了', index: '1', assignee: { type: 'ONE', entities: [] } }
        },
        actions: [{ name: '完了へ', from: '未処理', to: '完了', filterCond: '' }]
      };
      const target = {
        enable: true,
        states: {
          受付: { name: '受付', index: '0', assignee: { type: 'ONE', entities: [] } },
          完了: { name: '完了', index: '1', assignee: { type: 'ONE', entities: [] } }
        },
        actions: [{ name: '完了へ', from: '受付', to: '完了', filterCond: '' }]
      };
      return { source, target };
    };

    it('counts a pure state rename as a reviewable but non-actionable difference', () => {
      const { source, target } = processPair();
      const result = computeDiffRows(
        makeBundle({ processSettings: source }),
        makeBundle({ processSettings: target }),
        ['processSettings'],
        ''
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        type: 'changed',
        _nonActionable: true,
        _stateRenameNotice: true,
        left: { name: '未処理' },
        right: { name: '受付' }
      });
      expect(result.rows[0]._displayOnly).toBeUndefined();
      expect(countActualDiffRows(result.rows)).toBe(1);
      expect(countActionableDiffRows(result.rows)).toBe(0);
      expect(summarizeRows(result.rows)).toMatchObject({ total: 1, added: 0, removed: 0, changed: 1, moved: 0 });
    });

    it('counts the rename notice alongside another process change without creating cascade noise', () => {
      const { source, target } = processPair();
      target.enable = false;
      const result = computeDiffRows(
        makeBundle({ processSettings: source }),
        makeBundle({ processSettings: target }),
        ['processSettings'],
        ''
      );

      expect(result.rows.filter((row: any) => row._stateRenameNotice)).toHaveLength(1);
      expect(result.rows.some((row: any) => row.path === 'processSettings.enable')).toBe(true);
      expect(result.rows.some((row: any) => row.type === 'added' || row.type === 'removed')).toBe(false);
      expect(countActualDiffRows(result.rows)).toBe(2);
      expect(countActionableDiffRows(result.rows)).toBe(1);
      expect(summarizeRows(result.rows)).toMatchObject({ total: 2, added: 0, removed: 0, changed: 2, moved: 0 });
    });

    it('does not infer renames when multiple unmatched states have identical bodies', () => {
      const makeState = (name: string, index: string) => ({ name, index, assignee: { type: 'ONE', entities: [] } });
      const source = {
        enable: true,
        states: { 旧A: makeState('旧A', '0'), 旧B: makeState('旧B', '1') },
        actions: []
      };
      const target = {
        enable: true,
        states: { 新A: makeState('新A', '0'), 新B: makeState('新B', '1') },
        actions: []
      };

      expect(detectProcessStateRenames(source, target).size).toBe(0);
      const rows = diffRows({ processSettings: source }, { processSettings: target }, ['processSettings']);
      expect(rows.some((row: any) => row._stateRenameNotice)).toBe(false);
      expect(rows.filter((row: any) => row.type === 'removed')).toHaveLength(2);
      expect(rows.filter((row: any) => row.type === 'added')).toHaveLength(2);
    });
  });

  describe('summarizeRows', () => {
    it('excludes display-only rows from every actual-difference breakdown', () => {
      const rows = [
        { type: 'added' },
        { type: 'removed' },
        { type: 'changed', moved: true },
        { type: 'same' },
        { type: 'added', _displayOnly: true },
        { type: 'removed', _displayOnly: true },
        { type: 'changed', _displayOnly: true },
        { type: 'changed', moved: true, _displayOnly: true }
      ];

      expect(summarizeRows(rows)).toEqual({
        total: 4,
        added: 1,
        removed: 1,
        changed: 1,
        moved: 1,
        same: 1
      });
      expect(countActualDiffRows(rows)).toBe(3);
    });
  });

  describe('composite-key array matching (fieldAcl entities)', () => {
    it('pairs entity-level accessibility changes by entity identity', () => {
      const src = {
        rights: [{
          code: 'price',
          entities: [
            { entity: { type: 'GROUP', code: 'sales' }, accessibility: 'READ_WRITE' },
            { entity: { type: 'GROUP', code: 'support' }, accessibility: 'READ' }
          ]
        }]
      };
      const tgt = JSON.parse(JSON.stringify(src));
      tgt.rights[0].entities = [tgt.rights[0].entities[1], tgt.rights[0].entities[0]];
      tgt.rights[0].entities[0].accessibility = 'NONE';
      const rows = diffRows({ fieldAcl: src }, { fieldAcl: tgt }, ['fieldAcl']);
      const real = rows.filter((r: any) => !r.moved);
      expect(real.length).toBe(1);
      expect(real[0].path).toMatch(/accessibility$/);
      expect(real[0].arrayKeyValue).toEqual({ type: 'GROUP', code: 'support' });
      expect(rows.some((r: any) => r.type === 'added' || r.type === 'removed')).toBe(false);
    });
  });

  describe('notation/empty-value classification', () => {
    it('isNotationOnlyChange detects string vs number equivalence', () => {
      expect(isNotationOnlyChange('100', 100)).toBe(true);
      expect(isNotationOnlyChange('1.0', 1)).toBe(true);
      expect(isNotationOnlyChange('true', true)).toBe(true);
      expect(isNotationOnlyChange('100', 200)).toBe(false);
      expect(isNotationOnlyChange('abc', 'abd')).toBe(false);
      expect(isNotationOnlyChange('', 0)).toBe(false);
    });

    it('isEmptyLikeValue treats null/empty string/empty containers as empty', () => {
      expect(isEmptyLikeValue(null)).toBe(true);
      expect(isEmptyLikeValue(undefined)).toBe(true);
      expect(isEmptyLikeValue('')).toBe(true);
      expect(isEmptyLikeValue([])).toBe(true);
      expect(isEmptyLikeValue({})).toBe(true);
      expect(isEmptyLikeValue(0)).toBe(false);
      expect(isEmptyLikeValue(false)).toBe(false);
      expect(isEmptyLikeValue('a')).toBe(false);
    });

    it('marks "100" vs 100 as notation-only and demotes severity to low', () => {
      const src = { properties: { num: { type: 'NUMBER', code: 'num', maxValue: '100' } } };
      const tgt = { properties: { num: { type: 'NUMBER', code: 'num', maxValue: 100 } } };
      const rows = diffRows({ fieldSettings: src }, { fieldSettings: tgt }, ['fieldSettings']);
      expect(rows.length).toBe(1);
      expect(rows[0].notationOnly).toBe(true);
      expect(rows[0].severity).toBe('low');
    });

    it('marks "" vs null as empty-only and demotes severity to low', () => {
      const src = { properties: { a: { type: 'SINGLE_LINE_TEXT', code: 'a', defaultValue: '' } } };
      const tgt = { properties: { a: { type: 'SINGLE_LINE_TEXT', code: 'a', defaultValue: null } } };
      const rows = diffRows({ fieldSettings: src }, { fieldSettings: tgt }, ['fieldSettings']);
      expect(rows.length).toBe(1);
      expect(rows[0].emptyOnly).toBe(true);
      expect(rows[0].severity).toBe('low');
    });

    it('keeps real value changes at original severity', () => {
      const src = { properties: { a: { type: 'SINGLE_LINE_TEXT', code: 'a', defaultValue: 'x' } } };
      const tgt = { properties: { a: { type: 'SINGLE_LINE_TEXT', code: 'a', defaultValue: 'y' } } };
      const rows = diffRows({ fieldSettings: src }, { fieldSettings: tgt }, ['fieldSettings']);
      expect(rows.length).toBe(1);
      expect(rows[0].notationOnly).toBeUndefined();
      expect(rows[0].severity).toBe('high');
    });
  });

  describe('LCS moved pairing (mixed move + add/remove)', () => {
    const rowOf = (code: string, type = 'SINGLE_LINE_TEXT') => ({ type: 'ROW', fields: [{ type, code }] });

    it('merges add/remove of the same item at different positions into one moved row', () => {
      const src = { layout: [rowOf('a'), rowOf('b'), rowOf('c')] };
      const tgt = { layout: [rowOf('b'), rowOf('c'), rowOf('a'), rowOf('d')] };
      const rows = diffRows({ layoutSettings: src }, { layoutSettings: tgt }, ['layoutSettings']);
      const movedRows = rows.filter((r: any) => r.moved);
      expect(movedRows.length).toBe(1);
      expect(movedRows[0].type).toBe('changed');
      expect(movedRows[0].movedFrom).toBe(0);
      expect(movedRows[0].movedTo).toBe(2);
      expect(movedRows[0].severity).toBe('low');
      expect(rows.filter((r: any) => r.type === 'added').length).toBe(1);
      expect(rows.some((r: any) => r.type === 'removed')).toBe(false);
    });

    it('keeps genuine add/remove rows untouched when contents differ', () => {
      const src = { layout: [rowOf('a'), rowOf('b')] };
      const tgt = { layout: [rowOf('b'), rowOf('x'), rowOf('y')] };
      const rows = diffRows({ layoutSettings: src }, { layoutSettings: tgt }, ['layoutSettings']);
      expect(rows.some((r: any) => r.moved)).toBe(false);
    });
  });

  describe('pure-reorder detection', () => {
    it('reports layout row reorder as moved rows instead of added/removed', () => {
      const rowA = { type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'a' }] };
      const rowB = { type: 'ROW', fields: [{ type: 'NUMBER', code: 'b' }] };
      const rowC = { type: 'ROW', fields: [{ type: 'DATE', code: 'c' }] };
      const src = { layout: [rowA, rowB, rowC] };
      const tgt = { layout: [rowC, rowA, rowB] };
      const rows = diffRows({ layoutSettings: src }, { layoutSettings: tgt }, ['layoutSettings']);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r: any) => r.type === 'changed' && r.moved)).toBe(true);
      expect(rows.every((r: any) => r.severity === 'low')).toBe(true);
    });
  });

  // 差分件数が上限で打ち切られた場合、無言で欠落させず truncation として報告する。
  // 打ち切りが警告されないと「差分なし」と誤認したまま反映対象から漏れる事故につながる。
  describe('diff truncation reporting', () => {
    it('reports dropped rows and affected sections when the diff limit is exceeded', () => {
      const props: Record<string, any> = {};
      for (let i = 0; i < 1200; i++) {
        props[`f${i}`] = { code: `f${i}`, type: 'SINGLE_LINE_TEXT', label: `label${i}` };
      }
      const result = computeDiffRows(
        makeBundle({ fieldSettings: { properties: props } }),
        makeBundle({ fieldSettings: { properties: {} } }),
        ['fieldSettings'],
        ''
      );
      expect(result.rows.filter((r: any) => r.type !== 'same').length).toBe(1000);
      expect(result.truncation.truncated).toBe(true);
      expect(result.truncation.actualDiffIncomplete).toBe(true);
      expect(hasIncompleteActualDiffTruncation(result.truncation)).toBe(true);
      expect(result.truncation.diffLimit).toBe(1000);
      const section = result.truncation.sections.find((s: any) => s.sectionKey === 'fieldSettings');
      expect(section).toMatchObject({
        scanned: true,
        partiallyScanned: true,
        scanStatus: 'partial',
        droppedDiff: 0,
        droppedSame: 0,
        omittedDiffCount: null
      });
    });

    it('marks later deep-comparison sections as unscanned after the global limit', () => {
      const props: Record<string, any> = {};
      for (let i = 0; i < 1200; i++) {
        props[`f${i}`] = { code: `f${i}`, type: 'SINGLE_LINE_TEXT', label: `label${i}` };
      }
      let deepReadCount = 0;
      const laterSection = (type: string) => {
        const section: Record<string, any> = {};
        Object.defineProperty(section, 'views', {
          enumerable: true,
          get() {
            deepReadCount += 1;
            return { main: { type } };
          }
        });
        return section;
      };
      const result = computeDiffRows(
        makeBundle({
          fieldSettings: { properties: props },
          viewSettings: laterSection('LIST')
        }),
        makeBundle({
          fieldSettings: { properties: {} },
          viewSettings: laterSection('CALENDAR')
        }),
        ['fieldSettings', 'viewSettings'],
        ''
      );

      expect(result.rows.filter((r: any) => r.type !== 'same')).toHaveLength(1000);
      expect(result.rows.some((r: any) => r.sectionKey === 'viewSettings')).toBe(false);
      expect(deepReadCount).toBe(0);
      expect(result.truncation.sections.find((s: any) => s.sectionKey === 'viewSettings')).toMatchObject({
        scanned: false,
        partiallyScanned: false,
        scanStatus: 'unscanned',
        droppedDiff: 0,
        droppedSame: 0,
        omittedDiffCount: null
      });
    });

    it('keeps whole-section additions and removals as scanned dropped rows after the limit', () => {
      const props: Record<string, any> = {};
      for (let i = 0; i < 1200; i++) {
        props[`f${i}`] = { code: `f${i}`, type: 'SINGLE_LINE_TEXT', label: `label${i}` };
      }
      const result = computeDiffRows(
        makeBundle({
          fieldSettings: { properties: props },
          reportSettings: { reports: { oldReport: { chartType: 'BAR' } } }
        }),
        makeBundle({
          fieldSettings: { properties: {} },
          viewSettings: { views: { newView: { type: 'LIST' } } }
        }),
        ['fieldSettings', 'viewSettings', 'reportSettings'],
        ''
      );

      expect(result.truncation.droppedDiff).toBe(2);
      expect(result.truncation.sections.find((s: any) => s.sectionKey === 'viewSettings')).toMatchObject({
        scanned: true,
        partiallyScanned: false,
        scanStatus: 'complete',
        droppedDiff: 1,
        droppedSame: 0,
        omittedDiffCount: 1
      });
      expect(result.truncation.sections.find((s: any) => s.sectionKey === 'reportSettings')).toMatchObject({
        scanned: true,
        partiallyScanned: false,
        scanStatus: 'complete',
        droppedDiff: 1,
        droppedSame: 0,
        omittedDiffCount: 1
      });
    });

    it('reports no truncation for small diffs', () => {
      const result = computeDiffRows(
        makeBundle({ fieldSettings: { properties: { a: { code: 'a', type: 'SINGLE_LINE_TEXT' } } } }),
        makeBundle({ fieldSettings: { properties: {} } }),
        ['fieldSettings'],
        ''
      );
      expect(result.truncation.truncated).toBe(false);
      expect(result.truncation.actualDiffIncomplete).toBe(false);
      expect(result.truncation.droppedDiff).toBe(0);
      expect(result.truncation.sections).toEqual([]);
    });

    it('counts omitted same evidence without marking actual diff detection incomplete', () => {
      const sourceProperties: Record<string, any> = {};
      const targetProperties: Record<string, any> = {};
      for (let i = 0; i < 3002; i += 1) {
        sourceProperties[`f${i}`] = { code: `f${i}`, type: 'SINGLE_LINE_TEXT', label: `項目 ${i}` };
        targetProperties[`f${i}`] = { code: `f${i}`, type: 'SINGLE_LINE_TEXT', label: `項目 ${i}` };
      }
      targetProperties.f0.label = '変更後';

      const result = computeDiffRows(
        makeBundle({ fieldSettings: { properties: sourceProperties } }),
        makeBundle({ fieldSettings: { properties: targetProperties } }),
        ['fieldSettings'],
        '',
        { includeSame: true }
      );

      expect(result.rows.filter((row: any) => row.type === 'same')).toHaveLength(3000);
      expect(countActualDiffRows(result.rows)).toBe(1);
      expect(result.truncation).toMatchObject({
        truncated: true,
        actualDiffIncomplete: false,
        droppedDiff: 0,
        droppedSame: 3,
        sameLimit: 3000
      });
      expect(result.truncation.sections).toContainEqual(expect.objectContaining({
        sectionKey: 'fieldSettings',
        scanStatus: 'complete',
        droppedDiff: 0,
        droppedSame: 3,
        omittedDiffCount: 0
      }));
      expect(hasIncompleteActualDiffTruncation(result.truncation)).toBe(false);
    });
  });
});
