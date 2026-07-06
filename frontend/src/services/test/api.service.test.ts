import { beforeEach, describe, expect, it } from 'vitest';

import { prepareAuthHeaders, setAuthV2Active } from '../api.service';

describe('prepareAuthHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthV2Active(false);
  });

  it('keeps the legacy JWT header while auth-v2 is inactive', () => {
    localStorage.setItem(
      'authUser',
      JSON.stringify({ accessToken: 'legacy-jwt' })
    );

    const headers = prepareAuthHeaders(
      new Headers({ Accept: 'application/json' })
    );

    expect(headers.get('x-access-token')).toBe('legacy-jwt');
    expect(headers.get('accept')).toBe('application/json');
  });

  it('does not send a stale legacy JWT header while auth-v2 is active', () => {
    localStorage.setItem(
      'authUser',
      JSON.stringify({ accessToken: 'legacy-jwt' })
    );
    setAuthV2Active(true);

    const headers = prepareAuthHeaders(new Headers());

    expect(headers.get('x-access-token')).toBeNull();
  });
});
