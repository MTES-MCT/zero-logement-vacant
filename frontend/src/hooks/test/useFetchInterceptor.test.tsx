import { act, render, screen, waitFor } from '@testing-library/react';
import type {
  FetchInterceptor,
  FetchInterceptorResponse
} from 'fetch-intercept';
import { type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '~/contexts/AuthContext';
import { useFetchInterceptor } from '~/hooks/useFetchInterceptor';
import { genAuthContextValue } from '~/test/auth';
import configureTestStore from '~/utils/storeUtils';

const fetchInterceptMock = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock('fetch-intercept', () => ({ default: fetchInterceptMock }));

function ProtectedRoute() {
  useFetchInterceptor();
  return <span>Protected route</span>;
}

function setup(signOut: AuthContextValue['signOut']): FetchInterceptor {
  const auth = {
    ...genAuthContextValue({ isAuthenticated: true }),
    signOut
  };
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={configureTestStore()}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/protected']}>{children}</MemoryRouter>
      </AuthContext.Provider>
    </Provider>
  );
  render(
    <Routes>
      <Route path="/protected" element={<ProtectedRoute />} />
      <Route path="/connexion" element={<span>Login route</span>} />
    </Routes>,
    { wrapper }
  );
  return fetchInterceptMock.register.mock.calls[0][0] as FetchInterceptor;
}

describe('useFetchInterceptor', () => {
  beforeEach(() => {
    fetchInterceptMock.register.mockReset();
  });

  it('clears the cookie-backed session before redirecting on a 401 response', async () => {
    let finishSignOut: () => void = () => undefined;
    const signOut = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSignOut = resolve;
        })
    );
    const interceptor = setup(signOut);
    const unauthorizedResponse = new Response(null, {
      status: 401
    }) as FetchInterceptorResponse;

    const response = Promise.resolve(
      interceptor.response?.(unauthorizedResponse)
    );

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(screen.getByText('Protected route')).toBeInTheDocument();

    await act(async () => finishSignOut());
    await response;

    expect(screen.getByText('Login route')).toBeInTheDocument();
  });

  it('clears the session only once for concurrent 401 responses', () => {
    const signOut = vi.fn(() => new Promise<void>(() => undefined));
    const interceptor = setup(signOut);
    const unauthorizedResponse = new Response(null, {
      status: 401
    }) as FetchInterceptorResponse;

    interceptor.response?.(unauthorizedResponse);
    interceptor.response?.(unauthorizedResponse);

    expect(signOut).toHaveBeenCalledOnce();
  });
});
