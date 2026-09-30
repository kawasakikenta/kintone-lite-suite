import { describe, it, expect } from 'vitest';
import {
  computeDiffRows,
  summarizeRows,
  isNotationOnlyChange,
  parseIgnoreRules,
  isIgnoredPath,
  isIgnoredKey,
  hasIncompleteActualDiffTruncation,
  preprocessCustomizePairForDiff
} from '../../src/diff/engine';

function run(source: Record<string, any>, target: Record<string, any>, sections: string[], ignore = '', options: any = {}) {
  return computeDiffRows({ sections: source }, { sections: target }, sections, ignore, options);
}

function actual(rows: any[]) {
  return rows.filter((row) => row.type !== 'same');
}

const ALL_PRESETS = {
  viewOrder: true,
  permissionOrder: true,
  generalArrayOrder: true,
  fieldOrder: true,
  processOrder: true
};

describe('diff/engine ロジック検証', () => {
  describe('キー付き配列の moved 判定（追加/削除による位置ずれを移動にしない）', () => {
    const plugins = (ids: string[]) => ({ plugins: ids.map((id) => ({ id, name: `plugin-${id}`, enabled: true })) });
    const rights = (codes: string[]) => ({
      rights: codes.map((code) => ({ entity: { type: 'USER', code }, appEditable: true }))
    });

    it('先頭への追加で後続要素を moved にしない（単一キー配列）', () => {
      const rows = actual(run(
        { pluginSettings: plugins(['a', 'b', 'c']) },
        { pluginSettings: plugins(['x', 'a', 'b', 'c']) },
        ['pluginSettings']
      ).rows);
      expect(rows.map((row: any) => [row.type, row.path])).toEqual([['added', 'pluginSettings.plugins[0]']]);
    });

    it('先頭の削除で後続要素を moved にしない（複合キー配列）', () => {
      const rows = actual(run(
        { appAcl: rights(['x', 'a', 'b']) },
        { appAcl: rights(['a', 'b']) },
        ['appAcl']
      ).rows);
      expect(rows.map((row: any) => [row.type, row.path])).toEqual([['removed', 'appAcl.rights[0]']]);
    });

    it('CREATOR のようにコードを持たないエンティティの削除でも後続を moved にしない', () => {
      const rows = actual(run(
        { appAcl: { rights: [{ entity: { type: 'CREATOR' }, appEditable: true }, { entity: { type: 'GROUP', code: 'g' }, appEditable: true }] } },
        { appAcl: { rights: [{ entity: { type: 'GROUP', code: 'g' }, appEditable: true }] } },
        ['appAcl']
      ).rows);
      expect(rows.map((row: any) => [row.type, row.moved || false])).toEqual([['removed', false]]);
    });

    it('レイアウト行内へのフィールド挿入・削除で後続フィールドを moved にしない', () => {
      const layout = (codes: string[]) => ({
        layout: [{ type: 'ROW', fields: codes.map((code) => ({ type: 'SINGLE_LINE_TEXT', code, size: { width: '200' } })) }]
      });
      const inserted = actual(run({ layoutSettings: layout(['a', 'b']) }, { layoutSettings: layout(['a', 'x', 'b']) }, ['layoutSettings']).rows);
      expect(inserted.map((row: any) => [row.type, row.path])).toEqual([['added', 'layoutSettings.layout[0].fields[1]']]);
      const removed = actual(run({ layoutSettings: layout(['a', 'b', 'c']) }, { layoutSettings: layout(['a', 'c']) }, ['layoutSettings']).rows);
      expect(removed.map((row: any) => [row.type, row.path])).toEqual([['removed', 'layoutSettings.layout[0].fields[1]']]);
    });

    it('本当の並び替えは追加/削除が混在しても moved として残す', () => {
      const rows = actual(run(
        { pluginSettings: plugins(['a', 'b', 'c']) },
        { pluginSettings: plugins(['x', 'c', 'a', 'b']) },
        ['pluginSettings']
      ).rows);
      expect(rows.filter((row: any) => row.type === 'added')).toHaveLength(1);
      // a, b, c の相対順位は (a,b,c) → (c,a,b) に変わっている
      expect(rows.filter((row: any) => row.moved).length).toBeGreaterThan(0);
      expect(rows.some((row: any) => row.type === 'removed')).toBe(false);
    });

    it('2 要素の入れ替えは従来どおり両方を moved として報告する', () => {
      const rows = actual(run(
        { pluginSettings: plugins(['a', 'b']) },
        { pluginSettings: plugins(['b', 'a']) },
        ['pluginSettings']
      ).rows);
      expect(rows).toHaveLength(2);
      expect(rows.every((row: any) => row.moved)).toBe(true);
    });
  });

  describe('正規化プリセットが名前付きマップの識別子を差分から消さない', () => {
    const opts = { normalizationPresetState: ALL_PRESETS };

    it.each(['order', 'no', 'index', 'x', 'y', 'revision', 'creator'])('フィールドコード %s の削除を検出する', (code) => {
      const rows = actual(run(
        { fieldSettings: { properties: { [code]: { code, type: 'SINGLE_LINE_TEXT', label: 'x' } } } },
        { fieldSettings: { properties: {} } },
        ['fieldSettings'],
        '',
        opts
      ).rows);
      expect(rows.map((row: any) => [row.type, row.path])).toEqual([['removed', `fieldSettings.properties.${code}`]]);
    });

    it('サブテーブル内フィールド・ビュー・ステータス・アクションの識別子も残す', () => {
      const sub = (fields: any) => ({ properties: { t: { code: 't', type: 'SUBTABLE', fields } } });
      expect(actual(run(
        { fieldSettings: sub({ order: { code: 'order', type: 'NUMBER' } }) },
        { fieldSettings: sub({}) },
        ['fieldSettings'], '', opts
      ).rows).map((row: any) => row.path)).toEqual(['fieldSettings.properties.t.fields.order']);

      expect(actual(run(
        { viewSettings: { views: { order: { name: 'order', type: 'LIST', index: '0' } } } },
        { viewSettings: { views: {} } },
        ['viewSettings'], '', opts
      ).rows).map((row: any) => row.path)).toEqual(['viewSettings.views.order']);

      expect(actual(run(
        { processSettings: { enable: true, states: { index: { name: 'index', index: '0' } }, actions: [] } },
        { processSettings: { enable: true, states: {}, actions: [] } },
        ['processSettings'], '', opts
      ).rows).map((row: any) => row.path)).toEqual(['processSettings.states.index']);

      expect(actual(run(
        { actionSettings: { actions: { order: { name: 'order', id: '1', index: '0' } } } },
        { actionSettings: { actions: {} } },
        ['actionSettings'], '', opts
      ).rows).map((row: any) => row.path)).toEqual(['actionSettings.actions.order']);
    });

    it('実体の内側の index / no / order プロパティはプリセットで従来どおり無視する', () => {
      const rows = actual(run(
        { viewSettings: { views: { A: { name: 'A', type: 'LIST', index: '0' } } } },
        { viewSettings: { views: { A: { name: 'A', type: 'LIST', index: '5' } } } },
        ['viewSettings'], '', opts
      ).rows);
      expect(rows).toHaveLength(0);
    });

    it('ユーザー指定の葉キー無視でもアクション名・選択肢ラベルの識別子を消さない', () => {
      const removedAction = actual(run(
        { actionSettings: { actions: { index: { name: 'index', id: '1' } } } },
        { actionSettings: { actions: {} } },
        ['actionSettings'], 'index'
      ).rows);
      expect(removedAction.map((row: any) => row.path)).toEqual(['actionSettings.actions.index']);

      const dropdown = (options: any) => ({ properties: { d: { code: 'd', type: 'DROP_DOWN', options } } });
      const removedOption = actual(run(
        { fieldSettings: dropdown({ order: { label: 'order', index: '0' } }) },
        { fieldSettings: dropdown({}) },
        ['fieldSettings'], 'order'
      ).rows);
      expect(removedOption.map((row: any) => row.path)).toEqual(['fieldSettings.properties.d.options.order']);
    });
  });

  describe('上限到達時の打ち切り報告', () => {
    it('LCS の移動統合で件数が上限未満に戻っても、未列挙が残る区間を「完全」と報告しない', () => {
      const build = (side: 'source' | 'target') => {
        const o: Record<string, any> = {};
        for (let i = 0; i < 997; i++) o[`a${String(i).padStart(4, '0')}`] = side === 'source' ? 1 : 2;
        // 'X' は移動（削除+追加）。後続のオブジェクト 3 件は削除。LCS は上限到達で列挙を打ち切る。
        o.z = side === 'source' ? ['X', 'p1', 'p2', { r: 1 }, { r: 2 }, { r: 3 }] : ['p1', 'p2', 'X'];
        return o;
      };
      const result = run({ appSettings: build('source') }, { appSettings: build('target') }, ['appSettings']);
      expect(result.truncation.truncated).toBe(true);
      expect(hasIncompleteActualDiffTruncation(result.truncation)).toBe(true);
      expect(result.truncation.sections.find((s: any) => s.sectionKey === 'appSettings')?.scanStatus).toBe('partial');
    });

    it('上限到達後の後続セクションは未走査として報告する（統合で件数が戻っても）', () => {
      const source: Record<string, any> = { appSettings: {} };
      const target: Record<string, any> = { appSettings: {} };
      for (let i = 0; i < 997; i++) {
        source.appSettings[`a${String(i).padStart(4, '0')}`] = 1;
        target.appSettings[`a${String(i).padStart(4, '0')}`] = 2;
      }
      source.appSettings.z = ['X', 'p1', 'p2', { r: 1 }, { r: 2 }, { r: 3 }];
      target.appSettings.z = ['p1', 'p2', 'X'];
      source.appAcl = { rights: [{ entity: { type: 'USER', code: 'u' }, appEditable: true }] };
      target.appAcl = { rights: [{ entity: { type: 'USER', code: 'u' }, appEditable: false }] };
      const result = run(source, target, ['appSettings', 'appAcl']);
      expect(result.truncation.sections.find((s: any) => s.sectionKey === 'appAcl')?.scanStatus).toBe('unscanned');
    });
  });

  describe('JS/CSS 本文比較（customizeSettings）', () => {
    const file = (name: string, fileKey: string, body?: string) => ({
      type: 'FILE',
      file: { name, fileKey, contentType: 'text/javascript', size: '1' },
      ...(body !== undefined ? { _bodyText: body } : {})
    });
    const bundle = (items: any[]) => ({ desktop: { js: items, css: [] }, mobile: { js: [], css: [] } });

    it('両側で本文取得済みなら、同一本文で fileKey だけ違っても差分にしない', () => {
      const rows = actual(run(
        { customizeSettings: bundle([file('a.js', 'k1', 'console.log(1);')]) },
        { customizeSettings: bundle([file('a.js', 'k2', 'console.log(1);')]) },
        ['customizeSettings']
      ).rows);
      expect(rows).toHaveLength(0);
    });

    it('本文が違えば _body の changed だけを報告し、fileKey の追加/削除にならない', () => {
      const rows = actual(run(
        { customizeSettings: bundle([file('a.js', 'k1', 'x')]) },
        { customizeSettings: bundle([file('a.js', 'k2', 'y')]) },
        ['customizeSettings']
      ).rows);
      expect(rows.map((row: any) => [row.type, row.path, row.left, row.right])).toEqual([
        ['changed', 'customizeSettings.desktop.js[0].file._body', 'x', 'y']
      ]);
    });

    it('比較の向きを入れ替えても結果が対称になる', () => {
      const a = bundle([file('a.js', 'k1', 'x')]);
      const b = bundle([file('a.js', 'k2', 'y')]);
      const forward = actual(run({ customizeSettings: a }, { customizeSettings: b }, ['customizeSettings']).rows);
      const backward = actual(run({ customizeSettings: b }, { customizeSettings: a }, ['customizeSettings']).rows);
      expect(forward.map((row: any) => row.path)).toEqual(backward.map((row: any) => row.path));
    });

    it('片側だけ本文取得済みなら両側とも fileKey 比較に揃える', () => {
      const pair = preprocessCustomizePairForDiff(
        bundle([file('a.js', 'k1', 'x')]),
        bundle([file('a.js', 'k2')])
      );
      expect(pair.source.desktop.js[0].file.fileKey).toBe('k1');
      expect(pair.target.desktop.js[0].file.fileKey).toBe('k2');
      expect(pair.source.desktop.js[0].file._body).toBeUndefined();
    });
  });

  describe('表記ゆれ判定', () => {
    it('倍精度で丸められる長い数値文字列を同値扱いにしない', () => {
      expect(isNotationOnlyChange('12345678901234567890', '12345678901234567891')).toBe(false);
      expect(isNotationOnlyChange('9007199254740993', '9007199254740992')).toBe(false);
    });

    it('16 進・指数・特殊値の文字列を数値表記ゆれとして扱わない（10 進表記のみ同値）', () => {
      expect(isNotationOnlyChange('0x10', '16')).toBe(false);
      expect(isNotationOnlyChange('Infinity', '1e999')).toBe(false);
    });

    it('従来の同値判定は維持する', () => {
      expect(isNotationOnlyChange('100', 100)).toBe(true);
      expect(isNotationOnlyChange('1.0', 1)).toBe(true);
      expect(isNotationOnlyChange('1', '1.00')).toBe(true);
      expect(isNotationOnlyChange('true', true)).toBe(true);
      expect(isNotationOnlyChange('TRUE', 'true')).toBe(true);
      expect(isNotationOnlyChange(' 5 ', 5)).toBe(true);
      expect(isNotationOnlyChange('', 0)).toBe(false);
      expect(isNotationOnlyChange('0', false)).toBe(false);
      expect(isNotationOnlyChange(null, '')).toBe(false);
      expect(isNotationOnlyChange(1, 2)).toBe(false);
    });
  });

  describe('対称性・自己一致・includeSame 不変（回帰確認）', () => {
    let seed = 20240607;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const pick = <T,>(items: T[]): T => items[Math.floor(rnd() * items.length)];

    const gen = (kind: string): any => {
      switch (kind) {
        case 'fieldSettings': {
          const properties: Record<string, any> = {};
          const count = Math.floor(rnd() * 4);
          for (let i = 0; i < count; i++) {
            const code = pick(['a', 'b', 'c', 'd']);
            properties[code] = rnd() < 0.3
              ? { code, type: 'SUBTABLE', fields: { x: { code: 'x', type: 'SINGLE_LINE_TEXT', label: pick(['p', 'q']) } } }
              : { code, type: pick(['SINGLE_LINE_TEXT', 'NUMBER']), label: pick(['L1', 'L2']), required: pick([true, false]) };
          }
          return { properties };
        }
        case 'layoutSettings':
          return { layout: Array.from({ length: Math.floor(rnd() * 4) }, () => ({
            type: 'ROW',
            fields: Array.from({ length: Math.floor(rnd() * 3) }, () => ({ type: 'SINGLE_LINE_TEXT', code: pick(['a', 'b', 'c']), size: { width: pick(['100', '200']) } }))
          })) };
        case 'appAcl': {
          const seen = new Set<string>();
          const rights: any[] = [];
          for (let i = 0; i < Math.floor(rnd() * 4); i++) {
            const code = pick(['u1', 'u2', 'u3']);
            if (seen.has(code)) continue;
            seen.add(code);
            rights.push({ entity: { type: 'USER', code }, appEditable: pick([true, false]) });
          }
          return { rights };
        }
        case 'processSettings': {
          const names = ['s1', 's2', 's3'].slice(0, 1 + Math.floor(rnd() * 3));
          const states: Record<string, any> = {};
          names.forEach((name, i) => { states[name] = { name, index: String(i), assignee: { type: pick(['ONE', 'ALL']), entities: [] } }; });
          return {
            enable: pick([true, false]),
            states,
            actions: Array.from({ length: Math.floor(rnd() * 3) }, () => ({ name: pick(['go', 'back']), from: pick(names), to: pick(names), filterCond: pick(['', 'x']) }))
          };
        }
        case 'perRecordNotifications':
          return { notifications: Array.from({ length: Math.floor(rnd() * 4) }, () => ({ title: pick(['t1', 't2', 't2', '']), filterCond: pick(['a', 'b']) })) };
        default:
          return { notifications: Array.from({ length: Math.floor(rnd() * 3) }, () => ({ entity: { type: 'USER', code: pick(['u1', 'u2', 'u3']) }, includeSubs: pick([true, false]) })) };
      }
    };

    it('source/target を入れ替えると added⇔removed が入れ替わり、同一入力は 0 件、includeSame で実差分件数が変わらない', () => {
      const kinds = ['fieldSettings', 'layoutSettings', 'appAcl', 'processSettings', 'perRecordNotifications', 'notifications'];
      for (let n = 0; n < 400; n++) {
        const kind = pick(kinds);
        const s = rnd() < 0.05 ? undefined : gen(kind);
        const t = rnd() < 0.05 ? undefined : gen(kind);
        const forward = summarizeRows(actual(run({ [kind]: s }, { [kind]: t }, [kind]).rows));
        const backward = summarizeRows(actual(run({ [kind]: t }, { [kind]: s }, [kind]).rows));
        const withSame = summarizeRows(actual(run({ [kind]: s }, { [kind]: t }, [kind], '', { includeSame: true }).rows));
        const ctx = JSON.stringify({ kind, s, t, forward, backward });
        expect(backward.added, ctx).toBe(forward.removed);
        expect(backward.removed, ctx).toBe(forward.added);
        expect(backward.changed, ctx).toBe(forward.changed);
        expect(withSame, ctx).toEqual(forward);
        expect(run({ [kind]: s }, { [kind]: s }, [kind]).rows, ctx).toHaveLength(0);
      }
    });
  });

  describe('無視ルール（回帰確認）', () => {
    it('ワイルドカード・path: 完全一致・キー名とパスを区別する', () => {
      const rules = parseIgnoreRules('label\nfieldSettings.properties.*.label\npath:fieldSettings.properties.a.b\n*id');
      expect(isIgnoredKey(rules, 'LABEL')).toBe(true);
      expect(isIgnoredKey(rules, 'appId')).toBe(true);
      expect(isIgnoredPath(rules, 'fieldSettings.properties.x.label')).toBe(true);
      // フィールドコードが label でも、名前付きマップ直下は識別子として消さない
      expect(isIgnoredPath(rules, 'fieldSettings.properties.label')).toBe(false);
      expect(isIgnoredPath(rules, 'fieldSettings.properties.a.b')).toBe(true);
      expect(isIgnoredPath(rules, 'FieldSettings.Properties.A.B')).toBe(false);
    });
  });
});
