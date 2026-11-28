import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDiffHtml } from '../../src/diff/export';
import { sha256Base64, sha256Hex } from '../../src/diff/export-safety';

const source = { appId: '10', sections: { appSettings: { name: '顧客管理</script><script>alert(1)</script>' } } };
const target = { appId: '11', sections: { appSettings: { name: '顧客管理（新）\u2028' } } };
const rows = [{
  sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed', path: 'appSettings.name',
  left: source.sections.appSettings.name, right: target.sections.appSettings.name
}];

function cspOf(html: string): string {
  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  return match ? match[1] : '';
}

function directives(csp: string): Map<string, string> {
  return new Map(csp.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\s+/);
    return [name, values.join(' ')];
  }));
}

describe('差分HTMLレポートの CSP', () => {
  for (const exportContentMode of ['diffOnly', 'withCompared'] as const) {
    it(`外部への通信・フォーム送信・<base> を禁じ、埋め込んだスクリプトだけを実行させる（${exportContentMode}）`, () => {
      const html = buildDiffHtml(source, target, rows, ['appSettings'], '', { exportContentMode });
      const csp = cspOf(html);
      expect(csp, 'CSP の meta がありません').not.toBe('');
      // CSP の meta は、スクリプト・スタイルより前（head の先頭近く）に置く
      expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<style>'));

      const policy = directives(csp);
      expect(policy.get('default-src')).toBe("'none'");
      expect(policy.get('connect-src')).toBe("'none'");
      expect(policy.get('object-src')).toBe("'none'");
      expect(policy.get('base-uri')).toBe("'none'");
      expect(policy.get('form-action')).toBe("'none'");
      expect(policy.get('frame-src')).toBe("'none'");
      expect(policy.get('style-src')).toBe("'unsafe-inline'");

      // スクリプトは内容のハッシュで許可する（'unsafe-inline' にしない。差し込まれた onerror などは動かない）
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
      expect(scripts).toHaveLength(1);
      const hash = createHash('sha256').update(scripts[0], 'utf8').digest('base64');
      expect(policy.get('script-src')).toBe(`'sha256-${hash}'`);
      expect(csp).not.toContain('unsafe-eval');
      expect(policy.get('script-src')).not.toContain('unsafe-inline');
    });
  }

  it('スクリプトにインラインのイベント属性や javascript: を使っていない（ハッシュの CSP で動く）', () => {
    const html = buildDiffHtml(source, target, rows, ['appSettings'], '', { exportContentMode: 'withCompared' });
    const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
    expect(markup).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
  });
});

describe('CSP のハッシュに使う SHA-256', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  // 文字コードで組み立てる（サロゲートの対・対になっていないサロゲート・3 バイト文字・ブロック境界の長さを含める）
  const pieces = [0x41, 0x7e, 0xe9, 0x3042, 0x2028, 0xd83d, 0xde00, 0xd800, 0xdc00, 0xfffd, 0x0a, 0x00].map((code) => String.fromCharCode(code));

  it('Node の crypto と同じ結果になる', () => {
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 0x100000000; };
    const lengths = [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000];
    for (let round = 0; round < 300; round += 1) {
      const length = round < lengths.length ? lengths[round] : Math.floor(random() * 300);
      let text = '';
      while (text.length < length) text += random() < 0.6 ? 'a' : pieces[Math.floor(random() * pieces.length)];
      expect(sha256Hex(text), JSON.stringify(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
      expect(sha256Base64(text)).toBe(createHash('sha256').update(text, 'utf8').digest('base64'));
    }
  });

  it('TextEncoder の無い環境でも使え、大きなレポートでも時間がかからない', () => {
    vi.stubGlobal('TextEncoder', undefined);
    const text = ('kintone' + pieces[3] + pieces[5] + pieces[6]).repeat(400000);
    const started = performance.now();
    const hash = sha256Base64(text);
    expect(performance.now() - started).toBeLessThan(3000);
    vi.unstubAllGlobals();
    expect(hash).toBe(createHash('sha256').update(text, 'utf8').digest('base64'));
  });
});
