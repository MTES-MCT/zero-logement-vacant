import { describe, expect, it, vi } from 'vitest';

import {
  PASSWORD_RESET_TOKEN_STORAGE_KEY,
  protectPasswordResetToken,
  readPasswordResetToken
} from '../password-reset-token';

describe('Password reset token', () => {
  it('should move the token from the URL fragment to session storage', () => {
    const token = 'A'.repeat(100);
    const setItem = vi.fn();
    const replaceState = vi.fn();

    protectPasswordResetToken(
      {
        pathname: '/mot-de-passe/nouveau',
        search: '?source=email',
        hash: `#${token}`
      },
      { state: { navigation: true }, replaceState },
      () => ({ setItem })
    );

    expect(setItem).toHaveBeenCalledWith(
      PASSWORD_RESET_TOKEN_STORAGE_KEY,
      token
    );
    expect(replaceState).toHaveBeenCalledWith(
      { navigation: true },
      '',
      '/mot-de-passe/nouveau?source=email'
    );
  });

  it('should read the protected token when the URL fragment has been cleared', () => {
    const token = 'B'.repeat(100);

    expect(
      readPasswordResetToken('/mot-de-passe/nouveau', '', () => ({
        getItem: () => token
      }))
    ).toBe(token);
  });

  it('should keep the token in memory when session storage is unavailable', () => {
    const token = 'C'.repeat(100);

    expect(() =>
      protectPasswordResetToken(
        {
          pathname: '/mot-de-passe/nouveau',
          search: '',
          hash: `#${token}`
        },
        { state: null, replaceState: vi.fn() },
        () => {
          throw new DOMException('Storage unavailable', 'SecurityError');
        }
      )
    ).not.toThrow();
    expect(
      readPasswordResetToken('/mot-de-passe/nouveau', '', () => {
        throw new DOMException('Storage unavailable', 'SecurityError');
      })
    ).toBe(token);
  });
});
