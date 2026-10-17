import { describe, expect, it } from 'vitest';

import { contentIdentifier, isSensitiveDiffPath, maskSensitiveDiffRows, maskSensitiveDiffValue, sha256Hex } from '../../src/diff/export-safety.js';

describe('export content identifiers', () => {
  it('matches standard SHA-256 vectors for ASCII and UTF-8 text', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('差分比較')).toBe('3d3e7c165e017b381b38b68a7550a0e732cb65772c9ea1fb9ca7bc954c0287f9');
  });

  it('creates a labeled 128-bit identifier without exposing the source text', () => {
    const identifier = contentIdentifier('client-secret-value');
    expect(identifier).toMatch(/^SHA256-[0-9A-F]{16}$/);
    expect(identifier).toBe('SHA256-C1A39329C3E1799F');
    expect(identifier).not.toContain('secret');
  });

  it('detects sensitive paths and masks sensitive strings and nested object keys with SHA-256 identifiers', () => {
    expect(isSensitiveDiffPath('customizeSettings.desktop.js[0]._body', 'customizeSettings')).toBe(true);
    expect(isSensitiveDiffPath('pluginSettings.plugins[0]._config', 'pluginSettings')).toBe(true);
    expect(isSensitiveDiffPath('pluginSettings.plugins[0].apiToken', 'pluginSettings')).toBe(true);
    expect(isSensitiveDiffPath('fieldSettings.properties.name.label', 'fieldSettings')).toBe(false);

    const maskedBody = maskSensitiveDiffValue('console.log("secret-js");', 'customizeSettings.desktop.js[0]._body', 'customizeSettings');
    expect(maskedBody).toMatch(/^\[マスク済み: SHA256-[0-9A-F]{16}\]$/);
    expect(maskedBody).not.toContain('secret-js');

    const rows = maskSensitiveDiffRows([
      {
        sectionKey: 'pluginSettings',
        path: 'pluginSettings.plugins[0]',
        left: { id: 'p1', apiKey: 'raw-key-before' },
        right: { id: 'p1', apiKey: 'raw-key-after' }
      }
    ]);
    expect(rows[0].left.id).toBe('p1');
    expect(rows[0].left.apiKey).toMatch(/^\[マスク済み: SHA256-[0-9A-F]{16}\]$/);
    expect(rows[0].right.apiKey).toMatch(/^\[マスク済み: SHA256-[0-9A-F]{16}\]$/);
    expect(rows[0].left.apiKey).not.toBe(rows[0].right.apiKey);
  });
});
