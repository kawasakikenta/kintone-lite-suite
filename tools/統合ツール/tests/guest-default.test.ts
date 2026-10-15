import { describe, expect, it } from 'vitest';
import { guestIdFromKintonePath } from '../src/constants';

describe('guestIdFromKintonePath', () => {
  it('reads the guest space ID of the page so the current app is not looked up in the normal space', () => {
    expect(guestIdFromKintonePath('/k/guest/12/34/')).toBe('12');
    expect(guestIdFromKintonePath('/k/guest/12/34/show')).toBe('12');
  });

  it('returns an empty ID outside guest spaces', () => {
    expect(guestIdFromKintonePath('/k/34/')).toBe('');
    expect(guestIdFromKintonePath('/k/#/space/5')).toBe('');
    expect(guestIdFromKintonePath('/k/guest/abc/34/')).toBe('');
    expect(guestIdFromKintonePath(undefined)).toBe('');
  });
});
