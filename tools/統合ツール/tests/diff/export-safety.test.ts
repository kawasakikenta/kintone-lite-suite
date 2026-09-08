import { describe, expect, it } from 'vitest';

import { contentIdentifier, sha256Hex } from '../../src/diff/export-safety.js';

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
});
