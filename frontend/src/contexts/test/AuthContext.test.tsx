import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useContext, useState } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthProvider } from '~/contexts/AuthContext';
import { authClient } from '~/lib/auth-client';
import configureTestStore from '~/utils/storeUtils';

// Mock the auth-client module: better-auth's session atom is module-level
// nanostores state that does not reset between tests, so MSW interception
// alone cannot drive different session shapes per test. The mock lets each
// test inject the exact `useSession` payload it needs to assert on.
const useSessionMock = vi.fn();

vi.mock('~/lib/auth-client', () => ({
  authClient: {
    useSession: () => useSessionMock(),
    signIn: {
      email: vi.fn().mockResolvedValue({ data: null, error: null })
    },
    signOut: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn().mockResolvedValue(null)
  }
}));

function TestConsumer() {
  const auth = useContext(AuthContext);
  const [adminChallengeEmail, setAdminChallengeEmail] = useState('none');

  if (!auth) {
    return <span data-testid="no-context">no context</span>;
  }

  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="user-email">{auth.user?.email ?? 'none'}</span>
      <span data-testid="establishment">
        {auth.establishment?.name ?? 'none'}
      </span>
      <span data-testid="authorized-count">
        {auth.authorizedEstablishments.length}
      </span>
      <span data-testid="admin-challenge-email">{adminChallengeEmail}</span>
      <button onClick={() => void auth.changeEstablishment('establishment-2')}>
        change establishment
      </button>
      <button onClick={() => void auth.signOut()}>sign out</button>
      <button
        onClick={() =>
          void auth
            .signInAdmin(
              'admin@zlv.fr',
              'not-a-real-password',
              'admin-establishment'
            )
            .then((challenge) => setAdminChallengeEmail(challenge.email))
        }
      >
        admin sign in
      </button>
      <button
        onClick={() =>
          void auth.verifyAdminTwoFactor(
            'admin@zlv.fr',
            '123456',
            'admin-establishment'
          )
        }
      >
        admin verify 2fa
      </button>
    </div>
  );
}

function setup() {
  render(
    <Provider store={configureTestStore()}>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </Provider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    useSessionMock.mockReset();
    vi.mocked(authClient.signOut).mockClear();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('exposes a null user when the session is absent', () => {
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn()
    });

    setup();

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    expect(screen.getByTestId('establishment')).toHaveTextContent('none');
    expect(screen.getByTestId('authorized-count')).toHaveTextContent('0');
  });

  it('exposes the user when the session is present', () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { id: 'u1', email: 'agent@zlv.fr' },
        session: { activeEstablishmentId: null }
      },
      isPending: false,
      error: null,
      refetch: vi.fn()
    });

    setup();

    expect(screen.getByTestId('user-email')).toHaveTextContent('agent@zlv.fr');
    // No backend hydration yet: establishment stays null even when a session is present.
    expect(screen.getByTestId('establishment')).toHaveTextContent('none');
    expect(screen.getByTestId('authorized-count')).toHaveTextContent('0');
  });

  it('reports the loading state from the auth client', () => {
    useSessionMock.mockReturnValue({
      data: null,
      isPending: true,
      error: null,
      refetch: vi.fn()
    });

    setup();

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('clears a stale legacy session when signing out', async () => {
    localStorage.setItem(
      'authUser',
      JSON.stringify({ accessToken: 'stale-legacy-jwt' })
    );
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn()
    });

    setup();
    fireEvent.click(screen.getByText('sign out'));

    await waitFor(() => {
      expect(authClient.signOut).toHaveBeenCalledOnce();
      expect(localStorage.getItem('authUser')).toBeNull();
    });
  });

  it('changes establishment through the cookie-backed endpoint and refetches the session', async () => {
    const refetch = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    useSessionMock.mockReturnValue({
      data: {
        user: { id: 'u1', email: 'agent@zlv.fr' },
        session: { activeEstablishmentId: 'establishment-1' }
      },
      isPending: false,
      error: null,
      refetch
    });

    setup();
    fireEvent.click(screen.getByText('change establishment'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/account/establishments/establishment-2'),
        { method: 'POST', credentials: 'include' }
      );
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('starts admin sign-in through the better-auth 2FA endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        requiresTwoFactor: true,
        email: 'admin@zlv.fr'
      })
    });
    vi.stubGlobal('fetch', fetchMock);
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn()
    });

    setup();
    fireEvent.click(screen.getByText('admin sign in'));

    await expect(
      screen.findByTestId('admin-challenge-email')
    ).resolves.toHaveTextContent('admin@zlv.fr');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/admin/sign-in'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@zlv.fr',
          password: 'not-a-real-password',
          establishmentId: 'admin-establishment'
        })
      })
    );
  });

  it('verifies admin 2FA through better-auth and refetches the session', async () => {
    const refetch = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true })
    });
    vi.stubGlobal('fetch', fetchMock);
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch
    });

    setup();
    fireEvent.click(screen.getByText('admin verify 2fa'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/admin/verify-2fa'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            email: 'admin@zlv.fr',
            code: '123456',
            establishmentId: 'admin-establishment'
          })
        })
      );
    });
    expect(refetch).toHaveBeenCalled();
  });
});
