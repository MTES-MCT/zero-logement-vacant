import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '~/contexts/AuthContext';
import { useAuth } from '~/hooks/useAuth';

function Consumer() {
  const auth = useAuth();
  return <span data-testid="email">{auth.user?.email ?? 'none'}</span>;
}

const fakeContext: AuthContextValue = {
  user: { email: 'agent@zlv.fr' } as never,
  establishment: null,
  authorizedEstablishments: [],
  effectiveGeoCodes: undefined,
  isAuthenticated: true,
  isLoading: false,
  signIn: vi.fn(),
  signInAdmin: vi.fn(),
  verifyAdminTwoFactor: vi.fn(),
  signOut: vi.fn(),
  changeEstablishment: vi.fn(),
  refetch: vi.fn().mockResolvedValue(undefined)
};

describe('useAuth', () => {
  it('returns the context value when wrapped in AuthProvider', () => {
    render(
      <AuthContext.Provider value={fakeContext}>
        <Consumer />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('email').textContent).toBe('agent@zlv.fr');
  });

  it('throws when used outside AuthProvider', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => render(<Consumer />)).toThrow(
      'useAuth must be used within AuthProvider'
    );

    consoleError.mockRestore();
  });
});
