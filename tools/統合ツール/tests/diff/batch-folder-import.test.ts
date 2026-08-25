import { describe, expect, it } from 'vitest';
import {
  autoMatchDiffBatchFolderBundles,
  parseDiffBatchFolderImport,
  type DiffBatchFolderImportFile
} from '../../src/diff/batch-folder-import';

function bundle(
  appId: string | number,
  options: { guestId?: string | number; preview?: boolean; appName?: string } = {}
) {
  return {
    appId,
    guestId: options.guestId ?? '',
    preview: options.preview ?? false,
    fetchedAt: '2026-08-25T00:00:00.000Z',
    meta: options.appName ? { appName: options.appName } : {},
    sections: {
      appSettings: options.appName ? { name: options.appName } : {},
      fields: { properties: {} }
    }
  };
}

function file(name: string, raw: unknown, relativePath = name): DiffBatchFolderImportFile {
  return { name, relativePath, text: JSON.stringify(raw) };
}

describe('diff batch folder import parser', () => {
  it('設定一括取得フォルダのmanifestを数えず、アプリ別JSONを入力順に読み込む', () => {
    const result = parseDiffBatchFolderImport([
      file('manifest.json', { appCount: 2 }, '設定一括取得/manifest.json'),
      file('A(app00101)_本番.json', bundle('00101', { appName: 'アプリA' }), '設定一括取得/apps/A(app00101)_本番.json'),
      file('readme.txt', 'ignored', '設定一括取得/readme.txt'),
      file('B(app102)_ゲスト.json', bundle(102, { guestId: '0007', preview: true, appName: 'アプリB' }), '設定一括取得/nested/B(app102)_ゲスト.json')
    ]);

    expect(result.issues).toEqual([]);
    expect(result.manifestFileCount).toBe(1);
    expect(result.jsonFileCount).toBe(2);
    expect(result.ignoredFileCount).toBe(1);
    expect(result.bundles.map((item) => ({
      appId: item.appId,
      guestId: item.guestId,
      preview: item.preview,
      appName: item.appName,
      relativePath: item.relativePath
    }))).toEqual([
      {
        appId: '101',
        guestId: '',
        preview: false,
        appName: 'アプリA',
        relativePath: '設定一括取得/apps/A(app00101)_本番.json'
      },
      {
        appId: '102',
        guestId: '7',
        preview: true,
        appName: 'アプリB',
        relativePath: '設定一括取得/nested/B(app102)_ゲスト.json'
      }
    ]);
    expect(result.bundles[0].bundle.appId).toBe('101');
    expect(result.bundles[1].bundle.guestId).toBe('7');
    expect(result.bundles[1].bundle.preview).toBe(true);
  });

  it('apps配列JSONと単体bundle JSONを同じ一覧から読み取る', () => {
    const result = parseDiffBatchFolderImport([
      file('group.JSON', {
        generatedAt: '2026-08-25T00:00:00.000Z',
        apps: [
          bundle('201', { appName: '一つ目' }),
          bundle('202', { guestId: '8', preview: true, appName: '二つ目' })
        ]
      }, 'root/group.JSON'),
      file('single.json', bundle('203', { appName: '三つ目' }), 'root/deep/single.json')
    ]);

    expect(result.issues).toEqual([]);
    expect(result.bundles.map((item) => `${item.appId}:${item.guestId}:${item.preview}`)).toEqual([
      '201::false',
      '202:8:true',
      '203::false'
    ]);
    expect(result.bundles.map((item) => item.bundleIndex)).toEqual([1, 2, 1]);
    expect(result.bundles.map((item) => item.appName)).toEqual(['一つ目', '二つ目', '三つ目']);
  });

  it('bundleラッパーとbundles配列ラッパーを入力順に読み取る', () => {
    const result = parseDiffBatchFolderImport([
      file('wrapped-single.json', {
        bundle: bundle('211', { guestId: '09', preview: true, appName: '単体ラッパー' })
      }, 'root/wrapped-single.json'),
      file('wrapped-list.json', {
        bundles: [
          bundle('212', { appName: '配列ラッパー1' }),
          bundle('213', { guestId: '10', appName: '配列ラッパー2' })
        ]
      }, 'root/wrapped-list.json')
    ]);

    expect(result.issues).toEqual([]);
    expect(result.bundles.map((item) => ({
      appId: item.appId,
      guestId: item.guestId,
      preview: item.preview,
      appName: item.appName,
      fileName: item.fileName,
      bundleIndex: item.bundleIndex
    }))).toEqual([
      {
        appId: '211',
        guestId: '9',
        preview: true,
        appName: '単体ラッパー',
        fileName: 'wrapped-single.json',
        bundleIndex: 1
      },
      {
        appId: '212',
        guestId: '',
        preview: false,
        appName: '配列ラッパー1',
        fileName: 'wrapped-list.json',
        bundleIndex: 1
      },
      {
        appId: '213',
        guestId: '10',
        preview: false,
        appName: '配列ラッパー2',
        fileName: 'wrapped-list.json',
        bundleIndex: 2
      }
    ]);
  });

  it('壊れたJSONとバンドルのないJSONを別々のissueにする', () => {
    const result = parseDiffBatchFolderImport([
      { name: 'broken.json', relativePath: 'root/broken.json', text: '{"apps":[' },
      file('empty.json', { generatedAt: 'now', apps: [] }, 'root/empty.json'),
      file('unrelated.json', { hello: 'world' }, 'root/unrelated.json')
    ]);

    expect(result.bundles).toEqual([]);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'invalid-json',
      'no-bundle',
      'no-bundle'
    ]);
    expect(result.issues.map((issue) => issue.relativePath)).toEqual([
      'root/broken.json',
      'root/empty.json',
      'root/unrelated.json'
    ]);
    expect(result.issues.every((issue) => issue.message.includes(issue.relativePath))).toBe(true);
  });

  it('同一ファイル内とファイル間の重複接続先を後勝ちさせずissueにする', () => {
    const result = parseDiffBatchFolderImport([
      file('first.json', {
        apps: [
          bundle('00301', { guestId: '09', preview: true, appName: '先行' }),
          bundle('301', { guestId: '9', preview: true, appName: '同一ファイル重複' })
        ]
      }, 'source/first.json'),
      file('second.json', bundle(301, { guestId: 9, preview: true, appName: '別ファイル重複' }), 'source/nested/second.json')
    ]);

    expect(result.bundles).toHaveLength(3);
    expect(new Set(result.bundles.map((item) => item.endpointKey)).size).toBe(1);
    expect(result.issues).toHaveLength(2);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'duplicate-endpoint',
        fileName: 'first.json',
        bundleIndex: 2,
        relatedFileName: 'first.json',
        relatedBundleIndex: 1
      }),
      expect.objectContaining({
        code: 'duplicate-endpoint',
        fileName: 'second.json',
        bundleIndex: 1,
        relatedFileName: 'first.json',
        relatedBundleIndex: 1
      })
    ]);
  });

  it('appIdとguestIdの不正値をissueにし、安全なバンドルだけ返す', () => {
    const result = parseDiffBatchFolderImport([
      file('invalid.json', {
        apps: [
          bundle('', { appName: 'appIdなし' }),
          bundle('app-401', { appName: 'appId不正' }),
          bundle('402', { guestId: 'guest-2', appName: 'guestId不正' }),
          bundle('00403', { guestId: '000', appName: '有効' })
        ]
      })
    ]);

    expect(result.issues.map((issue) => issue.code)).toEqual([
      'invalid-app-id',
      'invalid-app-id',
      'invalid-guest-id'
    ]);
    expect(result.issues.map((issue) => issue.bundleIndex)).toEqual([1, 2, 3]);
    expect(result.bundles).toHaveLength(1);
    expect(result.bundles[0]).toEqual(expect.objectContaining({
      appId: '403',
      guestId: '0',
      preview: false,
      appName: '有効'
    }));
  });

  it('壊れたmanifest.jsonを不整合issueにして部分取込を止められるようにする', () => {
    const result = parseDiffBatchFolderImport([
      { name: 'manifest.json', relativePath: 'root/nested/MANIFEST.JSON', text: '{broken' },
      file('app.json', bundle('501'), 'root/app.json')
    ]);

    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'manifest-mismatch',
        relativePath: 'root/nested/MANIFEST.JSON'
      })
    ]);
    expect(result.manifestFileCount).toBe(1);
    expect(result.jsonFileCount).toBe(1);
    expect(result.bundles.map((item) => item.appId)).toEqual(['501']);
  });

  it('manifestのルート・必須件数・targets・previewの不正型をすべてfatal issueにする', () => {
    const result = parseDiffBatchFolderImport([
      file('manifest.json', [], 'array/manifest.json'),
      file('manifest.json', {}, 'empty/manifest.json'),
      file('manifest.json', {
        appCount: '1',
        targets: 'invalid',
        preview: 'false'
      }, 'typed/manifest.json')
    ]);

    expect(result.bundles).toEqual([]);
    expect(result.issues).toHaveLength(3);
    expect(result.issues.every((issue) => issue.code === 'manifest-mismatch')).toBe(true);
    expect(result.issues[0].message).toContain('ルートはオブジェクト');
    expect(result.issues[1].message).toContain('appCount');
    expect(result.issues[2].message).toContain('targetsは配列');
    expect(result.issues[2].message).toContain('preview');
  });

  it('manifest targetsの接続先ID形式とpreview必須を検証する', () => {
    const result = parseDiffBatchFolderImport([
      file('manifest.json', {
        appCount: 1,
        targets: [{ appId: 'app-1', guestId: 'guest-1' }]
      })
    ]);

    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'manifest-mismatch' })
    ]);
    expect(result.issues[0].message).toContain('targetsがある場合はpreview');
    expect(result.issues[0].message).toContain('appId');
    expect(result.issues[0].message).toContain('guestId');
  });

  it('旧manifestのappCountとtargetsが同フォルダのバンドルと一致する場合はissueにしない', () => {
    const result = parseDiffBatchFolderImport([
      file('manifest.json', {
        appCount: 2,
        preview: true,
        targets: [
          { appId: '0601', guestId: '07' },
          { appId: '602', guestId: '' }
        ]
      }, 'export/manifest.json'),
      file('601.json', bundle('601', { guestId: '7', preview: true }), 'export/601.json'),
      file('602.json', bundle('602', { preview: true }), 'export/602.json')
    ]);

    expect(result.issues).toEqual([]);
    expect(result.bundles).toHaveLength(2);
  });

  it('旧manifestの件数または接続先が同フォルダのバンドルと異なる場合はissueにする', () => {
    const result = parseDiffBatchFolderImport([
      file('manifest.json', {
        appCount: 3,
        preview: false,
        targets: [
          { appId: '701', guestId: '' },
          { appId: '702', guestId: '' }
        ]
      }, 'export/manifest.json'),
      file('701.json', bundle('701', { preview: true }), 'export/701.json'),
      file('702.json', bundle('702'), 'export/nested/702.json')
    ]);

    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'manifest-mismatch',
        fileName: 'manifest.json',
        relativePath: 'export/manifest.json'
      })
    ]);
    expect(result.issues[0].message).toContain('appCount 3');
    expect(result.issues[0].message).toContain('targets');
  });

  it('ensureBundleShapeでmetaが整形される前にrawバンドルからアプリ名を保存する', () => {
    const raw = {
      appId: '801',
      guestId: '',
      preview: false,
      meta: { appName: 'rawのアプリ名', sectionRevisions: {} },
      sections: { fields: { properties: {} } }
    };

    const result = parseDiffBatchFolderImport([file('801.json', raw)]);

    expect(result.issues).toEqual([]);
    expect(result.bundles[0].appName).toBe('rawのアプリ名');
    expect(result.bundles[0].bundle.appName).toBe('rawのアプリ名');
  });

  it('設定一括取得の生成ファイル名から、App IDが一致するときだけアプリ名を補完する', () => {
    const withoutName = bundle('901');
    delete (withoutName as any).sections.appSettings;

    const result = parseDiffBatchFolderImport([
      file('物件マスタ(app00901)_ゲスト7_プレビュー.json', withoutName)
    ]);

    expect(result.issues).toEqual([]);
    expect(result.bundles[0].appName).toBe('物件マスタ');
    expect(result.bundles[0].bundle.appName).toBe('物件マスタ');
  });

  it('previewの欠落や文字列を真偽値へ暗黙変換せずissueにする', () => {
    const missing = bundle('910');
    const stringFalse = bundle('911');
    delete (missing as any).preview;
    (stringFalse as any).preview = 'false';

    const result = parseDiffBatchFolderImport([
      file('missing.json', missing),
      file('string.json', stringFalse)
    ]);

    expect(result.bundles).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'invalid-preview', fileName: 'missing.json' }),
      expect.objectContaining({ code: 'invalid-preview', fileName: 'string.json' })
    ]);
  });

  it('sections配列やapps配列内の壊れた候補を部分的に黙殺しない', () => {
    const result = parseDiffBatchFolderImport([
      file('mixed.json', {
        apps: [
          bundle('920', { appName: '有効' }),
          { appId: '921', preview: false, sections: [] },
          null,
          'broken',
          []
        ]
      })
    ]);

    expect(result.bundles.map((item) => item.appId)).toEqual(['920']);
    expect(result.issues).toHaveLength(4);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-bundle', bundleIndex: 2 }),
      expect.objectContaining({ code: 'invalid-bundle', bundleIndex: 3 }),
      expect.objectContaining({ code: 'invalid-bundle', bundleIndex: 4 }),
      expect.objectContaining({ code: 'invalid-bundle', bundleIndex: 5 })
    ]));
  });
});

