import { describe, expect, it, vi } from 'vitest';

import {
  clearPasswordResetToken,
  protectPasswordResetToken,
  readPasswordResetToken
} from '../password-reset-token';

describe('Password reset token', () => {
  it('should move the token from the URL fragment to the current history entry', () => {
    const token = 'A'.repeat(100);
    let state: unknown = { navigation: true };
    const replaceState = vi.fn((nextState: unknown) => {
      state = nextState;
    });
    const history = {
      get state() {
        return state;
      },
      replaceState
    };

    protectPasswordResetToken(
      {
        pathname: '/mot-de-passe/nouveau',
        search: '?source=email',
        hash: `#${token}`
      },
      history
    );

    expect(replaceState).toHaveBeenCalledWith(
      expect.objectContaining({ navigation: true }),
      '',
      '/mot-de-passe/nouveau?source=email'
    );
    expect(readPasswordResetToken('/mot-de-passe/nouveau', '', history)).toBe(
      token
    );
  });

  it('should retain the token on reload of the current history entry', () => {
    const token = 'B'.repeat(100);
    let state: unknown = null;
    const history = {
      get state() {
        return state;
      },
      replaceState: vi.fn((nextState: unknown) => {
        state = nextState;
      })
    };

    protectPasswordResetToken(
      {
        pathname: '/mot-de-passe/nouveau',
        search: '',
        hash: `#${token}`
      },
      history
    );

    expect(readPasswordResetToken('/mot-de-passe/nouveau', '', history)).toBe(
      token
    );
    expect(readPasswordResetToken('/mot-de-passe/nouveau', '', history)).toBe(
      token
    );
  });

  it('should keep a one-shot fallback and report an unprotected URL when history is unavailable', () => {
    const token = 'C'.repeat(100);
    const history = {
      get state(): unknown {
        throw new DOMException('History unavailable', 'SecurityError');
      },
      replaceState: vi.fn()
    };

    const protectedUrl = protectPasswordResetToken(
      {
        pathname: '/mot-de-passe/nouveau',
        search: '',
        hash: `#${token}`
      },
      history
    );

    expect(protectedUrl).toBe(false);
    expect(readPasswordResetToken('/mot-de-passe/nouveau', '', history)).toBe(
      token
    );
  });

  it('should not reuse a token when the reset route is opened in a new history entry', () => {
    const token = 'D'.repeat(100);
    const originalState = window.history.state;
    const originalUrl = window.location.href;

    try {
      window.history.replaceState(
        { entry: 'reset' },
        '',
        `/mot-de-passe/nouveau#${token}`
      );
      protectPasswordResetToken();

      expect(
        readPasswordResetToken(window.location.pathname, window.location.hash)
      ).toBe(token);

      window.history.pushState({ entry: 'elsewhere' }, '', '/connexion');
      window.history.pushState(
        { entry: 'new-reset' },
        '',
        '/mot-de-passe/nouveau'
      );

      expect(
        readPasswordResetToken(window.location.pathname, window.location.hash)
      ).toBe('');
    } finally {
      clearPasswordResetToken();
      window.history.replaceState(originalState, '', originalUrl);
    }
  });
});
