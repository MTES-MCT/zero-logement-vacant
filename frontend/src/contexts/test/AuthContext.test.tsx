import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  genEstablishmentDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { useContext, useState } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthProvider } from '~/contexts/AuthContext';
import { authClient } from '~/lib/auth-client';
import data from '~/mocks/handlers/data';
import { useFindUsersQuery } from '~/services/user.service';
import sentry from '~/utils/sentry';
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

vi.mock('~/utils/sentry', () => ({
  default: {
    setUser: vi.fn()
  }
}));

function TestConsumer() {
  const auth = useContext(AuthContext);
  const [adminChallengeEmail, setAdminChallengeEmail] = useState('none');
  const [signInStatus, setSignInStatus] = useState('pending');
  const [verifyStatus, setVerifyStatus] = useState('pending');
  const [establishmentChangeStatus, setEstablishmentChangeStatus] =
    useState('pending');

  if (!auth) {
    return <span data-testid="no-context">no context</span>;
  }

  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-email">{auth.user?.email ?? 'none'}</span>
      <span data-testid="establishment">
        {auth.establishment?.name ?? 'none'}
      </span>
      <span data-testid="authorized-count">
        {auth.authorizedEstablishments.length}
      </span>
      <span data-testid="admin-challenge-email">{adminChallengeEmail}</span>
      <span data-testid="sign-in-status">{signInStatus}</span>
      <span data-testid="verify-status">{verifyStatus}</span>
      <span data-testid="establishment-change-status">
        {establishmentChangeStatus}
      </span>
      <button
        onClick={() =>
          void auth
            .changeEstablishment('establishment-2')
            .then(() => setEstablishmentChangeStatus('resolved'))
        }
      >
        change establishment
      </button>
      <button onClick={() => void auth.signOut()}>sign out</button>
      <button
        onClick={() =>
          void auth
            .signIn('agent@zlv.fr', 'not-a-real-password')
            .then(() => setSignInStatus('resolved'))
        }
      >
        sign in
      </button>
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
          void auth
            .verifyAdminTwoFactor(
              'admin@zlv.fr',
              '123456',
              'admin-establishment'
            )
            .then(() => setVerifyStatus('resolved'))
        }
      >
        admin verify 2fa
      </button>
    </div>
  );
}

function CachedUsersConsumer() {
  const { data: users } = useFindUsersQuery();

  return (
    <span data-testid="cached-user">
      {users ? (users[0]?.email ?? 'none') : 'loading'}
    </span>
  );
}

function setup(children = <TestConsumer />) {
  const store = configureTestStore();
  const renderProvider = () => (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );

  const view = render(renderProvider());
  return {
    ...view,
    rerender: () => view.rerender(renderProvider()),
    store
  };
}