describe('diff batch folder automatic matching', () => {
  function imported(
    appId: string,
    appName: string,
    options: { guestId?: string; preview?: boolean; fileName?: string } = {}
  ) {
    const parsed = parseDiffBatchFolderImport([
      file(
        options.fileName || `${appId}.json`,
        bundle(appId, {
          appName,
          guestId: options.guestId,
          preview: options.preview
        })
      )
    ]);
    expect(parsed.issues).toEqual([]);
    return parsed.bundles[0];
  }

  it('一意なアプリ名一致を優先し、残件の一意なApp ID一致を使う', () => {
    const sources = [
      imported('101', '同じ名前'),
      imported('102', '左だけの名前')
    ];
    const targets = [
      imported('202', '同じ名前'),
      imported('102', '右だけの名前')
    ];

    const rows = autoMatchDiffBatchFolderBundles(sources, targets);

    expect(rows.map((row) => ({
      source: row.source?.appId,
      target: row.target?.appId,
      matchKind: row.matchKind
    }))).toEqual([
      { source: '101', target: '202', matchKind: 'app-name' },
      { source: '102', target: '102', matchKind: 'app-id' }
    ]);
    expect(new Set(rows.map((row) => row.target?.endpointKey)).size).toBe(2);
  });

  it('アプリ名をNFKC・trim・小文字・空白正規化して対応付ける', () => {
    const sources = [imported('301', 'ＡＢＣ　  物件 DB ')];
    const targets = [imported('401', 'abc 物件  db')];

    const rows = autoMatchDiffBatchFolderBundles(sources, targets);

    expect(rows).toHaveLength(1);
    expect(rows[0].matchKind).toBe('app-name');
    expect(rows[0].target?.appId).toBe('401');
  });

  it('両側で一意でないアプリ名は対応付けず、残件も位置で仮対応しない', () => {
    const sources = [
      imported('501', '重複名', { fileName: 's1.json' }),
      imported('502', '重複名', { fileName: 's2.json' }),
      imported('503', '一意名', { fileName: 's3.json' })
    ];
    const targets = [
      imported('601', '重複名', { fileName: 't1.json' }),
      imported('602', '重複名', { fileName: 't2.json' }),
      imported('603', '一意名', { fileName: 't3.json' })
    ];

    const rows = autoMatchDiffBatchFolderBundles(sources, targets);

    expect(rows.map((row) => ({
      source: row.source?.appId,
      target: row.target?.appId,
      matchKind: row.matchKind
    }))).toEqual([
      { source: '501', target: undefined, matchKind: 'unpaired' },
      { source: '502', target: undefined, matchKind: 'unpaired' },
      { source: '503', target: '603', matchKind: 'app-name' },
      { source: undefined, target: '601', matchKind: 'unpaired' },
      { source: undefined, target: '602', matchKind: 'unpaired' }
    ]);
  });

  it('件数差は片側nullのunpaired行にする', () => {
    const sourceExtra = autoMatchDiffBatchFolderBundles(
      [imported('701', '左A'), imported('702', '左B')],
      [imported('801', '右A')]
    );
    const targetExtra = autoMatchDiffBatchFolderBundles(
      [imported('901', '左A')],
      [imported('1001', '右A'), imported('1002', '右B')]
    );

    expect(sourceExtra.map((row) => ({
      source: row.source?.appId ?? null,
      target: row.target?.appId ?? null,
      matchKind: row.matchKind
    }))).toEqual([
      { source: '701', target: null, matchKind: 'unpaired' },
      { source: '702', target: null, matchKind: 'unpaired' },
      { source: null, target: '801', matchKind: 'unpaired' }
    ]);
    expect(targetExtra.map((row) => ({
      source: row.source?.appId ?? null,
      target: row.target?.appId ?? null,
      matchKind: row.matchKind
    }))).toEqual([
      { source: '901', target: null, matchKind: 'unpaired' },
      { source: null, target: '1001', matchKind: 'unpaired' },
      { source: null, target: '1002', matchKind: 'unpaired' }
    ]);
  });

  it('同じApp IDが複数あるときは入力順で決めずunpairedにする', () => {
    const sources = [
      imported('1101', '左運用', { fileName: 's-prod.json' }),
      imported('1101', '左プレビュー', { preview: true, fileName: 's-preview.json' })
    ];
    const targets = [
      imported('1101', '右運用', { fileName: 't-prod.json' }),
      imported('1101', '右プレビュー', { preview: true, fileName: 't-preview.json' })
    ];

    const rows = autoMatchDiffBatchFolderBundles(sources, targets);

    expect(rows.map((row) => row.matchKind)).toEqual(['unpaired', 'unpaired', 'unpaired', 'unpaired']);
    expect(rows.map((row) => row.source?.fileName ?? null)).toEqual([
      's-prod.json',
      's-preview.json',
      null,
      null
    ]);
    expect(rows.map((row) => row.target?.fileName ?? null)).toEqual([
      null,
      null,
      't-prod.json',
      't-preview.json'
    ]);
  });
});
