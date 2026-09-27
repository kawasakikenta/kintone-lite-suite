import { describe, expect, it } from 'vitest';
import { buildDiffMarkdownExport } from '../../src/diff/markdown-export';

function baseContext(overrides: Record<string, unknown> = {}) {
  return {
    sourceBundle: {
      appId: '10',
      guestId: '',
      preview: false,
      fetchedAt: '2026-09-26T01:02:03.000Z',
      meta: { appName: '変更前 <受注>' },
      sections: { appSettings: { secret: 'bundle must not be dumped' } }
    },
    targetBundle: {
      appId: '20',
      guestId: '7',
      preview: true,
      fetchedAt: '2026-09-26T02:03:04.000Z',
      meta: { appName: '変更後 | 受注' },
      sections: { pluginSettings: { secret: 'bundle must not be dumped' } }
    },
    scopes: ['appSettings', 'fieldSettings'],
    ignoreKeys: 'path:views.Sales*View, East\nrevision',
    normalizationPresetState: { viewOrder: true, labelsAndText: false },
    comparedAt: '2026-09-26T02:04:05.000Z',
    generatedAt: '2026-09-26T02:05:06.000Z',
    exportMode: 'all',
    exportLabel: '全件',
    filterDescription: 'フィルターなし',
    rows: [],
    ...overrides
  } as any;
}

