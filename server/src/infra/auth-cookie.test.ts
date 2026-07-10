import { describe, expect, it } from 'vitest';

import { getAuthCookieAttributes } from './auth-cookie';

describe('getAuthCookieAttributes', () => {
  it('uses strict same-site cookies outside review apps', () => {
    expect(getAuthCookieAttributes(false)).toEqual({
      sameSite: 'strict'
    });
  });

  it('uses secure cross-site cookies in review apps', () => {
    expect(getAuthCookieAttributes(true)).toEqual({
      sameSite: 'none',
      secure: true,
      partitioned: true
    });
  });
});
