import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthProvider } from '~/contexts/AuthContext';
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
      <button onClick={() => void auth.changeEstablishment('establishment-2')}>
        change establishment
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
    vi.unstubAllGlobals();
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
});
