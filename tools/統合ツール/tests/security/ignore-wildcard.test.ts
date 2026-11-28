import { describe, expect, it } from 'vitest';
import { buildDiffHtml } from '../../src/diff/export';
import { isIgnoredPath, parseIgnoreRules } from '../../src/diff/engine';

/** 以前の照合（`*` だけを `.*` にした正規表現）。結果が変わっていないことを確かめる基準にする。 */
function regexOracle(token: string): RegExp {
  const escaped = token.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/** 決まった順の疑似乱数（失敗したときに同じ入力で再現できるように）。 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomText(random: () => number, alphabet: string[], maxLength: number): string {
  const length = Math.floor(random() * (maxLength + 1));
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(random() * alphabet.length)];
  return out;
}

/** 前後の空白を除いても変わらない、`.` と `*` を含むパターン（パスのワイルドカードのルールとして読まれる）。 */
function randomPathPattern(random: () => number): string {
  const head = randomText(random, ['a', 'b', '.', '*', '*', '\u2028'], 4);
  const tail = randomText(random, ['a', 'b', '.', '*', '*', '\u2028'], 4);
  return `a${head}*${tail}.b`;
}

const manyStarRule = '*.*.*.*.*.*.*.label';
const longDottedPath = `viewSettings.views.${'a.'.repeat(60)}x`;

function reportIgnoreParser(): (text: string) => any {
  const html = buildDiffHtml({ appId: '1', sections: {} }, { appId: '2', sections: {} }, [], ['appSettings'], '', {});
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] || '';
  const start = script.indexOf('  function normIgnoreToken(');
  const end = script.indexOf('  // 名前付きの設定（一覧・グラフ・ステータスなど）', start);
  if (start < 0 || end < 0) throw new Error('ignore rule parser was not found in the report script');
  return new Function(`${script.slice(start, end)}\nreturn parseExtraIgnoreRules;`)();
}

describe('無視ルールのワイルドカード（比較）', () => {
  it('`*` の多いルールと長いパスでも、すぐに判定が終わる', () => {
    const rules = parseIgnoreRules(manyStarRule);
    const started = performance.now();
    expect(isIgnoredPath(rules, longDottedPath)).toBe(false);
    expect(isIgnoredPath(rules, `${longDottedPath}.label`)).toBe(true);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it('照合の結果は以前の正規表現と同じ（改行は `*` に含めない）', () => {
    const random = seededRandom(20261128);
    const values = ['a', 'b', '.', '\n', '\r', '\u2028', '\u2029', '*'];
    for (let i = 0; i < 4000; i += 1) {
      const token = randomPathPattern(random);
      const matcher = parseIgnoreRules(token).pathPatterns[0];
      expect(matcher, token).toBeTruthy();
      const oracle = regexOracle(token);
      for (let j = 0; j < 4; j += 1) {
        const value = random() < 0.5 ? `a${randomText(random, values, 9)}.b` : randomText(random, values, 9);
        expect(matcher.test(value), JSON.stringify({ token, value })).toBe(oracle.test(value));
      }
    }
  });

  it('キー名のワイルドカードも同じ照合になる', () => {
    const rules = parseIgnoreRules('*time*');
    expect(isIgnoredPath(rules, 'appSettings.updatedTime')).toBe(true);
    expect(isIgnoredPath(rules, 'appSettings.name')).toBe(false);
  });
});

describe('無視ルールのワイルドカード（差分HTMLレポートの詳細オプション）', () => {
  const parseExtraIgnoreRules = reportIgnoreParser();

  it('`*` の多いルールと長いパスでも、すぐに判定が終わる', () => {
    const rules = parseExtraIgnoreRules(manyStarRule);
    const matcher = rules.pathPatterns[0];
    const started = performance.now();
    expect(matcher.test(longDottedPath.toLowerCase())).toBe(false);
    expect(matcher.test(`${longDottedPath}.label`.toLowerCase())).toBe(true);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it('照合の結果は以前の正規表現と同じ（改行は `*` に含めない）', () => {
    const random = seededRandom(1128);
    const values = ['a', 'b', '.', '\n', '\r', '\u2028', '\u2029', '*'];
    for (let i = 0; i < 2000; i += 1) {
      const token = randomPathPattern(random);
      const matcher = parseExtraIgnoreRules(token).pathPatterns[0];
      const oracle = regexOracle(token);
      for (let j = 0; j < 4; j += 1) {
        const value = random() < 0.5 ? `a${randomText(random, values, 9)}.b` : randomText(random, values, 9);
        expect(matcher.test(value), JSON.stringify({ token, value })).toBe(oracle.test(value));
      }
    }
  });
});