function typedJsonBlocks(markdown: string): any[] {
  const lines = markdown.split('\n');
  const blocks: any[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].match(/^(`{3,})json$/);
    if (!opening) continue;
    const closing = lines.indexOf(opening[1], index + 1);
    if (closing < 0) continue;
    blocks.push(JSON.parse(lines.slice(index + 1, closing).join('\n')));
    index = closing;
  }
  return blocks;
}

describe('diff/markdown export', () => {
  it('records direction, endpoint identity, conditions, and a stable format schema', () => {
    const { filename, markdown } = buildDiffMarkdownExport(baseContext({
      rows: [{
        _id: 'd9',
        sectionKey: 'appSettings',
        section: 'アプリ設定',
        type: 'changed',
        path: 'appSettings.name',
        left: '旧名称',
        right: '新名称'
      }]
    }));

    expect(filename).toMatch(/\.md$/);
    expect(markdown).toContain('format: `kintone-diff-markdown`');
    expect(markdown).toContain('formatVersion: `1`');
    expect(markdown).toContain('BEFORE / 比較元（変更前）');
    expect(markdown).toContain('AFTER / 比較先（変更後）');
    expect(markdown).toContain('App 10');
    expect(markdown).toContain('App 20');
    expect(markdown).toContain('ゲスト 7');
    expect(markdown).toContain('2026-09-26T01:02:03.000Z');
    expect(markdown).toContain('アプリ設定 (`appSettings`)');
    expect(markdown).toContain('path:views.Sales*View, East');
    expect(markdown).toContain('viewOrder: ON');
    expect(markdown).toContain('labelsAndText: OFF');
    expect(markdown).toContain('businessImpact: 未判定');
    expect(markdown).not.toContain('bundle must not be dumped');
  });

  it('keeps missing, undefined, null, empty, false, zero, and tricky strings typed and untruncated', () => {
    const ownProto = JSON.parse('{"__proto__":{"literal":"kept"},"text":"before"}');
    const long = 'literal \\ path `tick` ~~~ <script>alert(1)</script> ' + '長文'.repeat(80);
    const rows = [
      { sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.new.label', left: undefined, right: '' },
      { sectionKey: 'fieldSettings', type: 'removed', path: 'fieldSettings.properties.old.label', left: false, right: undefined },
      { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.zero.default', left: 0, right: null },
      { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.proto.default', left: ownProto, right: { text: long } },
      { sectionKey: 'fieldSettings', type: 'changed', path: 'fieldSettings.properties.undefined.default', left: undefined, right: 'defined' }
    ];
    const { markdown } = buildDiffMarkdownExport(baseContext({ rows }));

    expect(markdown).toContain('"$kusValue": "missing"');
    expect(markdown).toContain('"$kusValue": "value"');
    expect(markdown).toContain('"type": "undefined"');
    expect(markdown).toContain('"type": "null"');
    expect(markdown).toContain('"value": ""');
    expect(markdown).toContain('"value": false');
    expect(markdown).toContain('"value": 0');
    expect(markdown).toContain('"__proto__": {');
    expect(markdown).toContain('"literal": "kept"');
    expect(typedJsonBlocks(markdown).some((block) => block?.value?.text === long)).toBe(true);
    expect(markdown).toContain('fieldSettings.properties.proto.default');
    expect(markdown).toContain('`tick`');
    expect(markdown).toContain('~~~');
    expect(markdown).toContain('<script>alert(1)</script>');
  });

  it('distinguishes no-difference, filtered-empty, and incomplete conclusions', () => {
    const sameOnly = buildDiffMarkdownExport(baseContext({
      rows: [
        { sectionKey: 'appSettings', type: 'same', path: 'appSettings.name', left: 'same', right: 'same' },
        { sectionKey: 'layoutSettings', type: 'changed', _displayOnly: true, path: 'layoutSettings.layout[0]' }
      ],
      truncation: { truncated: true, droppedDiff: 0, droppedSame: 3, sections: [{ sectionKey: 'appSettings', scanStatus: 'complete', omittedDiffCount: 0 }] }
    }));
    expect(sameOnly.markdown).toContain('conclusion: `no-difference`');
    expect(sameOnly.markdown).toContain('同一行だけの省略。実差分の検出結果は完全');

    const filteredEmpty = buildDiffMarkdownExport(baseContext({
      rows: [],
      allRows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'a', right: 'b' }],
      exportMode: 'filtered',
      exportLabel: '表示中（フィルタ適用後）'
    }));
    expect(filteredEmpty.markdown).toContain('conclusion: `filtered-empty`');
    expect(filteredEmpty.markdown).toContain('比較全体には実差分があります');

    const filteredEmptyWithNoOverallRows = buildDiffMarkdownExport(baseContext({
      rows: [],
      allRows: [],
      exportMode: 'filtered',
      exportLabel: '表示中（フィルタ適用後）'
    }));
    expect(filteredEmptyWithNoOverallRows.markdown).toContain('conclusion: `filtered-empty`');
    expect(filteredEmptyWithNoOverallRows.markdown).toContain('比較全体に実差分はありません');
    expect(filteredEmptyWithNoOverallRows.markdown).not.toContain('比較全体の差分有無はこの出力だけでは判断できません');

    const filteredEmptyWithSameOverallRows = buildDiffMarkdownExport(baseContext({
      rows: [],
      allRows: [{ sectionKey: 'appSettings', type: 'same', path: 'appSettings.name', left: 'same', right: 'same' }],
      exportMode: 'filtered',
      exportLabel: '表示中（フィルタ適用後）'
    }));
    expect(filteredEmptyWithSameOverallRows.markdown).toContain('conclusion: `filtered-empty`');
    expect(filteredEmptyWithSameOverallRows.markdown).toContain('比較全体に実差分はありません');

    const filteredWithoutOverall = buildDiffMarkdownExport(baseContext({
      rows: [{ sectionKey: 'appSettings', type: 'same', path: 'appSettings.name', left: 'a', right: 'a' }],
      exportMode: 'filtered'
    }));
    expect(filteredWithoutOverall.markdown).toContain('conclusion: `filtered-no-real-difference`');
    expect(filteredWithoutOverall.markdown).toContain('全体 rows がないため判断できません');
    expect(filteredWithoutOverall.markdown).not.toContain('conclusion: `no-difference`');

    const incomplete = buildDiffMarkdownExport(baseContext({
      rows: [],
      fetchIssues: [{ sectionKey: 'appSettings', side: 'both', sourceError: 'source failed', targetError: 'target failed' }],
      partialIssues: [{ sectionKey: 'customizeSettings', side: 'source', message: 'JS本文を省略', files: [{ fileName: 'main.js', fileKey: 'fk', reason: 'oversize' }] }],
      truncation: { truncated: true, sections: [{ sectionKey: 'fieldSettings', omittedDiffCount: null }] },
      matchingNotices: { items: [{ sectionKey: 'viewSettings', path: 'views', reason: 'fallback' }], omitted: 1 }
    }));
    expect(incomplete.markdown).toContain('conclusion: `incomplete`');
    expect(incomplete.markdown).toContain('actualDiffComplete: false');
    expect(incomplete.markdown).toContain('比較元: source failed');
    expect(incomplete.markdown).toContain('比較先: target failed');
    expect(incomplete.markdown).toContain('main.js');
    expect(incomplete.markdown).toContain('matchingNotice: 2件');
    expect(incomplete.markdown).toContain('`partial`');
  });

  it('does not duplicate sensitive same-only values', () => {
    const { markdown } = buildDiffMarkdownExport(baseContext({
      rows: [{
        sectionKey: 'pluginSettings',
        type: 'same',
        path: 'pluginSettings.plugins.one.config',
        left: { token: 'PLUGIN_SAME_SECRET' },
        right: { token: 'PLUGIN_SAME_SECRET' }
      }, {
        sectionKey: 'customizeSettings',
        type: 'same',
        path: 'customizeSettings.desktop.js[0]._body',
        left: 'CUSTOM_SAME_SECRET',
        right: 'CUSTOM_SAME_SECRET'
      }]
    }));

    expect(markdown).not.toContain('PLUGIN_SAME_SECRET');
    expect(markdown).not.toContain('CUSTOM_SAME_SECRET');
    expect(markdown).toContain('sameSensitiveRowsOmitted: 2');
    expect(markdown).toContain('同一の機密値は安全のため省略しました');
  });

  it('states moved and rename candidate uncertainty as facts', () => {
    const { markdown } = buildDiffMarkdownExport(baseContext({
      rows: [{
        sectionKey: 'processSettings',
        section: 'プロセス管理',
        type: 'changed',
        path: 'processSettings.states.__rename__',
        left: { name: '旧状態' },
        right: { name: '新状態' },
        moved: true,
        movedFrom: 0,
        movedTo: 2,
        _nonActionable: true,
        renameCandidate: { fromCode: 'old', toCode: 'new', matchedBy: 'heuristic', score: 0.8 }
      }]
    }));
    expect(markdown).toContain('type: `changed`（移動）');
    expect(markdown).toContain('順序: 1番目 → 3番目');
    expect(markdown).toContain('改名候補（確定ではありません）');
    expect(markdown).toContain('確認専用（自動反映対象外）');
  });
});

