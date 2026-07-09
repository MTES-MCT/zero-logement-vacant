import { beforeEach, describe, expect, it } from 'vitest';

import { prepareAuthHeaders } from '../api.service';

describe('prepareAuthHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('never sends the legacy JWT from localStorage', () => {
    localStorage.setItem(
      'authUser',
      JSON.stringify({ accessToken: 'legacy-jwt' })
    );

    const headers = prepareAuthHeaders(
      new Headers({ Accept: 'application/json' })
    );

    expect(headers.get('x-access-token')).toBeNull();
    expect(headers.get('accept')).toBe('application/json');
  });

  it('keeps existing non-auth headers unchanged', () => {
    const headers = prepareAuthHeaders(new Headers());

    expect(headers.get('x-access-token')).toBeNull();
  });
});
