import { describe, expect, it } from 'vitest';
import { DEPLOY_COMPARE_SECTION_KEYS, deploySectionLabel } from '../../src/deploy/sections';
import { buildDeployWarnings, compareDeploySection, findRemovedFields } from '../../src/deploy/inspect';
import { REFLECT_SECTION_KEYS, reflectSectionLabel } from '../../src/reflect/sections';
import { field } from './fake-kintone';

const properties = (...fields: any[]) => ({ properties: Object.fromEntries(fields.map(item => [item.code, item])) });

describe('deploy/sections', () => {
  it('比べる項目と名前はプレビュー反映と同じ', () => {
    expect(DEPLOY_COMPARE_SECTION_KEYS).toEqual(REFLECT_SECTION_KEYS);
    expect(DEPLOY_COMPARE_SECTION_KEYS).toContain('appSettings');
    for (const key of DEPLOY_COMPARE_SECTION_KEYS) expect(deploySectionLabel(key)).toBe(reflectSectionLabel(key));
  });
});

describe('compareDeploySection', () => {
  it('revision だけが違う項目は same', () => {
    const diff = compareDeploySection('viewSettings', { views: { A: { type: 'LIST', index: '0' } }, revision: '10' }, { views: { A: { type: 'LIST', index: '0' } }, revision: '12' });
    expect(diff).toMatchObject({ sectionKey: 'viewSettings', label: 'ビュー設定', status: 'same', items: [], counts: { added: 0, changed: 0, removed: 0 } });
  });

  it('内容が違えば change とし、要約と件数（追加・変更・削除）を返す', () => {
    const production = { ...properties(field('name', '名前'), field('old', '古い項目')), revision: '10' };
    const preview = { ...properties(field('name', '氏名'), field('added', '新しい項目')), revision: '12' };
    const diff = compareDeploySection('fieldSettings', production, preview, { name: '氏名', old: '古い項目', added: '新しい項目' });
    expect(diff.status).toBe('change');
    expect(diff.counts).toEqual({ added: 1, changed: 1, removed: 1 });
    expect(diff.items.map(item => item.kind).sort()).toEqual(['削除', '変更', '追加']);
    expect(diff.items.some(item => item.kind === '保持')).toBe(false);
  });

  it('取得に失敗した項目は error とし、どちら側のどの項目かを理由に含める', () => {
    const ok = { views: {}, revision: '10' };
    const failed = compareDeploySection('viewSettings', ok, { _fetchError: 'HTTP 500\n詳細' });
    expect(failed.status).toBe('error');
    expect(failed.message).toBe('プレビューのビュー設定を取得できません（HTTP 500）。');
    const both = compareDeploySection('viewSettings', { _partial: { kind: 'x' } }, undefined);
    expect(both.status).toBe('error');
    expect(both.message).toContain('本番のビュー設定を完全に取得できません');
    expect(both.message).toContain('プレビューのビュー設定を取得できません');
    expect(both.items).toEqual([]);
  });

  it('項目の形が不正（オブジェクトでない）なら error、未知の項目でも内容が違えば change にする', () => {
    expect(compareDeploySection('viewSettings', 'a', 'b').status).toBe('error');
    const unknown = compareDeploySection('unknownSection', { x: 1, revision: '1' }, { x: 2, revision: '2' });
    expect(unknown.status).toBe('change');
    expect(unknown.items.length).toBeGreaterThan(0);
  });

  it('JS/CSS の FILE は fileKey ではなくファイル名とサイズで比べる', () => {
    const file = (fileKey: string, name = 'app.js', size = '10') => ({ type: 'FILE', file: { fileKey, name, size, contentType: 'text/javascript' } });
    const customize = (list: any[], revision = '10') => ({ scope: 'ALL', desktop: { js: list, css: [] }, mobile: { js: [], css: [] }, revision });
    const same = compareDeploySection('customizeSettings', customize([file('prod-key')]), customize([file('preview-key')], '12'));
    expect(same.status).toBe('same');
    const resized = compareDeploySection('customizeSettings', customize([file('prod-key')]), customize([file('preview-key', 'app.js', '12')], '12'));
    expect(resized.status).toBe('change');
    expect(resized.counts.changed).toBe(1);
    expect(resized.items[0].details.join()).toContain('差し替え');
    const renamed = compareDeploySection('customizeSettings', customize([file('k')]), customize([file('k', 'new.js')], '12'));
    expect(renamed.status).toBe('change');
    // 比較のために元の設定を書き換えない
    const original = customize([file('prod-key')]);
    compareDeploySection('customizeSettings', original, customize([file('x', 'b.js')]));
    expect(original.desktop.js[0].file).toEqual({ fileKey: 'prod-key', name: 'app.js', size: '10', contentType: 'text/javascript' });
  });
});