describe('AuthProvider', () => {
  beforeEach(() => {
    useSessionMock.mockReset();
    vi.mocked(authClient.signIn.email).mockClear();
    vi.mocked(authClient.signOut).mockClear();
    vi.mocked(sentry.setUser).mockClear();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('synchronizes the hydrated user with Sentry and clears it on logout', () => {
    const establishment = genEstablishmentDTO();
    let session = {
      user: {
        ...genUserDTO(),
        id: 'user-a',
        email: 'user-a@zlv.fr'
      },
      session: { activeEstablishmentId: establishment.id },
      establishment
    };
    useSessionMock.mockImplementation(() => ({
      data: session,
      isPending: false,
      error: null,
      refetch: vi.fn()
    }));
    const view = setup();

    expect(sentry.setUser).toHaveBeenLastCalledWith({
      id: 'user-a',
      email: 'user-a@zlv.fr',
      role: session.user.role
    });

    session = null as unknown as typeof session;
    view.rerender();

    expect(sentry.setUser).toHaveBeenLastCalledWith(null);
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

  it('invalidates a session without an establishment', async () => {
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

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user-email')).toHaveTextContent('agent@zlv.fr');
    // No backend hydration yet: establishment stays null even when a session is present.
    expect(screen.getByTestId('establishment')).toHaveTextContent('none');
    expect(screen.getByTestId('authorized-count')).toHaveTextContent('0');
    await waitFor(() => expect(authClient.signOut).toHaveBeenCalledOnce());
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

  it('does not expose cached API data after the authenticated identity changes', async () => {
    const establishment = genEstablishmentDTO();
    let session = {
      user: { id: 'user-a', email: 'user-a@zlv.fr' },
      session: { activeEstablishmentId: establishment.id },
      establishment
    };
    useSessionMock.mockImplementation(() => ({
      data: session,
      isPending: false,
      error: null,
      refetch: vi.fn()
    }));
    data.users.push({
      ...genUserDTO(),
      email: 'cached-for-user-a@zlv.fr'
    });
    const view = setup(<CachedUsersConsumer />);

    await screen.findByText('cached-for-user-a@zlv.fr');
    data.users.splice(0, data.users.length, {
      ...genUserDTO(),
      email: 'fresh-for-user-b@zlv.fr'
    });
    session = {
      user: { id: 'user-b', email: 'user-b@zlv.fr' },
      session: { activeEstablishmentId: establishment.id },
      establishment
    };
    view.rerender();

    await screen.findByText('fresh-for-user-b@zlv.fr');
    expect(
      screen.queryByText('cached-for-user-a@zlv.fr')
    ).not.toBeInTheDocument();
  });

  it('does not expose cached API data after the active establishment changes', async () => {
    const establishmentA = genEstablishmentDTO();
    const establishmentB = genEstablishmentDTO();
    let session = {
      user: { id: 'user-a', email: 'user-a@zlv.fr' },
      session: { activeEstablishmentId: establishmentA.id },
      establishment: establishmentA
    };
    useSessionMock.mockImplementation(() => ({
      data: session,
      isPending: false,
      error: null,
      refetch: vi.fn()
    }));
    data.users.push({
      ...genUserDTO(),
      email: 'cached-for-establishment-a@zlv.fr'
    });
    const view = setup(<CachedUsersConsumer />);

    await screen.findByText('cached-for-establishment-a@zlv.fr');
    data.users.splice(0, data.users.length, {
      ...genUserDTO(),
      email: 'fresh-for-establishment-b@zlv.fr'
    });
    session = {
      user: { id: 'user-a', email: 'user-a@zlv.fr' },
      session: { activeEstablishmentId: establishmentB.id },
      establishment: establishmentB
    };
    view.rerender();

    await screen.findByText('fresh-for-establishment-b@zlv.fr');
    expect(
      screen.queryByText('cached-for-establishment-a@zlv.fr')
    ).not.toBeInTheDocument();
  });

  it('does not expose cached API data after the authenticated identity disappears', async () => {
    const establishment = genEstablishmentDTO();
    const signedInSession = {
      user: { id: 'user-a', email: 'user-a@zlv.fr' },
      session: { activeEstablishmentId: establishment.id },
      establishment
    };
    let session: typeof signedInSession | null = signedInSession;
    useSessionMock.mockImplementation(() => ({
      data: session,
      isPending: false,
      error: null,
      refetch: vi.fn()
    }));
    data.users.push({
      ...genUserDTO(),
      email: 'cached-for-user-a@zlv.fr'
    });
    const view = setup(<CachedUsersConsumer />);

    await screen.findByText('cached-for-user-a@zlv.fr');
    data.users.length = 0;
    session = null;
    view.rerender();

    await screen.findByText('none');
    expect(
      screen.queryByText('cached-for-user-a@zlv.fr')
    ).not.toBeInTheDocument();
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

  it('resolves sign-in only after the authenticated session is hydrated', async () => {
    const user = userEvent.setup();
    let finishHydration: () => void = () => {};
    const refetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishHydration = resolve;
        })
    );
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch
    });
    setup();

    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());

    expect(screen.getByTestId('sign-in-status')).toHaveTextContent('pending');
    finishHydration();
    await waitFor(() =>
      expect(screen.getByTestId('sign-in-status')).toHaveTextContent('resolved')
    );
  });

  it('changes establishment through the cookie-backed endpoint and refetches the session', async () => {
    const establishment = genEstablishmentDTO();
    const refetch = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    useSessionMock.mockReturnValue({
      data: {
        user: { id: 'u1', email: 'agent@zlv.fr' },
        session: { activeEstablishmentId: establishment.id },
        establishment
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

  it('resolves an establishment change only after the session is hydrated', async () => {
    const establishment = genEstablishmentDTO();
    let finishHydration: () => void = () => {};
    const refetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishHydration = resolve;
        })
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    useSessionMock.mockReturnValue({
      data: {
        user: { id: 'u1', email: 'agent@zlv.fr' },
        session: { activeEstablishmentId: establishment.id },
        establishment
      },
      isPending: false,
      error: null,
      refetch
    });

    setup();
    fireEvent.click(screen.getByText('change establishment'));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());

    expect(screen.getByTestId('establishment-change-status')).toHaveTextContent(
      'pending'
    );
    finishHydration();
    await waitFor(() =>
      expect(
        screen.getByTestId('establishment-change-status')
      ).toHaveTextContent('resolved')
    );
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

  it('resolves admin sign-in without 2FA only after the session is hydrated', async () => {
    const user = userEvent.setup();
    let finishHydration: () => void = () => {};
    const refetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishHydration = resolve;
        })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          requiresTwoFactor: false,
          email: 'admin@zlv.fr'
        })
      })
    );
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch
    });
    setup();

    await user.click(screen.getByRole('button', { name: 'admin sign in' }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());

    expect(screen.getByTestId('admin-challenge-email')).toHaveTextContent(
      'none'
    );
    finishHydration();
    await waitFor(() =>
      expect(screen.getByTestId('admin-challenge-email')).toHaveTextContent(
        'admin@zlv.fr'
      )
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

  it('resolves admin 2FA verification only after the session is hydrated', async () => {
    const user = userEvent.setup();
    let finishHydration: () => void = () => {};
    const refetch = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishHydration = resolve;
        })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: true })
      })
    );
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch
    });
    setup();

    await user.click(screen.getByRole('button', { name: 'admin verify 2fa' }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());

    expect(screen.getByTestId('verify-status')).toHaveTextContent('pending');
    finishHydration();
    await waitFor(() =>
      expect(screen.getByTestId('verify-status')).toHaveTextContent('resolved')
    );
  });
});
