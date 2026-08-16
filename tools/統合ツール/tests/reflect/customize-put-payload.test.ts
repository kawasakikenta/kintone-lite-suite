import { describe, expect, it } from 'vitest';
import { buildCustomizeSettingsPutPayload, SECTION_DEFS } from '../../src/constants';

describe('customizeSettings PUT payload', () => {
  it('keeps only the API-writable FILE and URL fields without mutating the source', () => {
    const input = {
      scope: 'ALL',
      revision: '42',
      _partial: { message: '本文未取得' },
      desktop: {
        js: [{
          type: 'FILE',
          name: 'app.js',
          file: {
            fileKey: 'desktop-js-key',
            name: 'app.js',
            contentType: 'application/javascript',
            size: '123',
            _body: 'virtual diff body'
          },
          _bodyText: 'console.log("secret");',
          _bodyHash: 'deadbeef',
          _bodyUnavailable: 'oversize'
        }, {
          type: 'URL',
          url: 'https://example.test/app.js',
          name: 'GET only name',
          _bodyText: 'internal'
        }],
        css: [{
          type: 'FILE',
          file: { fileKey: 'desktop-css-key', name: 'app.css' },
          _bodyText: 'body { color: red; }'
        }]
      },
      mobile: {
        js: [{ type: 'URL', url: 'https://example.test/mobile.js', revision: 'GET only' }],
        css: [{
          type: 'FILE',
          file: { fileKey: 'mobile-css-key', _body: 'virtual diff body' },
          _bodyHash: 'cafebabe'
        }]
      }
    };
    const before = structuredClone(input);

    const payload = buildCustomizeSettingsPutPayload(input);

    expect(payload).toEqual({
      desktop: {
        js: [
          { type: 'FILE', file: { fileKey: 'desktop-js-key' } },
          { type: 'URL', url: 'https://example.test/app.js' }
        ],
        css: [{ type: 'FILE', file: { fileKey: 'desktop-css-key' } }]
      },
      mobile: {
        js: [{ type: 'URL', url: 'https://example.test/mobile.js' }],
        css: [{ type: 'FILE', file: { fileKey: 'mobile-css-key' } }]
      }
    });
    expect(input).toEqual(before);
    expect(JSON.stringify(payload)).not.toMatch(/_body|_partial|revision|contentType|"name"/);
  });

  it('returns complete empty platform buckets and drops invalid resources', () => {
    expect(buildCustomizeSettingsPutPayload({
      desktop: {
        js: [null, { type: 'FILE', file: {} }, { type: 'URL', url: '' }, { type: 'OTHER', value: 'x' }]
      }
    })).toEqual({
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] }
    });
  });

  it('is wired to the customizeSettings section definition', () => {
    const def = SECTION_DEFS.find((item) => item.key === 'customizeSettings');
    const input = {
      desktop: { js: [{ type: 'FILE', file: { fileKey: 'key', name: 'drop.js' }, _bodyText: 'drop' }], css: [] },
      mobile: { js: [], css: [] }
    };

    expect(def?.putBuilder?.(input)).toEqual(buildCustomizeSettingsPutPayload(input));
  });
});