describe('findRemovedFields', () => {
  it('本番にあってプレビューに無いフィールドを返す（テーブル内は table 付き）', () => {
    const production = {
      properties: {
        keep: field('keep', '残す'),
        gone: field('gone', '消える', 'NUMBER'),
        tbl: { type: 'SUBTABLE', code: 'tbl', fields: { inner_keep: field('inner_keep', '行の残す'), inner_gone: field('inner_gone', '行の消える') } }
      }
    };
    const preview = { properties: { keep: field('keep', '残す'), tbl: { type: 'SUBTABLE', code: 'tbl', fields: { inner_keep: field('inner_keep', '行の残す') } } } };
    expect(findRemovedFields(production, preview)).toEqual([
      { code: 'gone', label: '消える', type: 'NUMBER' },
      { code: 'inner_gone', label: '行の消える', type: 'SINGLE_LINE_TEXT', table: 'tbl' }
    ]);
  });

  it('システムフィールドは除く', () => {
    const production = { properties: { 作成者: { type: 'CREATOR', code: '作成者', label: '作成者' }, 更新日時: { type: 'UPDATED_TIME', code: '更新日時', label: '更新日時' }, ステータス: { type: 'STATUS', code: 'ステータス', label: 'ステータス' }, 作業者: { type: 'STATUS_ASSIGNEE', code: '作業者', label: '作業者' }, レコード番号: { type: 'RECORD_NUMBER', code: 'レコード番号', label: 'レコード番号' }, カテゴリー: { type: 'CATEGORY', code: 'カテゴリー', label: 'カテゴリー' } } };
    expect(findRemovedFields(production, { properties: {} })).toEqual([]);
  });

  it('値を持たないグループ・関連レコード一覧は除く（値の残るフィールドだけを数える）', () => {
    const production = { properties: { g: { type: 'GROUP', code: 'g', label: '見出し' }, rel: { type: 'REFERENCE_TABLE', code: 'rel', label: '関連' }, memo: { type: 'MULTI_LINE_TEXT', code: 'memo', label: 'メモ' } } };
    expect(findRemovedFields(production, { properties: {} }).map(field => field.code)).toEqual(['memo']);
  });
  it('同じ種類・同じ表示名で本番に無いコードがプレビューにあれば possibleRename に入れる', () => {
    const production = properties(field('cust_name', '顧客名'), field('amount', '金額', 'NUMBER'), field('memo', 'メモ'));
    const preview = properties(field('customer_name', '顧客名'), field('amount_text', '金額'), field('memo2', '別のメモ'));
    expect(findRemovedFields(production, preview)).toEqual([
      { code: 'cust_name', label: '顧客名', type: 'SINGLE_LINE_TEXT', possibleRename: 'customer_name' },
      // 種類が違う（NUMBER と SINGLE_LINE_TEXT）ものは候補にしない
      { code: 'amount', label: '金額', type: 'NUMBER' },
      { code: 'memo', label: 'メモ', type: 'SINGLE_LINE_TEXT' }
    ]);
    // 本番にも存在するコードは「新しいフィールド」ではないので候補にしない
    const both = properties(field('a', '共通'), field('b', '共通'));
    expect(findRemovedFields(both, properties(field('b', '共通')))).toEqual([{ code: 'a', label: '共通', type: 'SINGLE_LINE_TEXT' }]);
  });

  it('削除されるテーブルは 1 件として数え、中のフィールドは別に数えない。形が不正でも例外にしない', () => {
    const production = { properties: { tbl: { type: 'SUBTABLE', code: 'tbl', label: '明細', fields: { a: field('a') } } } };
    expect(findRemovedFields(production, { properties: {} })).toEqual([{ code: 'tbl', label: '明細', type: 'SUBTABLE' }]);
    expect(findRemovedFields(undefined, null)).toEqual([]);
    expect(findRemovedFields({ _fetchError: 'x' }, { properties: {} })).toEqual([]);
  });
});

describe('buildDeployWarnings', () => {
  const diff = (sectionKey: string, status: 'change' | 'same' = 'change') => ({ sectionKey, label: deploySectionLabel(sectionKey), status, items: [], counts: { added: 0, changed: 0, removed: 0 } });

  it('プロセス管理とカテゴリーが有効から無効に変わるときに注意する', () => {
    const warnings = buildDeployWarnings({
      sections: [diff('processSettings'), diff('categories')], contentSame: false,
      production: { processSettings: { enable: true }, categories: { enabled: true } },
      preview: { processSettings: { enable: false }, categories: { enabled: false } }
    });
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('プロセス管理が有効から無効');
    expect(warnings[1]).toContain('カテゴリー機能が有効から無効');
  });

  it('無効から有効、変更なしでは注意しない。アクセス権の変更と revision だけの違いは注意する', () => {
    expect(buildDeployWarnings({ sections: [diff('processSettings')], contentSame: false, production: { processSettings: { enable: false } }, preview: { processSettings: { enable: true } } })).toEqual([]);
    expect(buildDeployWarnings({ sections: [diff('processSettings', 'same')], contentSame: false, production: { processSettings: { enable: true } }, preview: { processSettings: { enable: false } } })).toEqual([]);
    const acl = buildDeployWarnings({ sections: [diff('appAcl'), diff('fieldAcl'), diff('viewSettings')], contentSame: false, production: {}, preview: {} });
    expect(acl).toHaveLength(1);
    expect(acl[0]).toContain('アプリ権限、フィールド権限');
    const same = buildDeployWarnings({ sections: [diff('viewSettings', 'same')], contentSame: true, production: {}, preview: {} });
    expect(same).toHaveLength(1);
    expect(same[0]).toContain('revision');
  });
});
